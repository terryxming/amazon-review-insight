import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import {
  AnalysisReport,
  REQUIRED_KEY_INSIGHT_DIMENSIONS
} from "./core.js";

export interface ContractCheckResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function checkAnalysis(analysis: AnalysisReport): ContractCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sampleSize = analysis.metadata.review_sample_size;

  if (!analysis.normalized_reviews?.length) errors.push("分析结果缺少 normalized_reviews，无法交付 Review 编码层 Excel。");
  if (!analysis.feedback_units?.length) errors.push("分析结果缺少 feedback_units，无法交付 Review 编码层 Excel。");
  if (!analysis.open_tags?.length) errors.push("分析结果缺少 open_tags，无法交付 Review 编码层 Excel。");
  if (analysis.normalized_reviews?.length && analysis.normalized_reviews.length !== sampleSize) {
    errors.push(`normalized_reviews 必须覆盖全部 Review 样本：期望 ${sampleSize} 条，实际 ${analysis.normalized_reviews.length} 条。`);
  }

  const normalizedReviewIndexes = new Set((analysis.normalized_reviews ?? []).map((review, index) => reviewIndex(review.raw, index)));
  const feedbackReviewIndexes = new Set((analysis.feedback_units ?? []).map((unit) => unit.review_index));
  for (const index of normalizedReviewIndexes) {
    if (!feedbackReviewIndexes.has(index)) errors.push(`Review #${index} 缺少 feedback_units 编码记录。`);
  }

  for (const unit of analysis.feedback_units ?? []) {
    if (!unit.feedback_unit_id) errors.push("feedback_unit 缺少 feedback_unit_id");
    if (!unit.evidence) errors.push(`feedback_unit ${unit.feedback_unit_id || "unknown"} 缺少 evidence`);
    if (!Array.isArray(unit.open_tags)) errors.push(`feedback_unit ${unit.feedback_unit_id || "unknown"} open_tags 不是数组`);
    if (analysis.normalized_reviews?.length && !normalizedReviewIndexes.has(unit.review_index)) {
      errors.push(`feedback_unit ${unit.feedback_unit_id || "unknown"} 绑定了不存在的 review_index：${unit.review_index}`);
    }
  }

  for (const tag of analysis.open_tags ?? []) {
    if (!tag.tag_id) errors.push("open_tag 缺少 tag_id");
    if (!tag.tag_name) errors.push(`open_tag ${tag.tag_id || "unknown"} 缺少 tag_name`);
    checkPercentage(`open_tag ${tag.tag_id || tag.tag_name || "unknown"}`, tag.count, tag.sample_size, tag.percentage, errors);
  }

  for (const dim of REQUIRED_KEY_INSIGHT_DIMENSIONS) {
    const item = analysis.key_insights.find((insight) => insight.dimension === dim);
    if (!item) {
      errors.push(`关键结论缺少维度：${dim}`);
      continue;
    }
    if (!item.insight) errors.push(`关键结论 ${dim} 缺少 insight`);
    if (!Array.isArray(item.evidence)) errors.push(`关键结论 ${dim} evidence 不是数组`);
    if (item.insight !== "unknown" && item.evidence.length === 0) errors.push(`关键结论 ${dim} 缺少 evidence`);
    checkPercentage(`关键结论 ${dim}`, item.count, item.sample_size, item.percentage, errors);
    checkKeyInsightDistribution(item, errors);
  }

  for (const theme of analysis.voc_themes) {
    if (!theme.theme_id) errors.push("VOC 主题缺少 theme_id");
    if (!theme.theme_name) errors.push(`VOC 主题 ${theme.theme_id} 缺少 theme_name`);
    if (!theme.theme_evidence?.length) errors.push(`VOC 主题 ${theme.theme_id} 缺少 theme_evidence`);
    if (!theme.detail_reviews?.length) errors.push(`VOC 主题 ${theme.theme_id} 缺少详情页证据列表`);
    if (!theme.root_cause_hypothesis) errors.push(`VOC 主题 ${theme.theme_id} 缺少 root_cause_hypothesis。`);
    checkPercentage(`VOC 主题 ${theme.theme_id}`, theme.count, theme.sample_size, theme.percentage, errors);
    for (const review of theme.detail_reviews ?? []) {
      checkDetailReview(`主题 ${theme.theme_id}`, review, errors);
    }
    checkThemeViewpoints(theme, errors);
  }

  for (const action of analysis.business_actions) {
    if (!analysis.voc_themes.some((theme) => theme.theme_id === action.theme_id)) {
      errors.push(`业务动作 ${action.action_id} 绑定了不存在的 theme_id：${action.theme_id}`);
    }
    if (!action.evidence?.length) errors.push(`业务动作 ${action.action_id} 缺少 evidence`);
  }

  if (sampleSize < 20) warnings.push("Review 样本数低于 20，应在报告限制说明中标注。");
  return { ok: errors.length === 0, errors, warnings };
}

