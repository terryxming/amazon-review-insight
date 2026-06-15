import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" with { type: "json" };
import { checkAnalysis } from "../../scripts/agent_contract_check.js";

describe("agent contract check", () => {
  it("accepts the golden single ASIN analysis", () => {
    const result = checkAnalysis(analysis as any);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects partial normalized_reviews coverage", () => {
    const copy = structuredClone(analysis as any);
    copy.normalized_reviews = copy.normalized_reviews.slice(0, 2);
    const result = checkAnalysis(copy);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("normalized_reviews 必须覆盖全部 Review 样本：期望 3 条，实际 2 条。");
  });

  it("rejects VOC themes without viewpoint drilldown", () => {
    const copy = structuredClone(analysis as any);
    delete copy.voc_themes[0].viewpoints;
    const result = checkAnalysis(copy);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("VOC 主题 theme_family_party 缺少 viewpoints");
  });

  it("rejects legacy keyword highlight fields", () => {
    const copy = structuredClone(analysis as any);
    copy.voc_themes[0].detail_reviews[0].highlight_terms = ["party"];
    const result = checkAnalysis(copy);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("不得继续保留 highlight_terms"))).toBe(true);
  });
});
