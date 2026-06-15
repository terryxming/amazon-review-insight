import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { AnalysisReport } from "./core.js";

type Row = Record<string, unknown>;

const SHEET_COLUMNS: Record<string, { header: string; key: string; width: number }[]> = {
  元数据: [
    { header: "字段", key: "field", width: 28 },
    { header: "值", key: "value", width: 72 }
  ],
  原始评论: [
    { header: "ASIN", key: "asin", width: 14 },
    { header: "评论日期", key: "review_date", width: 14 },
    { header: "星级", key: "rating", width: 10 },
    { header: "title", key: "title", width: 30 },
    { header: "text", key: "text", width: 80 },
    { header: "评论序号", key: "review_index", width: 12 },
    { header: "变体", key: "variant", width: 24 },
    { header: "原始数据JSON", key: "raw_json", width: 48 }
  ],
  Review编码层: [
    { header: "ASIN", key: "asin", width: 14 },
    { header: "评论日期", key: "review_date", width: 14 },
    { header: "星级", key: "rating", width: 10 },
    { header: "title", key: "title", width: 30 },
    { header: "text", key: "text", width: 80 },
    { header: "评论序号", key: "review_index", width: 12 },
    { header: "编码单元ID", key: "feedback_unit_id", width: 24 },
    { header: "编码维度", key: "dimension", width: 16 },
    { header: "人群", key: "audience", width: 24 },
    { header: "场景", key: "scenario", width: 24 },
    { header: "用户任务", key: "user_task", width: 24 },
    { header: "购买理由", key: "purchase_reason", width: 24 },
    { header: "用户期望", key: "user_expectation", width: 28 },
    { header: "期望来源", key: "expectation_source", width: 22 },
    { header: "实际体验", key: "actual_experience", width: 28 },
    { header: "满意点", key: "satisfied_points", width: 28 },
    { header: "不满意点", key: "unsatisfied_points", width: 28 },
    { header: "结果/影响", key: "consequence", width: 28 },
    { header: "证据原文", key: "evidence", width: 64 },
    { header: "开放标签", key: "open_tags", width: 36 },
    { header: "置信度", key: "confidence", width: 12 }
  ],
  开放标签: [
    { header: "标签ID", key: "tag_id", width: 28 },
    { header: "标签名称", key: "tag_name", width: 30 },
    { header: "维度", key: "dimension", width: 16 },
    { header: "提及评论数", key: "count", width: 12 },
    { header: "样本数", key: "sample_size", width: 12 },
    { header: "占比", key: "percentage", width: 12 },
    { header: "代表证据", key: "representative_evidence", width: 64 },
    { header: "关联主题ID", key: "theme_ids", width: 36 }
  ],
  关键结论分布: [
    { header: "维度", key: "dimension", width: 16 },
    { header: "类型", key: "label", width: 30 },
    { header: "提及评论数", key: "review_count", width: 12 },
    { header: "样本数", key: "sample_size", width: 12 },
    { header: "占比", key: "percentage", width: 12 },
    { header: "角色", key: "role", width: 12 },
    { header: "判断依据", key: "reason", width: 54 },
    { header: "证据原文", key: "evidence", width: 64 },
    { header: "关联主题ID", key: "theme_ids", width: 36 }
  ],
  VOC主题: [
    { header: "主题ID", key: "theme_id", width: 32 },
    { header: "主题名称", key: "theme_name", width: 34 },
    { header: "主题类型", key: "theme_category", width: 24 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "提及评论数", key: "count", width: 12 },
    { header: "样本数", key: "sample_size", width: 12 },
    { header: "占比", key: "percentage", width: 12 },
    { header: "核心问题", key: "core_issue", width: 54 },
    { header: "归因假设", key: "root_cause_hypothesis", width: 54 },
    { header: "严重度", key: "severity", width: 12 },
    { header: "业务含义", key: "business_meaning", width: 54 },
    { header: "相关动作方向", key: "related_action_areas", width: 30 },
    { header: "主题证据", key: "theme_evidence", width: 64 },
    { header: "置信度", key: "confidence", width: 12 }
  ],
  业务动作: [
    { header: "动作ID", key: "action_id", width: 30 },
    { header: "主题ID", key: "theme_id", width: 32 },
    { header: "动作方向", key: "action_area", width: 16 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "优先级分数", key: "priority_score", width: 14 },
    { header: "业务发现", key: "business_finding", width: 48 },
    { header: "建议动作", key: "recommendation", width: 64 },
    { header: "优先级理由", key: "priority_reason", width: 48 },
    { header: "影响指标", key: "impact_metrics", width: 36 },
    { header: "验证方式", key: "validation_method", width: 36 },
    { header: "证据原文", key: "evidence", width: 64 },
    { header: "置信度", key: "confidence", width: 12 }
  ],
  检查点: [
    { header: "检查点ID", key: "id", width: 26 },
    { header: "检查点名称", key: "name", width: 24 },
    { header: "状态", key: "status", width: 12 },
    { header: "说明", key: "message", width: 64 }
  ]
};

