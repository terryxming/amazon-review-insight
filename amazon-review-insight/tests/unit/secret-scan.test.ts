import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { scanPath } from "../../scripts/secret_scan.js";

describe("secret scan", () => {
  it("detects Sorftime key shaped values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ari-secret-"));
    try {
      const fakeKey = ["abc123", "456789", "xyz"].join("");
      const envName = ["SORFTIME", "MCP", "KEY"].join("_");
      await writeFile(join(dir, "bad.env"), `${envName}=${fakeKey}`, "utf8");
      const result = await scanPath(dir);
      expect(result.ok).toBe(false);
      expect(result.findings.length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects secrets written into xlsx cells", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ari-secret-xlsx-"));
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("metadata");
      sheet.addRow(["key", "value"]);
      const envName = ["SORFTIME", "MCP", "KEY"].join("_");
      const fakeKey = ["abc123", "456789", "xyz"].join("");
      sheet.addRow([envName, `${envName}=${fakeKey}`]);
      await workbook.xlsx.writeFile(join(dir, "bad.xlsx"));
      const result = await scanPath(dir);
      expect(result.ok).toBe(false);
      expect(result.findings.some((finding) => finding.endsWith("bad.xlsx"))).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