export function checkHtml(html: string): ContractCheckResult {
  const errors: string[] = [];
  const requiredIds = ["scope", "health", "key-insights", "voc-theme-map", "actions", "limits"];
  for (const id of requiredIds) {
    if (!html.includes(`id="${id}"`)) errors.push(`HTML 缺少章节：${id}`);
  }
  if (!html.includes("evidence-highlight")) errors.push("HTML 缺少句子级证据高亮。");
  if (!html.includes("evidence-positive") || !html.includes("evidence-negative") || !html.includes("evidence-opportunity") || !html.includes("evidence-context")) {
    errors.push("HTML 缺少证据高亮的语义颜色样式。");
  }
  if (/<mark>\s*<\/mark>/.test(html) || html.includes("<mark><mark") || html.includes("</mark></mark>")) {
    errors.push("HTML 证据高亮不得出现空 mark 或嵌套 mark。");
  }
  if (!html.includes("insight-distribution")) errors.push("HTML 关键结论缺少类型分布表。");
  if (!html.includes("viewpoint-distribution")) errors.push("HTML VOC 主题地图缺少观点分布表。");
  if (!html.includes('href="#scope">1. 数据范围与口径</a>') || !html.includes('href="#health">2. Review 健康度</a>')) {
    errors.push("HTML 左侧一级导航必须带序号。");
  }
  if (!html.includes("toc-key-insights") || !html.includes('href="#key-insight-audience">3.1 人群</a>') || !html.includes('class="toc-group" open')) {
    errors.push("HTML 左侧导航必须在关键结论下展示带序号、默认展开、可折叠的二级导航。");
  }
  if (!html.includes("toc-voc-themes") || !html.includes('href="#voc-theme-') || !html.includes('>4.1 ')) {
    errors.push("HTML 左侧导航必须在 VOC 主题地图下展示带序号、默认展开、可折叠的主题二级导航。");
  }
  if (html.includes('<h3 class="section-subtitle">八类横向洞察</h3>') || html.includes('<h3 class="section-subtitle">主题与观点分布</h3>')) {
    errors.push("关键结论和 VOC 主题地图的二级标题应位于左侧导航，不应渲染为正文副标题。");
  }
  if (html.includes("section-kicker")) errors.push("主报告一级章节标题下方不得渲染说明文字。");
  if (!html.includes("section-title-with-help") || !html.includes("help-badge") || !html.includes("❓")) {
    errors.push("关键结论和 VOC 主题地图标题必须带问号角标 tooltip。");
  }
  if (!html.includes("提及：") || !html.includes("置信度：") || !html.includes("主题类型：") || !html.includes("严重度：") || !html.includes("运营优先级：")) {
    errors.push("摘要 chip 必须使用中文标签解释统计元信息。");
  }
  if (!html.includes("运营动作：")) errors.push("VOC 主题必须展示面向运营的下一步动作。");
  if (!html.includes("优先级表示动作顺序") || !html.includes("P0 是立即处理")) {
    errors.push("VOC 主题地图 tooltip 必须解释运营优先级的含义，避免裸 P0/P1/P2。");
  }
  if (/<span class="badge">优先级：P[0-2]<\/span>/.test(html)) {
    errors.push("VOC 主题优先级不得裸展示 P0/P1/P2，必须展示运营动作语义。");
  }
  if (html.includes("@media (max-width")) errors.push("HTML 报告不应继续包含移动端媒体查询。");
  if (!html.includes("report-block insight-block") || !html.includes("report-block theme-card theme-card-clickable")) {
    errors.push("HTML 关键结论和 VOC 主题地图必须使用一行一个的默认展开折叠块。");
  }
  if (!html.includes("insight-card-clickable") || !html.includes("data-card-target=\"#insight-detail-")) {
    errors.push("HTML 关键结论卡片必须整体可点击并在新标签页打开关键结论详情。");
  }
  if (!html.includes("insight-detail") || !html.includes("data-insight-detail")) errors.push("HTML 缺少关键结论详情页。");
  if (!html.includes("insight-detail-mode") || !html.includes("data-insight-filter=\"all\"") || !html.includes("data-insight-review")) {
    errors.push("HTML 关键结论详情页必须具备独立路由、类型筛选和详情评论。");
  }
  if (html.includes("insight-grid")) errors.push("HTML 关键结论不得继续使用一行多块的 insight-grid 布局。");
  if (html.includes("<th>角色</th>") || html.includes("data-viewpoint-role")) errors.push("HTML 主报告和观点筛选不得展示角色列或角色 badge。");
  if (!html.includes("theme-group-list") || !html.includes("正向主题") || !html.includes("负向主题") || !html.includes("未满足的机会点")) {
    errors.push("HTML VOC 主题地图必须按正向、负向、未满足的机会点三组展示。");
  }
  if (!html.includes("theme-group-block") || !html.includes("主题数：")) {
    errors.push("HTML VOC 主题地图三组必须以可折叠分组块展示并显示主题数。");
  }
  if (!html.includes("representative-review-list") || !html.includes("representative-review-original") || !html.includes("representative-review-translation")) {
    errors.push("HTML 主报告关键结论和 VOC 主题必须展示完整代表性 Review 原文和中文译文。");
  }
  if (html.includes("highlight_terms") || html.includes("translation_highlight_terms") || html.includes("原文高亮词") || html.includes("译文高亮词")) {
    errors.push("HTML 不得继续保留关键词高亮字段或旧表头。");
  }
  if (html.includes("evidence-pair-original") || html.includes("evidence-pair-translation")) {
    errors.push("HTML 不应继续使用短 evidence 作为主报告代表性原文。");
  }
  if (!html.includes("完整原文") || !html.includes("完整中文译文")) {
    errors.push("HTML 主报告代表性 Review 必须明确标注完整原文和完整中文译文。");
  }
  if (!html.includes("action-group-list") || !html.includes("report-block action-group") || !html.includes("action-card-list")) {
    errors.push("HTML 机会矩阵与业务动作必须按方向拆分为折叠块和动作卡片。");
  }
  if (!html.includes("theme-detail") || !html.includes("data-theme-detail")) errors.push("HTML 缺少 VOC 主题详情页。");
  if (html.includes("voc-viewpoint-detail-")) errors.push("HTML 仍包含旧版独立观点详情页 anchor；观点应在主题详情页内筛选。");
  if (!html.includes('data-open-mode="new-tab"')) errors.push("HTML VOC 主题卡片必须标记为新标签页打开。");
  if (!html.includes('target="_blank"')) errors.push("HTML VOC 主题卡片链接必须使用 target=\"_blank\"。");
  if (!html.includes('rel="noopener"')) errors.push("HTML VOC 主题卡片链接必须使用 rel=\"noopener\"。");
  if (!html.includes("theme-card-clickable") || !html.includes("data-card-target=\"#theme-detail-")) errors.push("HTML VOC 主题卡片必须整体可点击并在新标签页打开主题详情。");
  if (!html.includes("sticky-theme-card")) errors.push("HTML 缺少主题详情页 sticky VOC 主题卡片。");
  if (!html.includes('class="card sticky-theme-card theme-filter-panel"')) {
    errors.push("HTML 主题详情页必须将 sticky VOC 主题卡片与观点筛选入口合并为同一个卡片。");
  }
  if (!html.includes("归因假设：")) errors.push("HTML 主题详情页 sticky 主题区必须展示归因假设。");
  if (html.includes('class="theme-context-line subtle"')) errors.push("HTML 主题详情页核心问题、归因假设、业务含义必须使用一致正文颜色，不得将某一行降级为 subtle。");
  if (!html.includes("detail-route-mode") || !html.includes("theme-detail-mode") || !html.includes("theme-detail-active")) {
    errors.push("HTML 主题详情页必须具备独立路由模式，避免新标签页仍可滚动看到其他章节或其他主题。");
  }
  if (!html.includes(".theme-detail, .insight-detail { display: none;") || !html.includes(".detail-route-mode .main > section")) {
    errors.push("HTML 主题/关键结论详情页必须默认隐藏详情 section，并在详情模式下隐藏非当前章节。");
  }
  if (!html.includes("theme-filter-controls") || !html.includes('data-theme-filter="all"')) errors.push("HTML 主题详情页缺少观点筛选控件和全部主题评论入口。");
  if (!html.includes("data-theme-review") || !html.includes("data-viewpoints=")) errors.push("HTML 主题详情页评论缺少观点筛选数据。");
  if (html.includes('class="section-title">主题详情：')) errors.push("HTML 主题详情页不应在 sticky 主题卡片下方重复渲染主题详情标题。");
  if (html.includes("SORFTIME_MCP_KEY")) errors.push("HTML 泄露 SORFTIME_MCP_KEY 字符串。");
  return { ok: errors.length === 0, errors, warnings: [] };
}

