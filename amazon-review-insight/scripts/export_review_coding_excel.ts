import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { AnalysisReport } from "./core.js";

type Row = Record<string, unknown>;

const SHEET_COLUMNS: Record<string, { header: string; key: string; width: number }[]> = {
  metadata: [
    { header: "key", key: "key", width: 28 },
    { header: "value", key: "value", width: 72 }
  ],
  normalized_reviews: [
    { header: "review_index", key: "review_index", width: 14 },
    { header: "asin", key: "asin", width: 14 },
    { header: "variant", key: "variant", width: 24 },
    { header: "review_date", key: "review_date", width: 14 },
    { header: "rating", key: "rating", width: 10 },
    { header: "title", key: "title", width: 30 },
    { header: "text", key: "text", width: 80 },
    { header: "raw_json", key: "raw_json", width: 48 }
  ],
  feedback_units: [
    { header: "feedback_unit_id", key: "feedback_unit_id", width: 24 },
    { header: "review_index", key: "review_index", width: 14 },
    { header: "dimension", key: "dimension", width: 16 },
    { header: "audience", key: "audience", width: 24 },
    { header: "scenario", key: "scenario", width: 24 },
    { header: "user_task", key: "user_task", width: 24 },
    { header: "purchase_reason", key: "purchase_reason", width: 24 },
    { header: "user_expectation", key: "user_expectation", width: 28 },
    { header: "expectation_source", key: "expectation_source", width: 22 },
    { header: "actual_experience", key: "actual_experience", width: 28 },
    { header: "satisfied_points", key: "satisfied_points", width: 28 },
    { header: "unsatisfied_points", key: "unsatisfied_points", width: 28 },
    { header: "consequence", key: "consequence", width: 24 },
    { header: "evidence", key: "evidence", width: 64 },
    { header: "open_tags", key: "open_tags", width: 36 },
    { header: "confidence", key: "confidence", width: 12 }
  ],
  open_tags: [
    { header: "tag_id", key: "tag_id", width: 28 },
    { header: "tag_name", key: "tag_name", width: 30 },
    { header: "dimension", key: "dimension", width: 16 },
    { header: "count", key: "count", width: 10 },
    { header: "sample_size", key: "sample_size", width: 12 },
    { header: "percentage", key: "percentage", width: 12 },
    { header: "representative_evidence", key: "representative_evidence", width: 64 },
    { header: "theme_ids", key: "theme_ids", width: 36 }
  ],
  key_insight_distribution: [
    { header: "dimension", key: "dimension", width: 16 },
    { header: "label", key: "label", width: 30 },
    { header: "review_count", key: "review_count", width: 12 },
    { header: "sample_size", key: "sample_size", width: 12 },
    { header: "percentage", key: "percentage", width: 12 },
    { header: "role", key: "role", width: 12 },
    { header: "reason", key: "reason", width: 54 },
    { header: "evidence", key: "evidence", width: 64 },
    { header: "theme_ids", key: "theme_ids", width: 36 }
  ],
  voc_themes: [
    { header: "theme_id", key: "theme_id", width: 32 },
    { header: "theme_name", key: "theme_name", width: 34 },
    { header: "theme_category", key: "theme_category", width: 24 },
    { header: "priority", key: "priority", width: 10 },
    { header: "count", key: "count", width: 10 },
    { header: "sample_size", key: "sample_size", width: 12 },
    { header: "percentage", key: "percentage", width: 12 },
    { header: "core_issue", key: "core_issue", width: 54 },
    { header: "root_cause_hypothesis", key: "root_cause_hypothesis", width: 54 },
    { header: "severity", key: "severity", width: 12 },
    { header: "business_meaning", key: "business_meaning", width: 54 },
    { header: "related_action_areas", key: "related_action_areas", width: 30 },
    { header: "theme_evidence", key: "theme_evidence", width: 64 },
    { header: "confidence", key: "confidence", width: 12 }
  ],
  business_actions: [
    { header: "action_id", key: "action_id", width: 30 },
    { header: "theme_id", key: "theme_id", width: 32 },
    { header: "action_area", key: "action_area", width: 16 },
    { header: "priority", key: "priority", width: 10 },
    { header: "priority_score", key: "priority_score", width: 14 },
    { header: "business_finding", key: "business_finding", width: 48 },
    { header: "recommendation", key: "recommendation", width: 64 },
    { header: "priority_reason", key: "priority_reason", width: 48 },
    { header: "impact_metrics", key: "impact_metrics", width: 36 },
    { header: "validation_method", key: "validation_method", width: 36 },
    { header: "evidence", key: "evidence", width: 64 },
    { header: "confidence", key: "confidence", width: 12 }
  ],
  checkpoints: [
    { header: "id", key: "id", width: 26 },
    { header: "name", key: "name", width: 24 },
    { header: "status", key: "status", width: 12 },
    { header: "message", key: "message", width: 64 }
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
  addSheet(workbook, "metadata", metadataRows(analysis));
  addSheet(workbook, "normalized_reviews", normalizedReviewRows(analysis));
  addSheet(workbook, "feedback_units", (analysis.feedback_units ?? []).map(normalizeRow));
  addSheet(workbook, "open_tags", (analysis.open_tags ?? []).map(normalizeRow));
  addSheet(workbook, "key_insight_distribution", keyInsightDistributionRows(analysis));
  addSheet(workbook, "voc_themes", vocThemeRows(analysis));
  addSheet(workbook, "business_actions", businessActionRows(analysis));
  addSheet(workbook, "checkpoints", analysis.checkpoints.map(normalizeRow));
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
    { key: "asin", value: analysis.metadata.asin },
    { key: "site", value: analysis.metadata.site },
    { key: "data_source", value: analysis.metadata.data_source },
    { key: "generated_at", value: analysis.metadata.generated_at },
    { key: "review_sample_size", value: analysis.metadata.review_sample_size },
    { key: "asin_total_review_count", value: analysis.metadata.asin_total_review_count },
    { key: "product_rating", value: analysis.metadata.product_rating ?? "unknown" },
    { key: "workbook_contract", value: "review_coding_excel_v0.2.0" }
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
