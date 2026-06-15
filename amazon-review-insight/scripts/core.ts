export type Unknown = "unknown";

export interface NormalizedReview {
  asin: string;
  variant: string | Unknown;
  review_date: string | Unknown;
  rating: number | Unknown;
  title: string;
  text: string;
  raw: Record<string, unknown>;
}

export interface ProductDetail {
  asin: string;
  title?: string;
  rating?: number;
  asin_total_review_count?: number;
  brand?: string;
  price?: string;
  raw_text: string;
  raw_fields: Record<string, string>;
}

export interface FeedbackUnit {
  feedback_unit_id: string;
  review_index: number;
  dimension: string;
  audience: string | Unknown;
  scenario: string | Unknown;
  user_task: string | Unknown;
  purchase_reason: string | Unknown;
  user_expectation: string | Unknown;
  expectation_source: string | Unknown;
  actual_experience: string | Unknown;
  satisfied_points: string | Unknown;
  unsatisfied_points: string | Unknown;
  consequence: string | Unknown;
  evidence: string;
  open_tags: string[];
  confidence: "high" | "medium" | "low";
}

export interface OpenTag {
  tag_id: string;
  tag_name: string;
  dimension: string;
  count: number;
  sample_size: number;
  percentage: number;
  representative_evidence: string[];
  theme_ids: string[];
}

export interface KeyInsightDistributionItem {
  label: string;
  review_count: number;
  sample_size: number;
  percentage: number;
  role: "primary" | "secondary" | "emerging" | "long_tail" | "unknown";
  reason: string;
  evidence: string[];
  theme_ids: string[];
}

export interface KeyInsight {
  dimension: string;
  insight: string;
  summary?: string;
  count: number;
  sample_size: number;
  percentage: number;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  theme_ids: string[];
  implication: string;
  business_implication?: string;
  distribution?: KeyInsightDistributionItem[];
}

export type EvidenceType = "positive" | "negative" | "opportunity" | "context";

export interface EvidenceSentence {
  original: string;
  translation: string;
  evidence_type: EvidenceType;
  target?: string;
}

export interface ThemeDetailReview {
  review_index: number;
  rating: number | Unknown;
  review_date: string | Unknown;
  title: string;
  text: string;
  translation: string;
  evidence_sentences: EvidenceSentence[];
}

export interface ThemeViewpoint {
  viewpoint_id: string;
  viewpoint_name: string;
  viewpoint_polarity: "positive" | "negative" | "mixed" | "neutral";
  review_count: number;
  sample_size: number;
  percentage: number;
  role: "primary" | "secondary" | "emerging" | "long_tail" | "risk_signal" | "unknown";
  reason: string;
  tag_ids: string[];
  review_indexes: number[];
  evidence: string[];
  business_meaning: string;
  confidence: "high" | "medium" | "low";
  detail_reviews: ThemeDetailReview[];
}

export interface VocTheme {
  theme_id: string;
  theme_name: string;
  theme_category: string;
  priority: "P0" | "P1" | "P2";
  count: number;
  sample_size: number;
  percentage: number;
  core_issue: string;
  root_cause_hypothesis: string;
  severity: "high" | "medium" | "low";
  business_meaning: string;
  related_action_areas: string[];
  theme_evidence: string[];
  confidence: "high" | "medium" | "low";
  detail_reviews: ThemeDetailReview[];
  viewpoints?: ThemeViewpoint[];
}

export interface BusinessAction {
  action_id: string;
  theme_id: string;
  action_area: "product" | "listing" | "image_video";
  business_finding: string;
  recommendation: string | Record<string, unknown>;
  priority: "P0" | "P1" | "P2";
  priority_score: number;
  priority_reason: string;
  impact_metrics: string[];
  validation_method: string[];
  evidence: string[];
  confidence: "high" | "medium" | "low";
}

export interface CheckpointResult {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface AnalysisReport {
  metadata: {
    asin: string;
    site: "Amazon US";
    data_source: "Sorftime MCP";
    generated_at: string;
    review_sample_size: number;
    asin_total_review_count: number;
    product_rating?: number;
  };
  health?: ReturnType<typeof computeReviewHealth>;
  normalized_reviews?: NormalizedReview[];
  feedback_units?: FeedbackUnit[];
  open_tags?: OpenTag[];
  key_insights: KeyInsight[];
  voc_themes: VocTheme[];
  business_actions: BusinessAction[];
  checkpoints: CheckpointResult[];
  limitations: string[];
}

export const REQUIRED_KEY_INSIGHT_DIMENSIONS = [
  "人群",
  "场景",
  "用户任务",
  "购买理由",
  "用户期望",
  "实际体验",
  "满意点",
  "不满意点"
];

export function isValidAsin(value: string): boolean {
  return /^[A-Z0-9]{10}$/.test(value.trim());
}

export function extractMcpText(input: unknown): string {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const root = input as any;
    const text = root?.result?.content?.[0]?.text ?? root?.content?.[0]?.text ?? root?.text;
    if (typeof text === "string") return text;
  }
  throw new Error("Cannot extract MCP text from input.");
}

export function parseSorftimeReviews(input: unknown, asin: string): NormalizedReview[] {
  const text = extractMcpText(input);
  const parsed = JSON.parse(text) as Record<string, unknown>[];
  if (!Array.isArray(parsed)) throw new Error("product_reviews text must be a JSON array.");
  return dedupeReviews(parsed.map((item) => normalizeReview(item, asin)));
}

export function normalizeReview(item: Record<string, unknown>, asin: string): NormalizedReview {
  const rating = parseRating(item["评星"]);
  const date = parseReviewDate(item["评论日期"]);
  return {
    asin,
    variant: stringOrUnknown(item["评论产品的属性"]),
    review_date: date,
    rating,
    title: String(item["标题"] ?? ""),
    text: String(item["评论"] ?? ""),
    raw: item
  };
}