export async function exportReviewCodingExcelFile(inputPath: string, outputPath: string): Promise<void> {
  const analysis = JSON.parse(await readFile(inputPath, "utf8")) as AnalysisReport;
  const workbook = buildReviewCodingWorkbook(analysis);
  await workbook.xlsx.writeFile(outputPath);
}

export function buildReviewCodingWorkbook(analysis: AnalysisReport): ExcelJS.Workbook {
  assertFullReviewCodingLayer(analysis);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "amazon-review-insight";
  workbook.created = new Date(analysis.metadata.generated_at);
  workbook.modified = new Date();
  addSheet(workbook, "元数据", metadataRows(analysis));
  addSheet(workbook, "原始评论", normalizedReviewRows(analysis));
  addSheet(workbook, "Review编码层", reviewCodingRows(analysis));
  addSheet(workbook, "开放标签", (analysis.open_tags ?? []).map(normalizeRow));
  addSheet(workbook, "关键结论分布", keyInsightDistributionRows(analysis));
  addSheet(workbook, "VOC主题", vocThemeRows(analysis));
  addSheet(workbook, "业务动作", businessActionRows(analysis));
  addSheet(workbook, "检查点", analysis.checkpoints.map(normalizeRow));
  return workbook;
}

function addSheet(workbook: ExcelJS.Workbook, name: keyof typeof SHEET_COLUMNS, rows: Row[]): void {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = SHEET_COLUMNS[name];
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: SHEET_COLUMNS[name].length }
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FF1D2733" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F4F8" } };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  for (const row of rows) sheet.addRow(row);
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD8DEE8" } } };
    });
  });
}

function metadataRows(analysis: AnalysisReport): Row[] {
  return [
    { field: "ASIN", value: analysis.metadata.asin },
    { field: "站点", value: analysis.metadata.site },
    { field: "数据来源", value: analysis.metadata.data_source },
    { field: "生成时间", value: analysis.metadata.generated_at },
    { field: "Review 样本数", value: analysis.metadata.review_sample_size },
    { field: "ASIN 总评论数量", value: analysis.metadata.asin_total_review_count },
    { field: "产品星级", value: analysis.metadata.product_rating ?? "unknown" },
    { field: "工作簿契约", value: "review_coding_excel_v0.2.0_zh" }
  ];
}

function normalizedReviewRows(analysis: AnalysisReport): Row[] {
  return analysis.normalized_reviews!.map((review, index) => normalizeRow({
    review_index: typeof review.raw?.review_index === "number" ? review.raw.review_index : index + 1,
    asin: review.asin,
    variant: review.variant,
    review_date: review.review_date,
    rating: review.rating,
    title: review.title,
    text: review.text,
    raw_json: review.raw
  }));
}

