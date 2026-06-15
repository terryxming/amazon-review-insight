import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" with { type: "json" };
import { checkExcelFile } from "../../scripts/agent_contract_check.js";
import { buildReviewCodingWorkbook, exportReviewCodingExcelFile } from "../../scripts/export_review_coding_excel.js";

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
      expect(workbook.getWorksheet("Review编码层")?.rowCount).toBeGreaterThan(1);
      expect(workbook.getWorksheet("关键结论分布")?.rowCount).toBeGreaterThan(8);
      expect(workbook.getWorksheet("VOC主题观点")?.rowCount).toBeGreaterThan(1);
      expect(workbook.getWorksheet("VOC观点评论明细")?.rowCount).toBeGreaterThan(1);
      const headers = (workbook.getWorksheet("Review编码层")?.getRow(1).values as unknown[]).filter(Boolean);
      expect(headers.slice(0, 5)).toEqual(["ASIN", "评论日期", "星级", "title", "text"]);
      expect(headers.slice(5, 16)).toEqual([
        "原Review序号",
        "反馈点序号",
        "编码单元ID",
        "本行编码维度",
        "本行反馈极性",
        "本行反馈点",
        "本行开放标签",
        "开放标签ID",
        "关联主题ID",
        "证据原文",
        "结果/影响"
      ]);
      const firstDataRow = workbook.getWorksheet("Review编码层")?.getRow(2).values as unknown[];
      expect(firstDataRow[7]).toBe(1);
      expect(String(firstDataRow[11])).not.toBe("");
      expect(String(firstDataRow[12])).not.toBe("");
      const viewpointHeaders = (workbook.getWorksheet("VOC主题观点")?.getRow(1).values as unknown[]).filter(Boolean);
      expect(viewpointHeaders.slice(0, 5)).toEqual(["主题ID", "主题名称", "观点ID", "观点名称", "观点极性"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects partial normalized review coverage", () => {
    const copy = structuredClone(analysis as any);
    copy.normalized_reviews = copy.normalized_reviews.slice(0, 2);
    expect(() => buildReviewCodingWorkbook(copy)).toThrow("normalized_reviews must cover the full Review sample: expected 3, got 2.");
  });
});
