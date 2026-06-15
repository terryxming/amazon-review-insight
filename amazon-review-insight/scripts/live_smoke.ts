import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidAsin } from "./core.js";

export interface LiveSmokeResult {
  ok: boolean;
  skipped: boolean;
  message: string;
}

export function runLiveSmokePreflight(asin = "B0DHPN1DMJ", required = false, env = process.env): LiveSmokeResult {
  if (!isValidAsin(asin)) {
    return { ok: false, skipped: false, message: `Invalid ASIN: ${asin}` };
  }

  if (!env.SORFTIME_MCP_KEY) {
    return {
      ok: !required,
      skipped: !required,
      message: "SORFTIME_MCP_KEY is not set. Run live Sorftime MCP calls from an MCP-enabled Codex release environment."
    };
  }

  return {
    ok: true,
    skipped: false,
    message: `Ready for Sorftime MCP live smoke with ASIN ${asin}. In the MCP-enabled agent, call product_detail and product_reviews with amzSite=US, reviewType=Both.`
  };
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const asin = process.argv[2] ?? "B0DHPN1DMJ";
  const required = process.argv.includes("--required");
  const result = runLiveSmokePreflight(asin, required);
  const prefix = result.ok ? (result.skipped ? "[skip]" : "[pass]") : "[fail]";
  const writer = result.ok ? console.log : console.error;
  writer(`${prefix} ${result.message}`);
  process.exit(result.ok ? 0 : 1);
}
