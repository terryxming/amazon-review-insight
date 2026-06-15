import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" assert { type: "json" };
import { checkAnalysis } from "../../scripts/agent_contract_check.js";

describe("agent contract check", () => {
  it("accepts the golden single ASIN analysis", () => {
    const result = checkAnalysis(analysis as any);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

