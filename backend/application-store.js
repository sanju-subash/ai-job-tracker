import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

export function createApplicationStore(directory = process.env.DATA_DIR || path.join(process.cwd(), "data")) {
  const filename = path.join(directory, "applications.json");
  async function ensure() {
    await mkdir(directory, { recursive: true });
    try { await readFile(filename, "utf8"); }
    catch { await writeFile(filename, "[]", "utf8"); }
  }
  async function all() {
    await ensure();
    try {
      const value = JSON.parse(await readFile(filename, "utf8"));
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  async function save(items) {
    await ensure();
    const temporary = filename + ".tmp";
    await writeFile(temporary, JSON.stringify(items, null, 2), "utf8");
    await rename(temporary, filename);
  }
  return { all, save };
}
