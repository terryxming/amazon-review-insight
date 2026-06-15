import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  }

  for (const theme of analysis.voc_themes) {
    if (!theme.theme_id) errors.push("VOC 主题缺少 theme_id");
    if (!theme.theme_name) errors.push(`VOC 主题 ${theme.theme_id} 缺少 theme_name`);
    if (!theme.theme_evidence?.length) errors.push(`VOC 主题 ${theme.theme_id} 缺少 theme_evidence`);
    if (!theme.detail_reviews?.length) errors.push(`VOC 主题 ${theme.theme_id} 缺少详情页证据列表`);
    checkPercentage(`VOC 主题 ${theme.theme_id}`, theme.count, theme.sample_size, theme.percentage, errors);
    for (const review of theme.detail_reviews ?? []) {
      if (!review.text) errors.push(`主题 ${theme.theme_id} 的详情 Review 缺少完整原文`);
      if (!review.translation) errors.push(`主题 ${theme.theme_id} 的详情 Review 缺少完整中文翻译`);
      for (const term of review.highlight_terms ?? []) {
        if (term && !review.text.toLowerCase().includes(term.toLowerCase())) {
          errors.push(`主题 ${theme.theme_id} 高亮原文无法定位：${term}`);
        }
      }
      for (const term of review.translation_highlight_terms ?? []) {
        if (term && !review.translation.includes(term)) {
          errors.push(`主题 ${theme.theme_id} 高亮译文无法定位：${term}`);
        }
      }
    }
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
  if (!html.includes("<mark>")) errors.push("HTML 缺少黄色高亮 mark。");
  if (html.includes("SORFTIME_MCP_KEY")) errors.push("HTML 泄露 SORFTIME_MCP_KEY 字符串。");
  return { ok: errors.length === 0, errors, warnings: [] };
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

export async function checkFiles(analysisPath: string, htmlPath: string): Promise<ContractCheckResult> {
  const analysis = JSON.parse(await readFile(analysisPath, "utf8")) as AnalysisReport;
  const html = await readFile(htmlPath, "utf8");
  const a = checkAnalysis(analysis);
  const h = checkHtml(html);
  return { ok: a.ok && h.ok, errors: [...a.errors, ...h.errors], warnings: [...a.warnings, ...h.warnings] };
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const [, , analysisPath, htmlPath] = process.argv;
  if (!analysisPath || !htmlPath) {
    console.error("Usage: agent_contract_check.ts <analysis.json> <report.html>");
    process.exit(1);
  }
  const result = await checkFiles(analysisPath, htmlPath);
  for (const warning of result.warnings) console.warn(`[warn] ${warning}`);
  for (const error of result.errors) console.error(`[fail] ${error}`);
  process.exit(result.ok ? 0 : 1);
}
