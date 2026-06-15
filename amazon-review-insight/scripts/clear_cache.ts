import { rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function clearCache(root = process.cwd()): Promise<{ deleted: boolean; path: string }> {
  const cachePath = resolve(root, ".cache", "asin-review-insight");
  if (!cachePath.endsWith(resolve(root, ".cache", "asin-review-insight"))) {
    throw new Error("Refusing to clear unexpected cache path.");
  }
  try {
    await stat(cachePath);
  } catch {
    return { deleted: false, path: cachePath };
  }
  await rm(cachePath, { recursive: true, force: true });
  return { deleted: true, path: cachePath };
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const result = await clearCache();
  console.log(result.deleted ? `Deleted ${result.path}` : `No cache at ${result.path}`);
}
