import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import analysis from "../fixtures/golden_analysis_single_asin.json" assert { type: "json" };
import { renderReportFile } from "../../scripts/render_report.js";
import { checkFiles } from "../../scripts/agent_contract_check.js";

describe("mock pipeline", () => {
  it("renders and contract-checks a report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ari-pipeline-"));
    try {
      const analysisPath = join(dir, "analysis.json");
      const reportPath = join(dir, "report.html");
      await writeFile(analysisPath, JSON.stringify(analysis), "utf8");
      await renderReportFile(analysisPath, reportPath);
      const html = await readFile(reportPath, "utf8");
      expect(html).toContain("VOC 主题地图");
      const result = await checkFiles(analysisPath, reportPath);
      expect(result.errors).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

