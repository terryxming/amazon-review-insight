import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readText(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("version lifecycle", () => {
  it("keeps the working version line synchronized and freezes released versions", () => {
    const packageJson = JSON.parse(readText("../../../package.json"));
    const packageLock = JSON.parse(readText("../../../package-lock.json"));
    const skill = readText("../../SKILL.md");
    const lifecycle = readText("../../references/specs/version-lifecycle.md");
    const reportContract = readText("../../references/specs/report-contract.md");
    const checkpoints = JSON.parse(readText("../../checkpoints/checkpoints.json"));
    const changelog = readText("../../../CHANGELOG.md");
    const bdd = readText("../../references/features/report-generation.feature");

    expect(packageJson.version).toBe("0.3.2");
    expect(packageLock.version).toBe("0.3.2");
    expect(packageLock.packages[""].version).toBe("0.3.2");
    expect(skill).toContain("skill_version: v0.3.2");
    expect(skill).toContain("release_status: released");
    expect(reportContract).toContain("report_contract_version: v0.3.2");
    expect(checkpoints.version).toBe("v0.3.2");
    expect(changelog).toContain("## v0.3.2");
    expect(lifecycle).toContain("version_lifecycle_version: v0.3.2");
    expect(lifecycle).toContain("已发布版本必须冻结");
    expect(lifecycle).toContain("最新已发布版本：`v0.3.2`");
    expect(lifecycle).toContain("当前开发版本：无");
    expect(bdd).toContain("已发布版本冻结并通过新版本承载后续修改");
    expect(bdd).toContain("发布 v0.3.2 后，v0.3.2 必须进入冻结状态");
  });
});
