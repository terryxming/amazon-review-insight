import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AnalysisReport,
  REQUIRED_KEY_INSIGHT_DIMENSIONS,
  escapeHtml,
  highlightEvidenceSentences,
  computeReviewHealth,
  EvidenceSentence,
  EvidenceType,
  NormalizedReview
} from "./core.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");

type DetailReview = AnalysisReport["voc_themes"][number]["detail_reviews"][number];
type KeyInsightItem = AnalysisReport["key_insights"][number];
type KeyInsightDistribution = NonNullable<KeyInsightItem["distribution"]>[number];
type ThemeItem = AnalysisReport["voc_themes"][number];

interface InsightDetailReview extends DetailReview {
  typeIds: string[];
}

interface ThemeGroup {
  id: "positive" | "negative" | "unmet";
  label: string;
  description: string;
  themes: ThemeItem[];
}

interface EvidenceRenderContext {
  evidence: string[];
  evidenceType: EvidenceType;
  targets?: string[];
  target?: string;
}

export async function renderReportFile(inputPath: string, outputPath: string): Promise<void> {
  const analysis = JSON.parse(await readFile(inputPath, "utf8")) as AnalysisReport;
  const html = await renderReport(analysis);
  await writeFile(outputPath, html, "utf8");
}

export async function renderReport(analysis: AnalysisReport): Promise<string> {
  const css = await readFile(resolve(skillRoot, "assets/report/report.css"), "utf8");
  const health = analysis.health ?? computeReviewHealth([] as NormalizedReview[], analysis.metadata.asin_total_review_count);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(analysis.metadata.asin)} Review VOC 决策报告</title>
  <style>${css}</style>
</head>
<body>
  <div class="layout">
    ${renderToc(analysis)}
    <main class="main">
      ${renderScope(analysis)}
      ${renderHealth(analysis, health)}
      ${renderKeyInsights(analysis)}
      ${renderThemeMap(analysis)}
      ${renderInsightDetails(analysis)}
      ${renderThemeDetails(analysis)}
      ${renderActions(analysis)}
      ${renderLimits(analysis)}
    </main>
  </div>
  ${renderInteractionScript()}
</body>
</html>`;
}

function renderToc(analysis: AnalysisReport): string {
  const keyInsightLinks = REQUIRED_KEY_INSIGHT_DIMENSIONS
    .map((dimension, index) => `<a class="toc-sublink" href="#${keyInsightAnchor(dimension)}">3.${index + 1} ${escapeHtml(dimension)}</a>`)
    .join("");
  const themeLinks = groupThemes(analysis.voc_themes)
    .map((group, index) => `<a class="toc-sublink" href="#${themeGroupAnchor(group.id)}">4.${index + 1} ${escapeHtml(group.label)}</a>`)
    .join("");
  return `<nav class="toc" aria-label="报告目录">
      <div class="toc-title">Review VOC 报告</div>
      <a class="toc-link" href="#scope">1. 数据范围与口径</a>
      <a class="toc-link" href="#health">2. Review 健康度</a>
      <details class="toc-group" open>
        <summary class="toc-summary">
          <a class="toc-link toc-primary-link" href="#key-insights">3. 关键结论</a>
          <span class="toc-toggle" aria-hidden="true"></span>
        </summary>
        <div class="toc-sublist toc-key-insights" aria-label="关键结论二级导航">${keyInsightLinks}</div>
      </details>
      <details class="toc-group" open>
        <summary class="toc-summary">
          <a class="toc-link toc-primary-link" href="#voc-theme-map">4. VOC 主题地图</a>
          <span class="toc-toggle" aria-hidden="true"></span>
        </summary>
        <div class="toc-sublist toc-voc-themes" aria-label="VOC 主题地图二级导航">${themeLinks}</div>
      </details>
      <a class="toc-link" href="#actions">5. 机会矩阵与业务动作</a>
      <a class="toc-link" href="#limits">6. 限制与 Checkpoint</a>
    </nav>`;
}

function renderScope(analysis: AnalysisReport): string {
  const m = analysis.metadata;
  const missingFields = "reviewer name / verified purchase / helpful vote / review URL / Vine";
  return `<section id="scope" class="section">
    <h1 class="section-title">${escapeHtml(m.asin)} Review VOC 决策报告</h1>
    <div class="metric-grid scope-metrics">
      ${metricCard("站点", m.site)}
      ${metricCard("数据来源", m.data_source)}
      ${metricCard("Review 样本数", m.review_sample_size)}
      ${metricCard("ASIN 总评论数量", m.asin_total_review_count)}
      ${metricCard("抓取/生成时间", formatDateTime(m.generated_at))}
      ${metricCard("产品星级", m.product_rating ?? "unknown")}
      ${metricCard("分析口径", "Amazon US 单 ASIN")}
    </div>
    <div class="card scope-note">
      <strong>已知缺失字段：</strong>${escapeHtml(missingFields)} 均按 unknown 处理，不参与推断。
    </div>
  </section>`;
}

function renderHealth(analysis: AnalysisReport, health: NonNullable<AnalysisReport["health"]>): string {
  const maxStarCount = Math.max(...Object.values(health.star_distribution), 1);
  const starRows = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = health.star_distribution[String(star)] ?? 0;
      const pct = health.review_sample_size ? Math.round((count / health.review_sample_size) * 1000) / 10 : 0;
      const bar = Math.round((count / maxStarCount) * 1000) / 10;
      return `<div class="star-row">
        <div class="star-label">${star} 星</div>
        <div class="star-track"><span style="--bar:${bar}%"></span></div>
        <div class="star-value">${count}/${health.review_sample_size} (${pct}%)</div>
      </div>`;
    })
    .join("");
  return `<section id="health" class="section">
    <h2 class="section-title">Review 健康度</h2>
    <div class="metric-grid health-metrics">
      ${metricCard("样本平均星级", health.average_sample_rating)}
      ${metricCard("4-5 星占比", `${health.positive_count}/${health.review_sample_size} (${health.positive_percentage}%)`)}
      ${metricCard("1-3 星占比", `${health.negative_count}/${health.review_sample_size} (${health.negative_percentage}%)`)}
      ${metricCard("最新 Review 日期", health.latest_review_date)}
      ${metricCard("正文存在率", `${health.text_presence_percentage}%`)}
      ${metricCard("日期存在率", `${health.date_presence_percentage}%`)}
    </div>
    <div class="card health-distribution">
      <h3>星级分布</h3>
      <div class="star-list">${starRows}</div>
    </div>
  </section>`;
}

function renderKeyInsights(analysis: AnalysisReport): string {
  const byDimension = new Map(analysis.key_insights.map((item) => [item.dimension, item]));
  const blocks = REQUIRED_KEY_INSIGHT_DIMENSIONS.map((dimension) => {
    const item = byDimension.get(dimension);
    if (!item) {
      return `<details id="${keyInsightAnchor(dimension)}" class="report-block insight-block" open>
        <summary class="block-summary">
          <div class="summary-main">
            <h3>${escapeHtml(dimension)}</h3>
            <p>评论未明确表达，当前样本中记为 unknown。</p>
          </div>
          <div class="summary-badges"><span class="badge">状态：unknown</span></div>
        </summary>
      </details>`;
    }
    const summary = item.summary ?? item.insight;
    const implication = item.business_implication ?? item.implication;
    const detailTarget = `#insight-detail-${stableId(item.dimension)}`;
    const detailReviews = buildInsightDetailReviews(analysis, item);
    return `<details id="${keyInsightAnchor(item.dimension)}" class="report-block insight-block insight-card-clickable" open data-card-target="${escapeHtml(detailTarget)}" aria-label="打开关键结论详情：${escapeHtml(item.dimension)}">
      <summary class="block-summary">
        <div class="summary-main">
          <h3>${escapeHtml(item.dimension)}</h3>
          <p>${escapeHtml(summary)}</p>
        </div>
        <div class="summary-badges">
          <span class="badge">提及：${item.count}/${item.sample_size} (${item.percentage}%)</span>
          <span class="badge">置信度：${escapeHtml(confidenceLabel(item.confidence))}</span>
        </div>
      </summary>
      <div class="block-body">
        ${renderInsightDistribution(item)}
        <p>${escapeHtml(implication)}</p>
        ${renderRepresentativeReviews(detailReviews, keyInsightEvidenceContext(item))}
        <p class="subtle id-list">关联主题：${item.theme_ids.map(escapeHtml).join(", ") || "unknown"}</p>
        <p class="card-open-hint"><a data-open-mode="new-tab" href="${escapeHtml(detailTarget)}" target="_blank" rel="noopener">打开结论详情</a></p>
      </div>
    </details>`;
  }).join("");
  return `<section id="key-insights" class="section">
    ${sectionTitleWithHelp("关键结论", "关键结论回答八个横向问题：谁在用、什么场景、为什么买、期待什么、实际体验如何、满意和不满意在哪里。它是跨主题的用户画像和使用判断，不是具体问题清单。")}
    <div class="block-list insight-list">${blocks}</div>
  </section>`;
}

