import { describe, expect, it } from "vitest";
import { runLiveSmokePreflight } from "../../scripts/live_smoke.js";

describe("live smoke preflight", () => {
  it("skips optional live smoke when no Sorftime key is configured", () => {
    const result = runLiveSmokePreflight("B0DHPN1DMJ", false, {});
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("fails required live smoke when no Sorftime key is configured", () => {
    const result = runLiveSmokePreflight("B0DHPN1DMJ", true, {});
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(false);
  });
});