function checkKeyInsightDistribution(item: AnalysisReport["key_insights"][number], errors: string[]): void {
  if (!item.distribution?.length) {
    errors.push(`关键结论 ${item.dimension} 缺少 distribution`);
    return;
  }
  const validRoles = new Set(["primary", "secondary", "emerging", "long_tail", "unknown"]);
  for (const row of item.distribution) {
    const label = `关键结论 ${item.dimension} / 分布 ${row.label || "unknown"}`;
    if (!row.label) errors.push(`${label} 缺少 label`);
    if (!validRoles.has(row.role)) errors.push(`${label} role 非法：${row.role}`);
    if (!row.reason) errors.push(`${label} 缺少 reason`);
    if (!Array.isArray(row.evidence)) errors.push(`${label} evidence 不是数组`);
    if (row.role !== "unknown" && row.label !== "unknown" && row.evidence.length === 0) {
      errors.push(`${label} 缺少 evidence`);
    }
    checkPercentage(label, row.review_count, row.sample_size, row.percentage, errors);
  }
}

function checkThemeViewpoints(theme: AnalysisReport["voc_themes"][number], errors: string[]): void {
  if (!theme.viewpoints?.length) {
    errors.push(`VOC 主题 ${theme.theme_id} 缺少 viewpoints`);
    return;
  }
  const validRoles = new Set(["primary", "secondary", "emerging", "long_tail", "risk_signal", "unknown"]);
  const validPolarities = new Set(["positive", "negative", "mixed", "neutral"]);
  for (const viewpoint of theme.viewpoints) {
    const label = `VOC 主题 ${theme.theme_id} / 观点 ${viewpoint.viewpoint_id || viewpoint.viewpoint_name || "unknown"}`;
    if (!viewpoint.viewpoint_id) errors.push(`${label} 缺少 viewpoint_id`);
    if (!viewpoint.viewpoint_name) errors.push(`${label} 缺少 viewpoint_name`);
    if (!validPolarities.has(viewpoint.viewpoint_polarity)) errors.push(`${label} viewpoint_polarity 非法：${viewpoint.viewpoint_polarity}`);
    if (!validRoles.has(viewpoint.role)) errors.push(`${label} role 非法：${viewpoint.role}`);
    if (!viewpoint.reason) errors.push(`${label} 缺少 reason`);
    if (!viewpoint.business_meaning) errors.push(`${label} 缺少 business_meaning`);
    if (!Array.isArray(viewpoint.tag_ids)) errors.push(`${label} tag_ids 不是数组`);
    if (!viewpoint.review_indexes?.length) errors.push(`${label} 缺少 review_indexes`);
    if (!viewpoint.evidence?.length && viewpoint.role !== "unknown") errors.push(`${label} 缺少 evidence`);
    checkPercentage(label, viewpoint.review_count, viewpoint.sample_size, viewpoint.percentage, errors);
    if (!viewpoint.detail_reviews?.length) {
      errors.push(`${label} 缺少 detail_reviews`);
    } else if (viewpoint.detail_reviews.length !== viewpoint.review_count) {
      errors.push(`${label} detail_reviews 行数应为 ${viewpoint.review_count}，实际为 ${viewpoint.detail_reviews.length}`);
    }
    const detailIndexes = new Set((viewpoint.detail_reviews ?? []).map((review) => review.review_index));
    for (const index of viewpoint.review_indexes ?? []) {
      if (!detailIndexes.has(index)) errors.push(`${label} review_indexes 包含未出现在 detail_reviews 的 Review #${index}`);
    }
    for (const review of viewpoint.detail_reviews ?? []) {
      checkDetailReview(label, review, errors);
    }
  }
}

