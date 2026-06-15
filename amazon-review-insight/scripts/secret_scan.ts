import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const SECRET_PATTERNS = [
  /SORFTIME_MCP_KEY\s*=\s*[A-Za-z0-9_\-]{8,}/i,
  /sorftime[_-]?key["'\s:=]+[A-Za-z0-9_\-]{8,}/i,
  /sk-[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z\-_]{20,}/,
  /Bearer\s+[A-Za-z0-9_\-.]{20,}/i
];

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".ts", ".js", ".html", ".css", ".yml", ".yaml", ".env"]);

export interface SecretScanResult {
  ok: boolean;
  findings: string[];
}

export async function scanPath(target: string): Promise<SecretScanResult> {
  const findings: string[] = [];
  const files = await collectFiles(target);
  for (const file of files) {
    if (!isTextFile(file) && !isExcelFile(file)) continue;
    const text = isExcelFile(file) ? await readExcelText(file) : await readFile(file, "utf8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) findings.push(file);
    }
  }
  return { ok: findings.length === 0, findings };
}

async function collectFiles(target: string): Promise<string[]> {
  const info = await stat(target);
  if (info.isFile()) return [target];
  const out: string[] = [];
  for (const item of await readdir(target)) {
    if (["node_modules", ".git", "dist", "coverage"].includes(item)) continue;
    out.push(...await collectFiles(join(target, item)));
  }
  return out;
}

function isTextFile(file: string): boolean {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function isExcelFile(file: string): boolean {
  return file.toLowerCase().endsWith(".xlsx");
}

async function readExcelText(file: string): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const values: string[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => values.push(String(cell.value ?? "")));
    });
  });
  return values.join("\n");
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const target = process.argv[2] ?? ".";
  const result = await scanPath(target);
  for (const finding of result.findings) console.error(`[secret] ${finding}`);
  process.exit(result.ok ? 0 : 1);
}
