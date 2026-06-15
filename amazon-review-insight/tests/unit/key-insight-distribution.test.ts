import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" with { type: "json" };
import { checkAnalysis } from "../../scripts/agent_contract_check.js";

describe("key insight distribution contract", () => {
  it("requires distribution rows for every key insight", () => {
    const copy = structuredClone(analysis as any);
    copy.key_insights[0].distribution = [];
    const result = checkAnalysis(copy);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("关键结论 人群 缺少 distribution");
  });

  it("validates distribution percentages", () => {
    const copy = structuredClone(analysis as any);
    copy.key_insights[0].distribution[0].percentage = 99;
    const result = checkAnalysis(copy);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("关键结论 人群 / 分布 儿童和家庭成员 percentage"))).toBe(true);
  });
});
