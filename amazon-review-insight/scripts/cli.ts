#!/usr/bin/env node
import { renderReportFile } from "./render_report.js";
import { checkFiles } from "./agent_contract_check.js";
import { scanPath } from "./secret_scan.js";
import { clearCache } from "./clear_cache.js";
import { runLiveSmokePreflight } from "./live_smoke.js";
import { exportReviewCodingExcelFile } from "./export_review_coding_excel.js";

const [, , command, ...args] = process.argv;

async function main(): Promise<void> {
  if (command === "render") {
    await renderReportFile(required(args[0], "analysis.json"), required(args[1], "report.html"));
    return;
  }
  if (command === "contract-check") {
    const result = await checkFiles(required(args[0], "analysis.json"), required(args[1], "report.html"), args[2]);
    for (const warning of result.warnings) console.warn(`[warn] ${warning}`);
    for (const error of result.errors) console.error(`[fail] ${error}`);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === "export-excel") {
    await exportReviewCodingExcelFile(required(args[0], "analysis.json"), required(args[1], "review-coding.xlsx"));
    return;
  }
  if (command === "secret-scan") {
    const result = await scanPath(args[0] ?? ".");
    for (const finding of result.findings) console.error(`[secret] ${finding}`);
    process.exit(result.ok ? 0 : 1);
  }
  if (command === "cache-clear") {
    const result = await clearCache();
    console.log(result.deleted ? `Deleted ${result.path}` : `No cache at ${result.path}`);
    return;
  }
  if (command === "live-smoke") {
    const result = runLiveSmokePreflight(args[0] ?? "B0DHPN1DMJ", args.includes("--required"));
    const prefix = result.ok ? (result.skipped ? "[skip]" : "[pass]") : "[fail]";
    const writer = result.ok ? console.log : console.error;
    writer(`${prefix} ${result.message}`);
    process.exit(result.ok ? 0 : 1);
  }
  console.log("Usage: amazon-review-insight <render|export-excel|contract-check|secret-scan|cache-clear|live-smoke> ...args");
  process.exit(1);
}

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}

await main();
