import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AnalysisReport,
  REQUIRED_KEY_INSIGHT_DIMENSIONS,
  escapeHtml,
  highlightTerms,
  computeReviewHealth,
  NormalizedReview
} from "./core.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");

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
    <nav class="toc">
      <div class="toc-title">Review VOC 报告</div>
      <a href="#scope">数据范围与口径</a>
      <a href="#health">Review 健康度</a>
      <a href="#key-insights">关键结论</a>
      <a href="#voc-theme-map">VOC 主题地图</a>
      <a href="#actions">机会矩阵与业务动作</a>
      <a href="#limits">限制与 Checkpoint</a>
    </nav>
    <main class="main">
      ${renderScope(analysis)}
      ${renderHealth(analysis, health)}
      ${renderKeyInsights(analysis)}
      ${renderThemeMap(analysis)}
      ${renderThemeDetails(analysis)}
      ${renderViewpointDetails(analysis)}
      ${renderActions(analysis)}
      ${renderLimits(analysis)}
    </main>
  </div>
</body>
</html>`;
}

function renderScope(analysis: AnalysisReport): string {
  const m = analysis.metadata;
  return `<section id="scope" class="section">
    <h1 class="section-title">${escapeHtml(m.asin)} Review VOC 决策报告</h1>
    <p class="subtle">中文报告。数据来源：${escapeHtml(m.data_source)}。VOC 分母固定为 Review 样本数。</p>
    <div class="grid">
      ${metricCard("站点", m.site)}
      ${metricCard("Review 样本数", m.review_sample_size)}
      ${metricCard("ASIN 总评论数量", m.asin_total_review_count)}
      ${metricCard("抓取/生成时间", m.generated_at)}
      ${metricCard("产品星级", m.product_rating ?? "unknown")}
      ${metricCard("分析口径", "Amazon US 单 ASIN")}
      ${metricCard("已知缺失字段", "reviewer name / verified purchase / helpful vote / review URL / Vine：unknown")}
    </div>
  </section>`;
}

function renderHealth(analysis: AnalysisReport, health: NonNullable<AnalysisReport["health"]>): string {
  const rows = Object.entries(health.star_distribution)
    .map(([star, count]) => `<tr><td>${star} 星</td><td>${count}</td><td>${health.review_sample_size ? `${Math.round((count / health.review_sample_size) * 1000) / 10}%` : "0%"}</td></tr>`)
    .join("");
  return `<section id="health" class="section">
    <h2 class="section-title">Review 健康度</h2>
    <div class="grid">
      ${metricCard("样本平均星级", health.average_sample_rating)}
      ${metricCard("4-5 星占比", `${health.positive_count}/${health.review_sample_size} (${health.positive_percentage}%)`)}
      ${metricCard("1-3 星占比", `${health.negative_count}/${health.review_sample_size} (${health.negative_percentage}%)`)}
      ${metricCard("最新 Review 日期", health.latest_review_date)}
      ${metricCard("正文存在率", `${health.text_presence_percentage}%`)}
      ${metricCard("日期存在率", `${health.date_presence_percentage}%`)}
    </div>
    <div class="table-wrap"><table><thead><tr><th>星级</th><th>数量</th><th>占比</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

function renderKeyInsights(analysis: AnalysisReport): string {
  const byDimension = new Map(analysis.key_insights.map((item) => [item.dimension, item]));
  const cards = REQUIRED_KEY_INSIGHT_DIMENSIONS.map((dimension) => {
    const item = byDimension.get(dimension);
    if (!item) {
      return `<div class="card"><h3>${dimension}</h3><p>评论未明确表达，当前样本中记为 unknown。</p></div>`;
    }
    const summary = item.summary ?? item.insight;
    const implication = item.business_implication ?? item.implication;
    return `<div class="card">
      <h3>${escapeHtml(item.dimension)}</h3>
      <p>${escapeHtml(summary)}</p>
      <div class="theme-meta">
        <span class="badge">${item.count}/${item.sample_size} (${item.percentage}%)</span>
        <span class="badge">confidence: ${escapeHtml(item.confidence)}</span>
      </div>
      ${renderInsightDistribution(item)}
      <p class="subtle">${escapeHtml(implication)}</p>
      ${item.evidence.slice(0, 3).map((e) => `<p class="quote">${escapeHtml(e)}</p>`).join("")}
      <p class="subtle">关联主题：${item.theme_ids.map(escapeHtml).join(", ") || "unknown"}</p>
    </div>`;
  }).join("");
  return `<section id="key-insights" class="section"><h2 class="section-title">关键结论</h2><div class="grid insight-grid">${cards}</div></section>`;
}