function reviewCodingRows(analysis: AnalysisReport): Row[] {
  const byReviewIndex = new Map<number, NonNullable<AnalysisReport["normalized_reviews"]>[number]>();
  for (const [index, review] of analysis.normalized_reviews!.entries()) {
    byReviewIndex.set(typeof review.raw?.review_index === "number" ? review.raw.review_index : index + 1, review);
  }
  return (analysis.feedback_units ?? []).map((unit) => {
    const review = byReviewIndex.get(unit.review_index);
    return normalizeRow({
      asin: review?.asin ?? analysis.metadata.asin,
      review_date: review?.review_date ?? "unknown",
      rating: review?.rating ?? "unknown",
      title: review?.title ?? "",
      text: review?.text ?? "",
      review_index: unit.review_index,
      feedback_unit_id: unit.feedback_unit_id,
      dimension: unit.dimension,
      audience: unit.audience,
      scenario: unit.scenario,
      user_task: unit.user_task,
      purchase_reason: unit.purchase_reason,
      user_expectation: unit.user_expectation,
      expectation_source: unit.expectation_source,
      actual_experience: unit.actual_experience,
      satisfied_points: unit.satisfied_points,
      unsatisfied_points: unit.unsatisfied_points,
      consequence: unit.consequence,
      evidence: unit.evidence,
      open_tags: unit.open_tags,
      confidence: unit.confidence
    });
  });
}

function keyInsightDistributionRows(analysis: AnalysisReport): Row[] {
  return analysis.key_insights.flatMap((insight) =>
    (insight.distribution ?? []).map((row) => normalizeRow({
      dimension: insight.dimension,
      label: row.label,
      review_count: row.review_count,
      sample_size: row.sample_size,
      percentage: row.percentage,
      role: row.role,
      reason: row.reason,
      evidence: row.evidence,
      theme_ids: row.theme_ids
    }))
  );
}

function assertFullReviewCodingLayer(analysis: AnalysisReport): void {
  const expected = analysis.metadata.review_sample_size;
  const actual = analysis.normalized_reviews?.length ?? 0;
  if (actual !== expected) {
    throw new Error(`normalized_reviews must cover the full Review sample: expected ${expected}, got ${actual}.`);
  }
  if (!analysis.feedback_units?.length) throw new Error("feedback_units is required for Review coding Excel export.");
  if (!analysis.open_tags?.length) throw new Error("open_tags is required for Review coding Excel export.");
}

function vocThemeRows(analysis: AnalysisReport): Row[] {
  return analysis.voc_themes.map((theme) => normalizeRow({
    theme_id: theme.theme_id,
    theme_name: theme.theme_name,
    theme_category: theme.theme_category,
    priority: theme.priority,
    count: theme.count,
    sample_size: theme.sample_size,
    percentage: theme.percentage,
    core_issue: theme.core_issue,
    root_cause_hypothesis: theme.root_cause_hypothesis,
    severity: theme.severity,
    business_meaning: theme.business_meaning,
    related_action_areas: theme.related_action_areas,
    theme_evidence: theme.theme_evidence,
    confidence: theme.confidence
  }));
}

function businessActionRows(analysis: AnalysisReport): Row[] {
  return analysis.business_actions.map((action) => normalizeRow({
    action_id: action.action_id,
    theme_id: action.theme_id,
    action_area: action.action_area,
    priority: action.priority,
    priority_score: action.priority_score,
    business_finding: action.business_finding,
    recommendation: action.recommendation,
    priority_reason: action.priority_reason,
    impact_metrics: action.impact_metrics,
    validation_method: action.validation_method,
    evidence: action.evidence,
    confidence: action.confidence
  }));
}

function normalizeRow(row: object): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, flattenCell(value)]));
}

function flattenCell(value: unknown): unknown {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return safeText(value.map((item) => String(flattenCell(item))).join("; "));
  if (typeof value === "object") return safeText(JSON.stringify(value));
  return safeText(String(value));
}

function safeText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error("Usage: export_review_coding_excel.ts <analysis.json> <review-coding.xlsx>");
    process.exit(1);
  }
  await exportReviewCodingExcelFile(input, output);
}
