import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanPath } from "../../scripts/secret_scan.js";

describe("secret scan", () => {
  it("detects Sorftime key shaped values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ari-secret-"));
    try {
      const fakeKey = ["abc123", "456789", "xyz"].join("");
      await writeFile(join(dir, "bad.env"), `SORFTIME_MCP_KEY=${fakeKey}`, "utf8");
      const result = await scanPath(dir);
      expect(result.ok).toBe(false);
      expect(result.findings.length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