function renderInsightDistribution(item: AnalysisReport["key_insights"][number]): string {
  if (!item.distribution?.length) return "";
  const rows = item.distribution.map((row) => `<tr>
    <td>${escapeHtml(row.label)}</td>
    <td><span class="mini-bar" style="--bar:${Math.max(0, Math.min(100, row.percentage))}%"></span><span>${row.review_count}/${row.sample_size} (${row.percentage}%)</span></td>
    <td><span class="role role-${escapeHtml(row.role)}">${escapeHtml(roleLabel(row.role))}</span></td>
    <td>${escapeHtml(row.reason)}</td>
  </tr>`).join("");
  return `<div class="insight-distribution table-wrap">
    <table>
      <thead><tr><th>类型</th><th>提及占比</th><th>角色</th><th>判断依据</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    primary: "主要",
    secondary: "次要",
    emerging: "新兴",
    long_tail: "长尾",
    risk_signal: "风险",
    unknown: "未明确"
  };
  return labels[role] ?? role;
}

function renderThemeMap(analysis: AnalysisReport): string {
  const cards = analysis.voc_themes.map((theme) => `<div class="card theme-card">
    <h3>${escapeHtml(theme.theme_name)}</h3>
    <div class="theme-meta">
      <span class="badge">${escapeHtml(theme.theme_category)}</span>
      <span class="badge">${theme.count}/${theme.sample_size} (${theme.percentage}%)</span>
      <span class="badge">severity: ${escapeHtml(theme.severity)}</span>
      <span class="badge">${escapeHtml(theme.priority)}</span>
    </div>
    <p>${escapeHtml(theme.core_issue)}</p>
    <p class="subtle">${escapeHtml(theme.business_meaning)}</p>
    ${renderThemeViewpointDistribution(theme)}
    ${theme.theme_evidence.slice(0, 2).map((e) => `<p class="quote">${escapeHtml(e)}</p>`).join("")}
    <p><a href="#theme-detail-${escapeHtml(theme.theme_id)}">查看主题级详情</a></p>
  </div>`).join("");
  return `<section id="voc-theme-map" class="section">
    <h2 class="section-title">VOC 主题地图</h2>
    <p class="subtle">VOC 主题下的观点为多标签提及率；同一条 Review 可以同时支撑同一主题下的多个观点，因此观点占比允许合计超过 100%。点击观点会在新标签页打开该观点相关的全量评论。</p>
    <div class="grid">${cards}</div>
  </section>`;
}

function renderThemeViewpointDistribution(theme: AnalysisReport["voc_themes"][number]): string {
  if (!theme.viewpoints?.length) return `<p class="subtle">该主题暂未生成观点分布。</p>`;
  const rows = theme.viewpoints.map((viewpoint) => `<tr>
    <td><a class="viewpoint-link" data-open-mode="new-tab" href="#${viewpointAnchor(theme.theme_id, viewpoint.viewpoint_id)}" target="_blank" rel="noopener">${escapeHtml(viewpoint.viewpoint_name)}</a></td>
    <td><span class="mini-bar" style="--bar:${Math.max(0, Math.min(100, viewpoint.percentage))}%"></span><span>${viewpoint.review_count}/${viewpoint.sample_size} (${viewpoint.percentage}%)</span></td>
    <td><span class="role role-${escapeHtml(viewpoint.role)}">${escapeHtml(roleLabel(viewpoint.role))}</span></td>
    <td><span class="polarity polarity-${escapeHtml(viewpoint.viewpoint_polarity)}">${escapeHtml(polarityLabel(viewpoint.viewpoint_polarity))}</span></td>
    <td>${escapeHtml(viewpoint.reason)}</td>
  </tr>`).join("");
  return `<div class="viewpoint-distribution table-wrap">
    <table>
      <thead><tr><th>观点</th><th>提及占比</th><th>角色</th><th>极性</th><th>判断依据</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderThemeDetails(analysis: AnalysisReport): string {
  const sections = analysis.voc_themes.map((theme) => {
    const reviews = theme.detail_reviews.map((review) => `<div class="card detail-review">
      <div class="theme-meta">
        <span class="badge">Review #${review.review_index}</span>
        <span class="badge">rating: ${escapeHtml(review.rating)}</span>
        <span class="badge">date: ${escapeHtml(review.review_date)}</span>
      </div>
      <h4>${escapeHtml(review.title)}</h4>
      <p><strong>原文</strong></p>
      <p>${highlightTerms(review.text, review.highlight_terms)}</p>
      <p><strong>中文翻译</strong></p>
      <p>${highlightTerms(review.translation, review.translation_highlight_terms)}</p>
    </div>`).join("");
    return `<section id="theme-detail-${escapeHtml(theme.theme_id)}" class="section">
      <h2 class="section-title">${escapeHtml(theme.theme_name)}</h2>
      <p><a href="#voc-theme-map">返回 VOC 主题地图</a></p>
      <div class="card">
        <p><strong>核心问题：</strong>${escapeHtml(theme.core_issue)}</p>
        <p><strong>归因假设：</strong>${escapeHtml(theme.root_cause_hypothesis)}</p>
        <p><strong>业务含义：</strong>${escapeHtml(theme.business_meaning)}</p>
      </div>
      ${reviews}
    </section>`;
  }).join("");
  return sections;
}

function renderViewpointDetails(analysis: AnalysisReport): string {
  const sections = analysis.voc_themes.flatMap((theme) =>
    (theme.viewpoints ?? []).map((viewpoint) => {
      const reviews = viewpoint.detail_reviews.map((review) => `<div class="card detail-review">
        <div class="theme-meta">
          <span class="badge">Review #${review.review_index}</span>
          <span class="badge">rating: ${escapeHtml(review.rating)}</span>
          <span class="badge">date: ${escapeHtml(review.review_date)}</span>
        </div>
        <h4>${escapeHtml(review.title)}</h4>
        <p><strong>原文</strong></p>
        <p>${highlightTerms(review.text, review.highlight_terms)}</p>
        <p><strong>中文翻译</strong></p>
        <p>${highlightTerms(review.translation, review.translation_highlight_terms)}</p>
      </div>`).join("");
      return `<section id="${viewpointAnchor(theme.theme_id, viewpoint.viewpoint_id)}" class="section viewpoint-detail">
        ${renderStickyThemeCard(theme)}
        <div class="card viewpoint-summary">
          <p><a href="#voc-theme-map">返回 VOC 主题地图</a></p>
          <h2 class="section-title">${escapeHtml(viewpoint.viewpoint_name)}</h2>
          <div class="theme-meta">
            <span class="badge">${viewpoint.review_count}/${viewpoint.sample_size} (${viewpoint.percentage}%)</span>
            <span class="badge">${escapeHtml(roleLabel(viewpoint.role))}</span>
            <span class="badge">${escapeHtml(polarityLabel(viewpoint.viewpoint_polarity))}</span>
            <span class="badge">confidence: ${escapeHtml(viewpoint.confidence)}</span>
          </div>
          <p><strong>判断依据：</strong>${escapeHtml(viewpoint.reason)}</p>
          <p><strong>业务含义：</strong>${escapeHtml(viewpoint.business_meaning)}</p>
          <p class="subtle">本页展示该观点相关的全量 Review 原文和中文翻译。</p>
        </div>
        ${reviews}
      </section>`;
    })
  ).join("");
  return sections;
}

function renderStickyThemeCard(theme: AnalysisReport["voc_themes"][number]): string {
  return `<div class="card sticky-theme-card">
    <div class="subtle">所属 VOC 主题</div>
    <h3>${escapeHtml(theme.theme_name)}</h3>
    <div class="theme-meta">
      <span class="badge">${escapeHtml(theme.theme_category)}</span>
      <span class="badge">${theme.count}/${theme.sample_size} (${theme.percentage}%)</span>
      <span class="badge">severity: ${escapeHtml(theme.severity)}</span>
      <span class="badge">${escapeHtml(theme.priority)}</span>
    </div>
    <p>${escapeHtml(theme.core_issue)}</p>
    <p class="subtle">${escapeHtml(theme.business_meaning)}</p>
  </div>`;
}

function viewpointAnchor(themeId: string, viewpointId: string): string {
  return `voc-viewpoint-detail-${themeId}-${viewpointId}`;
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

function renderActions(analysis: AnalysisReport): string {
  const rows = analysis.business_actions.map((action) => `<tr>
    <td>${escapeHtml(action.action_area)}</td>
    <td>${escapeHtml(action.theme_id)}</td>
    <td>${escapeHtml(action.business_finding)}</td>
    <td>${escapeHtml(typeof action.recommendation === "string" ? action.recommendation : JSON.stringify(action.recommendation))}</td>
    <td>${escapeHtml(action.priority)} (${action.priority_score})</td>
    <td>${escapeHtml(action.impact_metrics.join("、"))}</td>
    <td>${escapeHtml(action.validation_method.join("、"))}</td>
  </tr>`).join("");
  return `<section id="actions" class="section"><h2 class="section-title">机会矩阵与业务动作清单</h2><div class="table-wrap"><table><thead><tr><th>方向</th><th>主题</th><th>业务发现</th><th>建议动作</th><th>优先级</th><th>影响指标</th><th>验证方式</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function renderLimits(analysis: AnalysisReport): string {
  const checkpoints = analysis.checkpoints.map((cp) => `<tr><td>${escapeHtml(cp.name)}</td><td class="checkpoint-${escapeHtml(cp.status)}">${escapeHtml(cp.status)}</td><td>${escapeHtml(cp.message)}</td></tr>`).join("");
  return `<section id="limits" class="section">
    <h2 class="section-title">限制说明与 Checkpoint 状态</h2>
    <ul>${analysis.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <div class="table-wrap"><table><thead><tr><th>Checkpoint</th><th>状态</th><th>说明</th></tr></thead><tbody>${checkpoints}</tbody></table></div>
  </section>`;
}

function metricCard(label: string, value: unknown): string {
  return `<div class="card"><div class="subtle">${escapeHtml(label)}</div><div class="metric">${escapeHtml(value)}</div></div>`;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error("Usage: render_report.ts <analysis.json> <report.html>");
    process.exit(1);
  }
  await renderReportFile(input, output);
}
