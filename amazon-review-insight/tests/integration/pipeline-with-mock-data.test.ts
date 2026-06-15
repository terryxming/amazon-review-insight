import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" with { type: "json" };
import { renderReportFile } from "../../scripts/render_report.js";
import { checkFiles } from "../../scripts/agent_contract_check.js";
import { exportReviewCodingExcelFile } from "../../scripts/export_review_coding_excel.js";

describe("mock pipeline", () => {
  it("renders and contract-checks a report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ari-pipeline-"));
    try {
      const analysisPath = join(dir, "analysis.json");
      const reportPath = join(dir, "report.html");
      const excelPath = join(dir, "review-coding.xlsx");
      await writeFile(analysisPath, JSON.stringify(analysis), "utf8");
      await renderReportFile(analysisPath, reportPath);
      await exportReviewCodingExcelFile(analysisPath, excelPath);
      const html = await readFile(reportPath, "utf8");
      expect(html).toContain("VOC 主题地图");
      expect(html).toContain("insight-distribution");
      const result = await checkFiles(analysisPath, reportPath, excelPath);
      expect(result.errors).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