function renderInsightDistribution(item: AnalysisReport["key_insights"][number]): string {
  if (!item.distribution?.length) return "";
  const rows = item.distribution.map((row) => `<tr>
    <td>${escapeHtml(row.label)}</td>
    <td><span class="mini-bar" style="--bar:${Math.max(0, Math.min(100, row.percentage))}%"></span><span>${row.review_count}/${row.sample_size} (${row.percentage}%)</span></td>
    <td>${escapeHtml(row.reason)}</td>
  </tr>`).join("");
  return `<div class="insight-distribution table-wrap">
    <table>
      <thead><tr><th>类型</th><th>提及占比</th><th>判断依据</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderThemeMap(analysis: AnalysisReport): string {
  const groupBlocks = groupThemes(analysis.voc_themes).map((group) => {
    const cards = group.themes.map(renderThemeCard).join("");
    return `<details id="${themeGroupAnchor(group.id)}" class="report-block theme-group-block" open>
      <summary class="block-summary">
        <div class="summary-main">
          <h3>${escapeHtml(group.label)}</h3>
          <p>${escapeHtml(group.description)}</p>
        </div>
        <div class="summary-badges">
          <span class="badge">主题数：${group.themes.length}</span>
        </div>
      </summary>
      <div class="block-body theme-group-body">
        ${cards || `<p class="empty-state">当前样本暂无${escapeHtml(group.label)}。</p>`}
      </div>
    </details>`;
  }).join("");
  return `<section id="voc-theme-map" class="section">
    ${sectionTitleWithHelp("VOC 主题地图", "VOC 主题地图回答哪些跨评论问题或机会需要被业务处理。v0.3.1 起按正向、负向、未满足的机会点三组穷举全部主题：正向用于放大，负向用于止损，未满足机会点用于澄清预期或补齐体验。运营优先级表示动作顺序，不等于严重度：P0 是立即处理，P1 是本轮迭代处理，P2 是排期优化。")}
    <div class="block-list theme-group-list">${groupBlocks}</div>
  </section>`;
}

function renderThemeCard(theme: ThemeItem): string {
  const cardTarget = `#theme-detail-${theme.theme_id}`;
  const openLabel = "打开主题详情";
  return `<details id="${themeCardAnchor(theme.theme_id)}" class="report-block theme-card theme-card-clickable" open data-card-target="${escapeHtml(cardTarget)}" aria-label="${escapeHtml(openLabel)}：${escapeHtml(theme.theme_name)}">
      <summary class="block-summary">
        <div class="summary-main">
          <h3>${escapeHtml(theme.theme_name)}</h3>
          <p>${escapeHtml(theme.core_issue)}</p>
        </div>
        <div class="summary-badges">
          <span class="badge">主题类型：${escapeHtml(themeCategoryLabel(theme.theme_category))}</span>
          <span class="badge">提及：${theme.count}/${theme.sample_size} (${theme.percentage}%)</span>
          <span class="badge">严重度：${escapeHtml(severityLabel(theme.severity))}</span>
          <span class="badge">运营优先级：${escapeHtml(themePriorityLabel(theme))}</span>
        </div>
      </summary>
      <div class="block-body">
        <p class="theme-context-line"><strong>核心问题：</strong>${escapeHtml(theme.core_issue)}</p>
        <p class="theme-context-line"><strong>归因假设：</strong>${escapeHtml(theme.root_cause_hypothesis)}</p>
        <p class="theme-context-line"><strong>业务含义：</strong>${escapeHtml(theme.business_meaning)}</p>
        <p class="theme-context-line"><strong>运营动作：</strong>${escapeHtml(themeOperationalAction(theme))}</p>
        ${renderThemeViewpointDistribution(theme)}
        ${renderRepresentativeReviews(theme.detail_reviews, themeEvidenceContext(theme))}
        <p class="card-open-hint"><a data-open-mode="new-tab" href="${escapeHtml(cardTarget)}" target="_blank" rel="noopener">${escapeHtml(openLabel)}</a></p>
      </div>
    </details>`;
}