function checkDetailReview(label: string, review: AnalysisReport["voc_themes"][number]["detail_reviews"][number], errors: string[]): void {
  if (!review.text) errors.push(`${label} 的详情 Review 缺少完整原文`);
  if (!review.translation) errors.push(`${label} 的详情 Review 缺少完整中文翻译`);
  if (/核心原文证据可概括为|用户主要反馈/.test(review.translation)) {
    errors.push(`${label} 的详情 Review 中文翻译疑似摘要模板，必须提供完整中文译文。`);
  }
  const legacyReview = review as unknown as { highlight_terms?: unknown; translation_highlight_terms?: unknown };
  if (legacyReview.highlight_terms !== undefined || legacyReview.translation_highlight_terms !== undefined) {
    errors.push(`${label} 不得继续保留 highlight_terms 或 translation_highlight_terms。`);
  }
  const validEvidenceTypes = new Set(["positive", "negative", "opportunity", "context"]);
  if (!review.evidence_sentences?.length) {
    errors.push(`${label} 缺少句子级 evidence_sentences。`);
    return;
  }
  for (const [index, sentence] of review.evidence_sentences.entries()) {
    const sentenceLabel = `${label} / 证据句 #${index + 1}`;
    if (!sentence.original) errors.push(`${sentenceLabel} 缺少 original。`);
    if (!sentence.translation) errors.push(`${sentenceLabel} 缺少 translation。`);
    if (!validEvidenceTypes.has(sentence.evidence_type)) errors.push(`${sentenceLabel} evidence_type 非法：${sentence.evidence_type}`);
    if (sentence.original && !review.text.toLowerCase().includes(sentence.original.toLowerCase())) {
      errors.push(`${sentenceLabel} 原文句无法在完整 Review text 中定位。`);
    }
    if (sentence.translation && !review.translation.includes(sentence.translation)) {
      errors.push(`${sentenceLabel} 译文句无法在完整中文译文中定位。`);
    }
  }
}

