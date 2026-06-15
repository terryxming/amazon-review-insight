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
});