function renderThemeViewpointDistribution(theme: AnalysisReport["voc_themes"][number]): string {
  if (!theme.viewpoints?.length) return `<p class="subtle">该主题暂未生成观点分布。</p>`;
  const rows = theme.viewpoints.map((viewpoint) => {
    return `<tr>
    <td><strong>${escapeHtml(viewpoint.viewpoint_name)}</strong></td>
    <td><span class="mini-bar" style="--bar:${Math.max(0, Math.min(100, viewpoint.percentage))}%"></span><span>${viewpoint.review_count}/${viewpoint.sample_size} (${viewpoint.percentage}%)</span></td>
    <td><span class="polarity polarity-${escapeHtml(viewpoint.viewpoint_polarity)}">${escapeHtml(polarityLabel(viewpoint.viewpoint_polarity))}</span></td>
    <td>${escapeHtml(viewpoint.reason)}</td>
  </tr>`;
  }).join("");
  return `<div class="viewpoint-distribution table-wrap">
    <table>
      <thead><tr><th>观点</th><th>提及占比</th><th>极性</th><th>判断依据</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderThemeDetails(analysis: AnalysisReport): string {
  const sections = analysis.voc_themes.map((theme) => {
    const reviewViewpoints = new Map<number, string[]>();
    for (const viewpoint of theme.viewpoints ?? []) {
      for (const index of viewpoint.review_indexes) {
        reviewViewpoints.set(index, [...(reviewViewpoints.get(index) ?? []), viewpoint.viewpoint_id]);
      }
    }
    const reviews = theme.detail_reviews.map((review) => renderDetailReview(review, {
      attributes: `data-theme-review data-viewpoints="${escapeHtml((reviewViewpoints.get(review.review_index) ?? []).join(" "))}"`,
      evidenceContext: themeEvidenceContext(theme)
    })).join("");
    return `<section id="theme-detail-${escapeHtml(theme.theme_id)}" class="section theme-detail" data-theme-detail>
      ${renderThemeDetailHeader(theme)}
      ${reviews}
    </section>`;
  }).join("");
  return sections;
}

function renderInsightDetails(analysis: AnalysisReport): string {
  const sections = analysis.key_insights.map((item) => {
    const detailReviews = buildInsightDetailReviews(analysis, item);
    const reviews = detailReviews.map((review) => renderDetailReview(review, {
      attributes: `data-insight-review data-insight-types="${escapeHtml(review.typeIds.join(" "))}"`,
      evidenceContext: keyInsightEvidenceContext(item)
    })).join("");
    return `<section id="insight-detail-${stableId(item.dimension)}" class="section insight-detail" data-insight-detail>
      ${renderInsightDetailHeader(item, detailReviews.length)}
      ${reviews || `<div class="card detail-review"><p>当前分析数据未提供可追溯的完整 Review 译文。请重新生成分析以补齐该关键结论详情。</p></div>`}
    </section>`;
  }).join("");
  return sections;
}

function renderInsightDetailHeader(item: KeyInsightItem, reviewCount: number): string {
  const summary = item.summary ?? item.insight;
  const implication = item.business_implication ?? item.implication;
  return `<div class="card sticky-theme-card insight-filter-panel">
    <div class="theme-detail-context">
      <p class="detail-back-link"><a href="#key-insights">返回关键结论</a></p>
      <div class="subtle">所属关键结论</div>
      <h3>${escapeHtml(item.dimension)}</h3>
      <div class="theme-meta">
        <span class="badge">提及：${item.count}/${item.sample_size} (${item.percentage}%)</span>
        <span class="badge">置信度：${escapeHtml(confidenceLabel(item.confidence))}</span>
      </div>
      <p class="theme-context-line"><strong>核心结论：</strong>${escapeHtml(summary)}</p>
      <p class="theme-context-line"><strong>业务含义：</strong>${escapeHtml(implication)}</p>
    </div>
    <div class="theme-filter-area">
      <h2 class="section-title">类型筛选与评论</h2>
      <p class="subtle">默认展示支撑该关键结论的全部相关 Review。点击下方类型后，在当前标签页内筛选该类型相关的全量评论。</p>
      ${renderInsightFilterControls(item, reviewCount)}
      <div class="viewpoint-summary insight-filter-summary" data-insight-filter-summary>
        <div class="theme-meta">
          <span class="badge" data-insight-filter-count>${reviewCount} 条关键结论相关 Review</span>
          <span class="badge">当前筛选：全部结论评论</span>
        </div>
      </div>
    </div>
  </div>`;
}

function renderInsightFilterControls(item: KeyInsightItem, reviewCount: number): string {
  const buttons = (item.distribution ?? []).map((row, index) => {
    const typeId = insightTypeId(item.dimension, row, index);
    return `<button
      type="button"
      class="theme-filter-button"
      data-insight-filter="${escapeHtml(typeId)}"
      data-insight-type-name="${escapeHtml(row.label)}"
      data-insight-type-count="${row.review_count}/${row.sample_size} (${row.percentage}%)"
      data-insight-type-reason="${escapeHtml(row.reason)}">
      <span>${escapeHtml(row.label)}</span>
      <strong>${row.review_count}/${row.sample_size}</strong>
    </button>`;
  }).join("");
  return `<div class="theme-filter-controls insight-filter-controls" role="group" aria-label="关键结论类型筛选">
    <button type="button" class="theme-filter-button active" data-insight-filter="all">
      <span>全部结论评论</span>
      <strong>${reviewCount}/${item.sample_size}</strong>
    </button>
    ${buttons}
  </div>`;
}

function renderThemeFilterControls(theme: AnalysisReport["voc_themes"][number]): string {
  const viewpointButtons = (theme.viewpoints ?? []).map((viewpoint) => `<button
    type="button"
    class="theme-filter-button"
    data-theme-filter="${escapeHtml(viewpoint.viewpoint_id)}"
    data-viewpoint-name="${escapeHtml(viewpoint.viewpoint_name)}"
    data-viewpoint-count="${viewpoint.review_count}/${viewpoint.sample_size} (${viewpoint.percentage}%)"
    data-viewpoint-polarity="${escapeHtml(polarityLabel(viewpoint.viewpoint_polarity))}"
    data-viewpoint-reason="${escapeHtml(viewpoint.reason)}"
    data-viewpoint-business="${escapeHtml(viewpoint.business_meaning)}">
    <span>${escapeHtml(viewpoint.viewpoint_name)}</span>
    <strong>${viewpoint.review_count}/${viewpoint.sample_size}</strong>
  </button>`).join("");
  return `<div class="theme-filter-controls" role="group" aria-label="观点筛选">
    <button type="button" class="theme-filter-button active" data-theme-filter="all">
      <span>全部主题评论</span>
      <strong>${theme.detail_reviews.length}/${theme.sample_size}</strong>
    </button>
    ${viewpointButtons}
  </div>`;
}

function groupThemes(themes: ThemeItem[]): ThemeGroup[] {
  const groups: ThemeGroup[] = [
    {
      id: "positive",
      label: "正向主题",
      description: "用户已经认可、可以被运营放大的购买驱动、价值信任或人群适配主题。",
      themes: []
    },
    {
      id: "negative",
      label: "负向主题",
      description: "已经造成低星、故障、可靠性或强烈不满的主题，优先用于止损和闭环。",
      themes: []
    },
    {
      id: "unmet",
      label: "未满足的机会点",
      description: "用户有明确预期但体验、说明、配件、场景或边界还未被充分满足的可补齐机会。",
      themes: []
    }
  ];
  const byId = new Map(groups.map((group) => [group.id, group]));
  for (const theme of themes) {
    byId.get(themeGroupId(theme))?.themes.push(theme);
  }
  return groups;
}

function themeGroupId(theme: ThemeItem): ThemeGroup["id"] {
  if (isPositiveOpportunity(theme.theme_category) || isTrustOpportunity(theme.theme_category)) return "positive";
  if (theme.theme_category === "low_frequency_high_risk") return "negative";
  if (theme.theme_category === "product_pain_point" || theme.theme_category === "scenario_problem" || theme.theme_category === "expectation_gap") return "unmet";
  const polarities = new Set((theme.viewpoints ?? []).map((viewpoint) => viewpoint.viewpoint_polarity));
  if (polarities.has("negative") && theme.severity === "high") return "negative";
  if (polarities.has("positive") && !polarities.has("negative")) return "positive";
  return "unmet";
}

function themeGroupAnchor(groupId: ThemeGroup["id"]): string {
  return `voc-theme-group-${groupId}`;
}

function keyInsightEvidenceContext(item: KeyInsightItem): EvidenceRenderContext {
  return {
    evidence: unique([
      ...item.evidence,
      ...(item.distribution ?? []).flatMap((row) => row.evidence)
    ]),
    evidenceType: keyInsightEvidenceType(item.dimension),
    target: `key-insight-${stableId(item.dimension)}`,
    targets: [`key-insight-${stableId(item.dimension)}`]
  };
}

function themeEvidenceContext(theme: ThemeItem): EvidenceRenderContext {
  return {
    evidence: theme.theme_evidence,
    evidenceType: themeEvidenceType(theme),
    target: theme.theme_id,
    targets: [theme.theme_id]
  };
}

function evidenceSentencesForContext(review: DetailReview, context: EvidenceRenderContext): EvidenceSentence[] {
  const targetSet = new Set(context.targets ?? []);
  const targetMatched = targetSet.size
    ? (review.evidence_sentences ?? []).filter((sentence) => sentence.target && targetSet.has(sentence.target))
    : [];
  const derived = deriveEvidenceSentences(review, context);
  const fallback = !targetMatched.length && !derived.length && !context.evidence.length
    ? (review.evidence_sentences ?? [])
    : [];
  return uniqueEvidenceSentences([...targetMatched, ...derived, ...fallback]);
}

function deriveEvidenceSentences(review: DetailReview, context: EvidenceRenderContext): EvidenceSentence[] {
  const needles = normalizedNeedles(context.evidence);
  if (!needles.length) return [];
  const originalSentences = splitSentences(review.text);
  const translationSentences = splitSentences(review.translation);
  const matchedIndexes: number[] = [];
  for (const needle of needles) {
    const index = bestSentenceIndexForNeedle(originalSentences, needle, needles, context.evidenceType);
    if (index < 0) continue;
    if (!matchedIndexes.includes(index)) matchedIndexes.push(index);
  }
  matchedIndexes.sort((a, b) => a - b);
  return matchedIndexes.map((index) => {
    const original = originalSentences[index];
    return {
      original,
      translation: alignedTranslationSentence(review, original, index, originalSentences.length, translationSentences),
      evidence_type: context.evidenceType,
      target: context.target
    };
  });
}

function bestSentenceIndexForNeedle(sentences: string[], needle: string, allNeedles: string[], evidenceType: EvidenceType): number {
  const candidates = sentences
    .map((sentence, index) => ({ sentence, index }))
    .filter((item) => item.sentence.toLowerCase().includes(needle));
  if (!candidates.length) return -1;
  const best = candidates
    .map((item) => ({
      ...item,
      score: sentenceEvidenceScore(item.sentence, allNeedles)
    }))
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length || a.index - b.index)[0];
  if (evidenceType === "context" && isWeakContextNeedle(needle) && best.score <= 1 && !hasConcreteContextCue(best.sentence)) return -1;
  return best.index;
}

function sentenceEvidenceScore(sentence: string, needles: string[]): number {
  const text = sentence.toLowerCase();
  return needles.reduce((score, needle) => score + (text.includes(needle) ? Math.max(1, Math.min(4, Math.round(needle.length / 8))) : 0), 0);
}

function isWeakContextNeedle(needle: string): boolean {
  return ["portable", "sound", "audio", "good", "great"].includes(needle);
}

function hasConcreteContextCue(sentence: string): boolean {
  return /\b(part(y|ies)|gathering|occasion|weekend|house|home|living room|venue|venues|outside|outdoors|outdoor|vacation|travel|trip|beach|tv|television|hdmi|screen|lyrics|family|kids|children|friends)\b/i.test(sentence);
}

function alignedTranslationSentence(
  review: DetailReview,
  original: string,
  originalIndex: number,
  originalCount: number,
  translationSentences: string[]
): string {
  const existing = (review.evidence_sentences ?? []).find((sentence) => sentence.original === original && sentence.translation);
  if (existing?.translation) return existing.translation;
  if (!translationSentences.length) return review.translation;
  if (translationSentences.length === 1 || originalCount <= 1) return translationSentences[0];
  const semanticIndex = bestSemanticTranslationIndex(original, translationSentences);
  if (semanticIndex >= 0) return translationSentences[semanticIndex];
  const translationIndex = Math.max(0, Math.min(
    translationSentences.length - 1,
    Math.round((originalIndex / Math.max(1, originalCount - 1)) * (translationSentences.length - 1))
  ));
  return translationSentences[translationIndex];
}

function bestSemanticTranslationIndex(original: string, translationSentences: string[]): number {
  const lower = original.toLowerCase();
  const cues: string[] = [];
  const add = (condition: boolean, values: string[]) => { if (condition) cues.push(...values); };
  add(/\bparty|parties|gathering|occasion|fun\b/.test(lower), ["派对", "聚会", "场合", "有趣", "娱乐"]);
  add(/\bportable|outside|outdoors|outdoor|vacation|travel|venues?|beach\b/.test(lower), ["便携", "户外", "度假", "旅行", "场馆", "沙滩"]);
  add(/\btv|television|big screen|hdmi|screen|lyrics?\b/.test(lower), ["电视", "大屏", "HDMI", "屏幕", "歌词"]);
  add(/\blag|stutter|delay|game mode|resolution\b/.test(lower), ["延迟", "卡顿", "游戏模式", "分辨率"]);
  add(/\bsound|audio|bass|loud|volume|speaker|music|vocal\b/.test(lower), ["声音", "音质", "低音", "响亮", "音量", "音箱", "音乐", "人声"]);
  add(/\bmicrophone|mic|wireless\b/.test(lower), ["麦克风", "无线"]);
  add(/\bbattery|charge|charging|usb-c|cable\b/.test(lower), ["电池", "充电", "USB-C", "线"]);
  add(/\byoutube|spotify|karafun|subscription|app|browser|android\b/.test(lower), ["YouTube", "Spotify", "KaraFun", "订阅", "应用", "浏览器", "Android"]);
  add(/\btouch|button|backlit|responsive|interface\b/.test(lower), ["触屏", "按键", "背光", "响应", "界面"]);
  add(/\bstrap|handle|wheel|wheels|carry|carrying\b/.test(lower), ["背带", "把手", "轮子", "携带"]);
  const alphaTokens = Array.from(new Set((original.match(/[A-Za-z][A-Za-z0-9+-]{1,}/g) ?? []).filter((token) => token.length >= 2)));
  cues.push(...alphaTokens);
  const scored = translationSentences.map((sentence, index) => ({
    index,
    score: Array.from(new Set(cues)).reduce((score, cue) => score + (sentence.toLowerCase().includes(cue.toLowerCase()) ? 1 : 0), 0)
  }));
  const best = scored.sort((a, b) => b.score - a.score || a.index - b.index)[0];
  return best && best.score > 0 ? best.index : -1;
}

function splitSentences(value: string): string[] {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return (text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) ?? [text])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizedNeedles(evidence: string[]): string[] {
  return unique(evidence.map((item) => item.trim().toLowerCase()).filter(Boolean))
    .sort((a, b) => b.length - a.length);
}

function uniqueEvidenceSentences(sentences: EvidenceSentence[]): EvidenceSentence[] {
  const seen = new Set<string>();
  const out: EvidenceSentence[] = [];
  for (const sentence of sentences) {
    if (!sentence.original?.trim() || !sentence.translation?.trim()) continue;
    const key = [
      sentence.original.trim().toLowerCase(),
      sentence.translation.trim(),
      sentence.evidence_type,
      sentence.target ?? ""
    ].join("||");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sentence);
  }
  return out;
}

function renderRepresentativeReviews(reviews: DetailReview[], context: EvidenceRenderContext, limit = 3): string {
  const selected = selectRepresentativeReviews(reviews, context, limit);
  if (!selected.length) return "";
  const cards = selected.map((review, index) => {
    const evidenceSentences = evidenceSentencesForContext(review, context);
    return `<article class="representative-review-pair">
    <div class="theme-meta">
      <span class="badge">代表性 Review #${index + 1}</span>
      <span class="badge">Review #${review.review_index}</span>
      <span class="badge">rating: ${escapeHtml(review.rating)}</span>
      <span class="badge">date: ${escapeHtml(review.review_date)}</span>
    </div>
    <h4>${escapeHtml(review.title)}</h4>
    <p><strong>完整原文</strong></p>
    <p class="quote representative-review-original">${highlightEvidenceSentences(review.text, evidenceSentences, "original")}</p>
    <p><strong>完整中文译文</strong></p>
    <p class="quote representative-review-translation">${highlightEvidenceSentences(review.translation, evidenceSentences, "translation")}</p>
  </article>`;
  }).join("");
  return `<div class="representative-review-list" aria-label="3 条不同代表性原文">${cards}</div>`;
}

function selectRepresentativeReviews(reviews: DetailReview[], context: EvidenceRenderContext, limit: number): DetailReview[] {
  const seen = new Set<string>();
  const uniqueReviews = reviews.filter((review) => {
    const key = detailReviewKey(review);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const needles = normalizedNeedles(context.evidence);
  const scored = uniqueReviews.map((review, index) => ({
    review,
    index,
    score: representativeReviewScore(review, needles, context)
  }));
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.review);
}

function representativeReviewScore(review: DetailReview, needles: string[], context: EvidenceRenderContext): number {
  const text = review.text.toLowerCase();
  const evidenceScore = needles.reduce((score, needle) => score + (text.includes(needle) ? 4 : 0), 0);
  const sentenceScore = evidenceSentencesForContext(review, context).reduce((score, sentence) => {
    const original = sentence.original?.toLowerCase() ?? "";
    return score + (original && text.includes(original) ? 2 : 0);
  }, 0);
  const translationScore = review.translation?.trim() ? 1 : 0;
  return evidenceScore + sentenceScore + translationScore;
}

function buildInsightDetailReviews(analysis: AnalysisReport, item: KeyInsightItem): InsightDetailReview[] {
  const themesById = new Map(analysis.voc_themes.map((theme) => [theme.theme_id, theme]));
  const allThemeReviews = analysis.voc_themes.flatMap((theme) => theme.detail_reviews ?? []);
  const reviewMap = new Map<string, { review: DetailReview; typeIds: Set<string> }>();

  const addReview = (review: DetailReview, typeId?: string) => {
    const key = detailReviewKey(review);
    const entry = reviewMap.get(key) ?? { review, typeIds: new Set<string>() };
    entry.review = {
      ...entry.review,
      evidence_sentences: uniqueEvidenceSentences([
        ...(entry.review.evidence_sentences ?? []),
        ...(review.evidence_sentences ?? [])
      ])
    };
    if (typeId) entry.typeIds.add(typeId);
    reviewMap.set(key, entry);
  };

  const reviewsForThemeIds = (themeIds: string[]): DetailReview[] => {
    return themeIds.flatMap((themeId) => themesById.get(themeId)?.detail_reviews ?? []);
  };

  for (const review of reviewsForThemeIds(item.theme_ids)) addReview(review);
  for (const review of reviewsMatchingEvidence(allThemeReviews, item.evidence)) addReview(review);

  for (const [index, row] of (item.distribution ?? []).entries()) {
    const typeId = insightTypeId(item.dimension, row, index);
    const rowThemeReviews = reviewsForThemeIds(row.theme_ids?.length ? row.theme_ids : item.theme_ids);
    const matched = reviewsMatchingEvidence(rowThemeReviews.length ? rowThemeReviews : allThemeReviews, row.evidence);
    const candidates = matched.length ? matched : rowThemeReviews;
    for (const review of candidates) addReview(review, typeId);
  }

  return [...reviewMap.values()].map((entry) => ({
    ...entry.review,
    typeIds: [...entry.typeIds]
  }));
}

function reviewsMatchingEvidence(reviews: DetailReview[], evidence: string[]): DetailReview[] {
  const needles = evidence.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!needles.length) return [];
  return reviews.filter((review) => {
    const text = review.text.toLowerCase();
    return needles.some((needle) => text.includes(needle));
  });
}

function detailReviewKey(review: DetailReview): string {
  return [review.review_index, review.review_date, review.rating, review.title].join("||");
}

function insightTypeId(dimension: string, row: KeyInsightDistribution, index: number): string {
  return `insight-type-${stableId(dimension)}-${stableId(row.label) || index}`;
}

function keyInsightAnchor(dimension: string): string {
  const anchors: Record<string, string> = {
    "人群": "key-insight-audience",
    "场景": "key-insight-scenario",
    "用户任务": "key-insight-user-task",
    "购买理由": "key-insight-purchase-reason",
    "用户期望": "key-insight-user-expectation",
    "实际体验": "key-insight-actual-experience",
    "满意点": "key-insight-satisfaction",
    "不满意点": "key-insight-dissatisfaction"
  };
  return anchors[dimension] ?? `key-insight-${stableId(dimension)}`;
}

function themeCardAnchor(themeId: string): string {
  return `voc-theme-${stableId(themeId)}`;
}

function stableId(value: string): string {
  const safe = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (safe) return safe;
  return Array.from(value).map((char) => char.codePointAt(0)?.toString(36) ?? "x").join("-");
}

function renderDetailReview(
  review: AnalysisReport["voc_themes"][number]["detail_reviews"][number],
  options: { attributes?: string; evidenceContext?: EvidenceRenderContext } = {}
): string {
  const evidenceSentences = evidenceSentencesForContext(review, options.evidenceContext ?? {
    evidence: [],
    evidenceType: "context"
  });
  return `<div class="card detail-review" ${options.attributes ?? ""}>
    <div class="theme-meta">
      <span class="badge">Review #${review.review_index}</span>
      <span class="badge">rating: ${escapeHtml(review.rating)}</span>
      <span class="badge">date: ${escapeHtml(review.review_date)}</span>
    </div>
    <h4>${escapeHtml(review.title)}</h4>
    <p><strong>原文</strong></p>
    <p>${highlightEvidenceSentences(review.text, evidenceSentences, "original")}</p>
    <p><strong>中文翻译</strong></p>
    <p>${highlightEvidenceSentences(review.translation, evidenceSentences, "translation")}</p>
  </div>`;
}

function renderThemeDetailHeader(theme: AnalysisReport["voc_themes"][number]): string {
  return `<div class="card sticky-theme-card theme-filter-panel">
    <div class="theme-detail-context">
      <p class="detail-back-link"><a href="#voc-theme-map">返回 VOC 主题地图</a></p>
      <div class="subtle">所属 VOC 主题</div>
      <h3>${escapeHtml(theme.theme_name)}</h3>
      <div class="theme-meta">
        <span class="badge">主题类型：${escapeHtml(themeCategoryLabel(theme.theme_category))}</span>
        <span class="badge">提及：${theme.count}/${theme.sample_size} (${theme.percentage}%)</span>
        <span class="badge">严重度：${escapeHtml(severityLabel(theme.severity))}</span>
        <span class="badge">运营优先级：${escapeHtml(themePriorityLabel(theme))}</span>
      </div>
      <p class="theme-context-line"><strong>核心问题：</strong>${escapeHtml(theme.core_issue)}</p>
      <p class="theme-context-line"><strong>归因假设：</strong>${escapeHtml(theme.root_cause_hypothesis)}</p>
      <p class="theme-context-line"><strong>业务含义：</strong>${escapeHtml(theme.business_meaning)}</p>
      <p class="theme-context-line"><strong>运营动作：</strong>${escapeHtml(themeOperationalAction(theme))}</p>
    </div>
    <div class="theme-filter-area">
      <h2 class="section-title">观点筛选与评论</h2>
      <p class="subtle">默认展示支撑该 VOC 主题的全部相关 Review。点击下方观点后，在当前标签页内筛选该观点相关的全量评论。</p>
      ${renderThemeFilterControls(theme)}
      <div class="viewpoint-summary theme-filter-summary" data-theme-filter-summary>
        <div class="theme-meta">
          <span class="badge" data-theme-filter-count>${theme.detail_reviews.length} 条主题相关 Review</span>
          <span class="badge">当前筛选：全部主题评论</span>
        </div>
      </div>
    </div>
  </div>`;
}

function renderInteractionScript(): string {
  return `<script>
(() => {
  function openNewTab(target) {
    if (!target) return;
    window.open(target, "_blank", "noopener");
  }

  function text(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function badge(value, attrs) {
    return '<span class="badge"' + (attrs || '') + '>' + text(value) + '</span>';
  }

  function applyThemeFilter(button) {
    const section = button.closest("[data-theme-detail]");
    if (!(section instanceof HTMLElement)) return;
    const filter = button.dataset.themeFilter || "all";
    const reviews = Array.from(section.querySelectorAll("[data-theme-review]"));
    let visibleCount = 0;
    for (const review of reviews) {
      if (!(review instanceof HTMLElement)) continue;
      const viewpoints = (review.dataset.viewpoints || "").split(/\\s+/).filter(Boolean);
      const visible = filter === "all" || viewpoints.includes(filter);
      review.hidden = !visible;
      if (visible) visibleCount += 1;
    }
    for (const item of section.querySelectorAll("[data-theme-filter]")) item.classList.toggle("active", item === button);
    const summary = section.querySelector("[data-theme-filter-summary]");
    if (summary instanceof HTMLElement) {
      if (filter === "all") {
        summary.innerHTML = '<div class="theme-meta">'
          + badge(visibleCount + " 条主题相关 Review", " data-theme-filter-count")
          + badge("当前筛选：全部主题评论")
          + '</div>';
      } else {
        summary.innerHTML = '<div class="theme-meta">'
          + badge(visibleCount + " 条观点相关 Review", " data-theme-filter-count")
          + badge("当前观点：" + button.dataset.viewpointName)
          + badge(button.dataset.viewpointCount)
          + badge(button.dataset.viewpointPolarity)
          + '</div><p><strong>判断依据：</strong>' + text(button.dataset.viewpointReason)
          + '</p><p><strong>业务含义：</strong>' + text(button.dataset.viewpointBusiness)
          + '</p>';
      }
    }
  }

  function applyInsightFilter(button) {
    const section = button.closest("[data-insight-detail]");
    if (!(section instanceof HTMLElement)) return;
    const filter = button.dataset.insightFilter || "all";
    const reviews = Array.from(section.querySelectorAll("[data-insight-review]"));
    let visibleCount = 0;
    for (const review of reviews) {
      if (!(review instanceof HTMLElement)) continue;
      const types = (review.dataset.insightTypes || "").split(/\\s+/).filter(Boolean);
      const visible = filter === "all" || types.includes(filter);
      review.hidden = !visible;
      if (visible) visibleCount += 1;
    }
    for (const item of section.querySelectorAll("[data-insight-filter]")) item.classList.toggle("active", item === button);
    const summary = section.querySelector("[data-insight-filter-summary]");
    if (summary instanceof HTMLElement) {
      if (filter === "all") {
        summary.innerHTML = '<div class="theme-meta">'
          + badge(visibleCount + " 条关键结论相关 Review", " data-insight-filter-count")
          + badge("当前筛选：全部结论评论")
          + '</div>';
      } else {
        summary.innerHTML = '<div class="theme-meta">'
          + badge(visibleCount + " 条类型相关 Review", " data-insight-filter-count")
          + badge("当前类型：" + button.dataset.insightTypeName)
          + badge(button.dataset.insightTypeCount)
          + '</div><p><strong>判断依据：</strong>' + text(button.dataset.insightTypeReason)
          + '</p>';
      }
    }
  }

  function routeDetail() {
    const hash = window.location.hash || "";
    const isThemeDetail = hash.startsWith("#theme-detail-");
    const isInsightDetail = hash.startsWith("#insight-detail-");
    const isDetail = isThemeDetail || isInsightDetail;
    document.body.classList.toggle("theme-detail-mode", isThemeDetail);
    document.body.classList.toggle("insight-detail-mode", isInsightDetail);
    document.body.classList.toggle("detail-route-mode", isDetail);
    for (const section of document.querySelectorAll("[data-theme-detail]")) {
      if (!(section instanceof HTMLElement)) continue;
      section.classList.toggle("theme-detail-active", isThemeDetail && "#" + section.id === hash);
      section.classList.toggle("detail-route-active", isThemeDetail && "#" + section.id === hash);
    }
    for (const section of document.querySelectorAll("[data-insight-detail]")) {
      if (!(section instanceof HTMLElement)) continue;
      section.classList.toggle("insight-detail-active", isInsightDetail && "#" + section.id === hash);
      section.classList.toggle("detail-route-active", isInsightDetail && "#" + section.id === hash);
    }
    if (isDetail) window.setTimeout(() => window.scrollTo(0, 0), 0);
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tocSummaryLink = target.closest(".toc-summary a");
    if (tocSummaryLink instanceof HTMLAnchorElement) {
      event.preventDefault();
      event.stopPropagation();
      window.location.hash = tocSummaryLink.getAttribute("href") || "";
      return;
    }
    const filter = target.closest("[data-theme-filter]");
    if (filter instanceof HTMLElement) {
      applyThemeFilter(filter);
      return;
    }
    const insightFilter = target.closest("[data-insight-filter]");
    if (insightFilter instanceof HTMLElement) {
      applyInsightFilter(insightFilter);
      return;
    }
    if (target.closest("a, button")) return;
    if (target.closest("summary")) return;
    const card = target.closest("[data-card-target]");
    if (card instanceof HTMLElement) openNewTab(card.dataset.cardTarget);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, button")) return;
    if (target.closest("summary")) return;
    const interactive = target.closest("[data-card-target]");
    if (!(interactive instanceof HTMLElement)) return;
    event.preventDefault();
    openNewTab(interactive.dataset.cardTarget);
  });

  window.addEventListener("hashchange", routeDetail);
  routeDetail();
})();
</script>`;
}

function polarityLabel(polarity: string): string {
  const labels: Record<string, string> = {
    positive: "正向",
    negative: "负向",
    mixed: "混合",
    neutral: "中性"
  };
  return labels[polarity] ?? polarity;
}

function keyInsightEvidenceType(dimension: string): EvidenceType {
  if (dimension === "满意点" || dimension === "购买理由") return "positive";
  if (dimension === "不满意点") return "negative";
  if (dimension === "用户期望") return "opportunity";
  return "context";
}

function themeEvidenceType(theme: ThemeItem): EvidenceType {
  const category = theme.theme_category;
  if (isPositiveOpportunity(category) || isTrustOpportunity(category)) return "positive";
  if (category === "low_frequency_high_risk") return "negative";
  if (category === "expectation_gap" || category === "product_pain_point" || category === "scenario_problem") return "opportunity";
  return "context";
}

function confidenceLabel(confidence: string): string {
  const labels: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低"
  };
  return labels[confidence] ?? confidence;
}

function severityLabel(severity: string): string {
  const labels: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低"
  };
  return labels[severity] ?? severity;
}

function themeCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    positive_purchase_driver: "正向购买驱动",
    expectation_gap: "预期落差",
    scenario_problem: "场景问题",
    audience_fit: "人群适配",
    low_frequency_high_risk: "低频高风险",
    product_pain_point: "产品痛点",
    value_support_trust: "价值与信任支撑",
    trust_support: "信任与售后支撑"
  };
  return labels[category] ?? category;
}

function themePriorityLabel(theme: AnalysisReport["voc_themes"][number]): string {
  const priority = theme.priority || "P2";
  const category = theme.theme_category;
  if (priority === "P0") {
    if (isPositiveOpportunity(category)) return `${priority} 立即放大卖点`;
    if (isTrustOpportunity(category)) return `${priority} 立即补强信任`;
    return `${priority} 立即止损`;
  }
  if (priority === "P1") {
    if (isPositiveOpportunity(category)) return `${priority} 本轮放大机会`;
    if (category === "expectation_gap") return `${priority} 本轮澄清预期`;
    if (category === "low_frequency_high_risk") return `${priority} 本轮闭环风险`;
    return `${priority} 本轮处理`;
  }
  if (priority === "P2") {
    if (category === "product_pain_point" || category === "scenario_problem") return `${priority} 排期补齐体验`;
    if (isPositiveOpportunity(category)) return `${priority} 排期验证放大`;
    if (isTrustOpportunity(category)) return `${priority} 排期补强信任`;
    return `${priority} 排期优化`;
  }
  return `${priority} 待复核`;
}

function themeOperationalAction(theme: AnalysisReport["voc_themes"][number]): string {
  const category = theme.theme_category;
  if (isPositiveOpportunity(category)) {
    return "运营要把它当作转化主线放大：在主图、视频、A+、广告首屏展示真实使用场景、关键卖点和高频好评证据，用来提升点击后的理解效率和高客单价合理性。";
  }
  if (category === "product_pain_point") {
    return "运营要排期做低成本补齐：在主图辅图、A+、FAQ、包装清单和客服话术中把缺失信息讲清楚，并把可快速修复项交给产品或售后，减少买前疑虑、退货前咨询和 4 星扣分。";
  }
  if (category === "expectation_gap") {
    return "运营要在本轮迭代澄清预期：把功能边界、兼容条件、订阅/配件/连接限制写进主图、A+、FAQ 和客服答复，避免用户买后认为货不对版。";
  }
  if (category === "low_frequency_high_risk") {
    return "运营要在本轮建立止损闭环：拉售后、质检和客服复盘故障关键词，补充排查路径、换退货话术和页面风险提示，降低低星评论与退货扩散。";
  }
  if (isTrustOpportunity(category)) {
    return "运营要补强信任证据：用保修、售后、长期使用、价值对比和真实评论证据解释为什么值得买，减少高价疑虑。";
  }
  if (category === "scenario_problem") {
    return "运营要补充使用条件和边界：明确适用场景、不适用场景和正确使用步骤，把场景误解转成页面说明、QA 和客服话术。";
  }
  return theme.priority === "P0"
    ? "运营要立即把该主题纳入本轮转化或止损动作，并用 Review 证据验证处理结果。"
    : "运营要把该主题排入后续 Listing、素材、客服或产品优化池，并在新 Review 中复盘变化。";
}

function isPositiveOpportunity(category: string): boolean {
  return category === "positive_purchase_driver" || category === "audience_fit";
}

function isTrustOpportunity(category: string): boolean {
  return category === "value_support_trust" || category === "trust_support";
}

function renderActions(analysis: AnalysisReport): string {
  const groups = groupActionsByArea(analysis.business_actions);
  const blocks = groups.map(([area, actions]) => {
    const highest = highestPriority(actions);
    const themes = unique(actions.map((action) => action.theme_id));
    const cards = actions.map(renderActionCard).join("");
    return `<details class="report-block action-group" open>
      <summary class="block-summary">
        <div class="summary-main">
          <h3>${escapeHtml(actionAreaLabel(area))}</h3>
          <p>${actions.length} 个动作，关联 ${themes.length} 个 VOC 主题。</p>
        </div>
        <div class="summary-badges">
          <span class="badge">动作数：${actions.length}</span>
          <span class="badge">最高动作优先级：${escapeHtml(highest)}</span>
          <span class="badge id-list">${escapeHtml(themes.slice(0, 3).join("、"))}${themes.length > 3 ? "..." : ""}</span>
        </div>
      </summary>
      <div class="block-body action-card-list">${cards}</div>
    </details>`;
  }).join("");
  return `<section id="actions" class="section">
    <h2 class="section-title">机会矩阵与业务动作清单</h2>
    <div class="block-list action-group-list">${blocks}</div>
  </section>`;
}

function renderActionCard(action: AnalysisReport["business_actions"][number]): string {
  return `<article class="action-card">
    <header class="action-card-head">
      <div>
        <h4>${escapeHtml(action.theme_id)}</h4>
        <p class="subtle">${escapeHtml(action.priority_reason)}</p>
      </div>
      <div class="summary-badges">
        <span class="badge">动作优先级：${escapeHtml(action.priority)} (${action.priority_score})</span>
        <span class="badge">置信度：${escapeHtml(confidenceLabel(action.confidence))}</span>
      </div>
    </header>
    <div class="action-fields">
      <div class="action-field">
        <h5>业务发现</h5>
        <p>${escapeHtml(action.business_finding)}</p>
      </div>
      <div class="action-field">
        <h5>建议动作</h5>
        ${renderRecommendation(action.recommendation)}
      </div>
      <div class="action-field">
        <h5>影响指标</h5>
        ${renderTagList(action.impact_metrics)}
      </div>
      <div class="action-field">
        <h5>验证方式</h5>
        ${renderTagList(action.validation_method)}
      </div>
    </div>
  </article>`;
}

function renderRecommendation(recommendation: string | Record<string, unknown>): string {
  if (typeof recommendation === "string") return `<p>${escapeHtml(recommendation)}</p>`;
  const rows = Object.entries(recommendation).map(([key, value]) => {
    const rendered = Array.isArray(value)
      ? `<ul>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(value)}</p>`;
    return `<div class="recommendation-row"><strong>${escapeHtml(key)}：</strong>${rendered}</div>`;
  }).join("");
  return rows || `<p>unknown</p>`;
}

function renderTagList(items: string[]): string {
  if (!items.length) return `<p>unknown</p>`;
  return `<div class="tag-list">${items.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderLimits(analysis: AnalysisReport): string {
  const checkpoints = analysis.checkpoints.map((cp) => `<tr><td>${escapeHtml(cp.name)}</td><td class="checkpoint-${escapeHtml(cp.status)}">${escapeHtml(cp.status)}</td><td>${escapeHtml(cp.message)}</td></tr>`).join("");
  return `<section id="limits" class="section">
    <h2 class="section-title">限制说明与 Checkpoint 状态</h2>
    <ul>${analysis.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <div class="table-wrap"><table><thead><tr><th>Checkpoint</th><th>状态</th><th>说明</th></tr></thead><tbody>${checkpoints}</tbody></table></div>
  </section>`;
}

function formatDateTime(value: unknown): string {
  const raw = String(value ?? "");
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw || "unknown";
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function groupActionsByArea(actions: AnalysisReport["business_actions"]): Array<[string, AnalysisReport["business_actions"]]> {
  const preferred = ["listing", "product", "image_video", "support", "qa"];
  const groups = new Map<string, AnalysisReport["business_actions"]>();
  for (const action of actions) {
    const area = action.action_area || "unknown";
    groups.set(area, [...(groups.get(area) ?? []), action]);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });
}

function highestPriority(actions: AnalysisReport["business_actions"]): string {
  const rank: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  return actions.reduce((best, action) => (rank[action.priority] < rank[best] ? action.priority : best), actions[0]?.priority ?? "P2");
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function actionAreaLabel(area: string): string {
  const labels: Record<string, string> = {
    listing: "Listing 优化",
    product: "产品体验",
    image_video: "图片与视频",
    support: "客服与售后",
    qa: "QA 与答疑",
    unknown: "未分类方向"
  };
  return labels[area] ?? area;
}

function metricCard(label: string, value: unknown): string {
  return `<div class="card"><div class="subtle">${escapeHtml(label)}</div><div class="metric">${escapeHtml(value)}</div></div>`;
}

function sectionTitleWithHelp(title: string, help: string): string {
  return `<h2 class="section-title section-title-with-help">${escapeHtml(title)}<span class="help-badge" tabindex="0" role="note" aria-label="${escapeHtml(help)}" data-tooltip="${escapeHtml(help)}">❓</span></h2>`;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error("Usage: render_report.ts <analysis.json> <report.html>");
    process.exit(1);
  }
  await renderReportFile(input, output);
}