function checkPercentage(label: string, count: number, sampleSize: number, pct: number, errors: string[]): void {
  if (sampleSize <= 0) {
    errors.push(`${label} sample_size 必须大于 0`);
    return;
  }
  const expected = Math.round((count / sampleSize) * 1000) / 10;
  if (Math.abs(expected - pct) > 0.1) {
    errors.push(`${label} percentage 应为 ${expected}，实际为 ${pct}`);
  }
}

const REQUIRED_EXCEL_SHEETS: Record<string, string[]> = {
  元数据: ["字段", "值"],
  原始评论: ["ASIN", "评论日期", "星级", "title", "text", "评论序号"],
  Review编码层: ["ASIN", "评论日期", "星级", "title", "text", "原Review序号", "反馈点序号", "编码单元ID", "本行编码维度", "本行反馈极性", "本行反馈点", "本行开放标签", "开放标签ID", "关联主题ID", "证据原文", "置信度"],
  开放标签: ["标签ID", "标签名称", "维度", "提及评论数", "占比", "关联主题ID"],
  关键结论分布: ["维度", "类型", "提及评论数", "样本数", "占比", "角色", "判断依据", "证据原文", "关联主题ID"],
  VOC主题: ["主题ID", "主题名称", "主题类型", "优先级", "提及评论数", "占比", "核心问题"],
  VOC主题观点: ["主题ID", "主题名称", "观点ID", "观点名称", "观点极性", "提及评论数", "样本数", "占比", "角色", "判断依据", "业务含义", "开放标签ID", "关联Review序号", "代表证据", "置信度"],
  VOC观点评论明细: ["主题ID", "主题名称", "观点ID", "观点名称", "Review序号", "ASIN", "评论日期", "星级", "title", "text", "中文翻译", "原文证据句", "译文证据句", "证据类型"],
  业务动作: ["动作ID", "主题ID", "动作方向", "优先级", "优先级分数", "业务发现", "建议动作"],
  检查点: ["检查点ID", "检查点名称", "状态", "说明"]
};

