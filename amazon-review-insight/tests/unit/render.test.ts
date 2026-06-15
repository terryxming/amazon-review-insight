import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" with { type: "json" };
import { renderReport } from "../../scripts/render_report.js";
import { checkHtml } from "../../scripts/agent_contract_check.js";

describe("report renderer", () => {
  it("renders required sections and highlighted theme details", async () => {
    const html = await renderReport(analysis as any);
    expect(html).toContain("id=\"scope\"");
    expect(html).toContain("id=\"voc-theme-map\"");
    expect(html).toContain("theme-detail-theme_family_party");
    expect(html).toContain("<mark>");
    const result = checkHtml(html);
    expect(result.errors).toEqual([]);
  });
});