export function parseProductDetail(input: unknown, fallbackAsin: string): ProductDetail {
  const rawText = extractMcpText(input);
  const fields: Record<string, string> = {};
  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:：]+)\s*[:：]\s*(.*?)\s*$/);
    if (match) fields[match[1].trim()] = match[2].trim();
  }
  return {
    asin: fields["产品ASIN码"] || fallbackAsin,
    title: fields["标题"],
    rating: parseNumber(fields["星级"]),
    asin_total_review_count: parseInteger(fields["评论数"]),
    brand: fields["品牌"],
    price: fields["价格"],
    raw_text: rawText,
    raw_fields: fields
  };
}

export function parseReviewDate(value: unknown): string | Unknown {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return "unknown";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseRating(value: unknown): number | Unknown {
  const n = parseNumber(value);
  if (n === undefined || Number.isNaN(n)) return "unknown";
  return Math.round(n);
}

export function parseNumber(value: unknown): number | undefined {
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text) return undefined;
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

export function parseInteger(value: unknown): number | undefined {
  const n = parseNumber(value);
  return n === undefined ? undefined : Math.trunc(n);
}

export function stringOrUnknown(value: unknown): string | Unknown {
  const text = String(value ?? "").trim();
  return text ? text : "unknown";
}

export function dedupeReviews(reviews: NormalizedReview[]): NormalizedReview[] {
  const seen = new Set<string>();
  const out: NormalizedReview[] = [];
  for (const review of reviews) {
    const key = [review.review_date, review.rating, review.title, review.text].join("||");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(review);
    }
  }
  return out;
}

export function computeReviewHealth(reviews: NormalizedReview[], asinTotalReviewCount?: number) {
  const sampleSize = reviews.length;
  const starDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let ratingCount = 0;
  let ratingSum = 0;
  let textPresent = 0;
  let datePresent = 0;
  let latestReviewDate = "unknown";
  for (const review of reviews) {
    if (review.text.trim()) textPresent += 1;
    if (review.review_date !== "unknown") {
      datePresent += 1;
      if (latestReviewDate === "unknown" || review.review_date > latestReviewDate) latestReviewDate = review.review_date;
    }
    if (review.rating !== "unknown") {
      const star = String(Math.max(1, Math.min(5, Math.round(review.rating))));
      starDistribution[star] += 1;
      ratingCount += 1;
      ratingSum += Number(star);
    }
  }
  const positive = starDistribution["4"] + starDistribution["5"];
  const negative = starDistribution["1"] + starDistribution["2"] + starDistribution["3"];
  return {
    asin_total_review_count: asinTotalReviewCount ?? 0,
    review_sample_size: sampleSize,
    average_sample_rating: ratingCount ? round1(ratingSum / ratingCount) : 0,
    star_distribution: starDistribution,
    positive_count: positive,
    positive_percentage: percentage(positive, sampleSize),
    negative_count: negative,
    negative_percentage: percentage(negative, sampleSize),
    latest_review_date: latestReviewDate,
    text_presence_percentage: percentage(textPresent, sampleSize),
    date_presence_percentage: percentage(datePresent, sampleSize)
  };
}

export function percentage(count: number, sampleSize: number): number {
  if (!sampleSize) return 0;
  return Math.round((count / sampleSize) * 1000) / 10;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function highlightEvidenceSentences(text: string, evidenceSentences: EvidenceSentence[] = [], side: "original" | "translation"): string {
  const source = String(text ?? "");
  const ranges: Array<{ start: number; end: number; evidenceType: EvidenceType; target?: string }> = [];
  const candidates = evidenceSentences
    .map((item) => ({
      sentence: side === "original" ? item.original : item.translation,
      evidenceType: item.evidence_type,
      target: item.target
    }))
    .filter((item) => item.sentence.trim())
    .sort((a, b) => b.sentence.length - a.sentence.length);

  for (const candidate of candidates) {
    const pattern = new RegExp(escapeRegExp(candidate.sentence.trim()), "gi");
    for (const match of source.matchAll(pattern)) {
      const start = match.index ?? -1;
      const end = start + match[0].length;
      if (start < 0 || end <= start) continue;
      if (ranges.some((range) => start < range.end && end > range.start)) continue;
      ranges.push({ start, end, evidenceType: candidate.evidenceType, target: candidate.target });
    }
  }

  if (!ranges.length) return escapeHtml(source);
  ranges.sort((a, b) => a.start - b.start);
  let html = "";
  let cursor = 0;
  for (const range of ranges) {
    html += escapeHtml(source.slice(cursor, range.start));
    const targetAttr = range.target ? ` data-evidence-target="${escapeHtml(range.target)}"` : "";
    html += `<mark class="evidence-highlight evidence-${evidenceTypeClass(range.evidenceType)}" data-evidence-type="${escapeHtml(evidenceTypeLabel(range.evidenceType))}"${targetAttr}>${escapeHtml(source.slice(range.start, range.end))}</mark>`;
    cursor = range.end;
  }
  html += escapeHtml(source.slice(cursor));
  return html;
}

export function evidenceTypeLabel(type: EvidenceType): string {
  const labels: Record<EvidenceType, string> = {
    positive: "正向证据",
    negative: "负向证据",
    opportunity: "机会证据",
    context: "背景证据"
  };
  return labels[type] ?? "证据";
}

function evidenceTypeClass(type: EvidenceType): string {
  return ["positive", "negative", "opportunity", "context"].includes(type) ? type : "context";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function readJson<T>(text: string): T {
  return JSON.parse(text) as T;
}