export async function checkExcelFile(excelPath: string, analysis?: AnalysisReport): Promise<ContractCheckResult> {
  const errors: string[] = [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  for (const [sheetName, headers] of Object.entries(REQUIRED_EXCEL_SHEETS)) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      errors.push(`Excel 缺少 sheet：${sheetName}`);
      continue;
    }
    const actual = new Set((sheet.getRow(1).values as unknown[]).map((value) => String(value ?? "")));
    for (const header of headers) {
      if (!actual.has(header)) errors.push(`Excel sheet ${sheetName} 缺少列：${header}`);
    }
    for (const legacyHeader of ["原文高亮词", "译文高亮词"]) {
      if (actual.has(legacyHeader)) errors.push(`Excel sheet ${sheetName} 不得继续保留旧列：${legacyHeader}`);
    }
  }
  if (analysis) {
    checkExcelRowCount(workbook, "原始评论", analysis.metadata.review_sample_size, errors);
    checkExcelRowCount(workbook, "Review编码层", analysis.feedback_units?.length ?? 0, errors);
    checkExcelRowCount(workbook, "开放标签", analysis.open_tags?.length ?? 0, errors);
    checkExcelRowCount(workbook, "VOC主题观点", analysis.voc_themes.flatMap((theme) => theme.viewpoints ?? []).length, errors);
    checkExcelRowCount(workbook, "VOC观点评论明细", analysis.voc_themes.flatMap((theme) => (theme.viewpoints ?? []).flatMap((viewpoint) => viewpoint.detail_reviews)).length, errors);
  }
  return { ok: errors.length === 0, errors, warnings: [] };
}

export async function checkFiles(analysisPath: string, htmlPath: string, excelPath?: string): Promise<ContractCheckResult> {
  const analysis = JSON.parse(await readFile(analysisPath, "utf8")) as AnalysisReport;
  const html = await readFile(htmlPath, "utf8");
  const a = checkAnalysis(analysis);
  const h = checkHtml(html);
  const x = excelPath ? await checkExcelFile(excelPath, analysis) : { ok: true, errors: [], warnings: [] };
  return { ok: a.ok && h.ok && x.ok, errors: [...a.errors, ...h.errors, ...x.errors], warnings: [...a.warnings, ...h.warnings, ...x.warnings] };
}

function reviewIndex(raw: Record<string, unknown>, fallbackIndex: number): number {
  return typeof raw?.review_index === "number" ? raw.review_index : fallbackIndex + 1;
}

function checkExcelRowCount(workbook: ExcelJS.Workbook, sheetName: string, expectedRows: number, errors: string[]): void {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return;
  const actualRows = Math.max(0, sheet.rowCount - 1);
  if (actualRows !== expectedRows) errors.push(`Excel sheet ${sheetName} 行数应为 ${expectedRows}，实际为 ${actualRows}。`);
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const [, , analysisPath, htmlPath, excelPath] = process.argv;
  if (!analysisPath || !htmlPath) {
    console.error("Usage: agent_contract_check.ts <analysis.json> <report.html> [review-coding.xlsx]");
    process.exit(1);
  }
  const result = await checkFiles(analysisPath, htmlPath, excelPath);
  for (const warning of result.warnings) console.warn(`[warn] ${warning}`);
  for (const error of result.errors) console.error(`[fail] ${error}`);
  process.exit(result.ok ? 0 : 1);
}
