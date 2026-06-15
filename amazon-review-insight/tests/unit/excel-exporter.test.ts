import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" with { type: "json" };
import { checkExcelFile } from "../../scripts/agent_contract_check.js";
import { exportReviewCodingExcelFile } from "../../scripts/export_review_coding_excel.js";

describe("review coding Excel exporter", () => {
  it("exports required sheets and key insight distribution rows", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ari-excel-"));
    try {
      const analysisPath = join(dir, "analysis.json");
      const excelPath = join(dir, "review-coding.xlsx");
      await writeFile(analysisPath, JSON.stringify(analysis), "utf8");
      await exportReviewCodingExcelFile(analysisPath, excelPath);

      const contract = await checkExcelFile(excelPath);
      expect(contract.errors).toEqual([]);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      expect(workbook.getWorksheet("feedback_units")?.rowCount).toBeGreaterThan(1);
      expect(workbook.getWorksheet("key_insight_distribution")?.rowCount).toBeGreaterThan(8);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
