import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORED_PREFIXES = [
  ".git/",
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  ".orbit/",
];

export function normalizeSafePath(rootDir: string, inputPath: string): string {
  const resolved = path.resolve(rootDir, inputPath);
  const relative = path.relative(rootDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Acces refuse hors du repo: ${inputPath}`);
  }

  return resolved;
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export type WalkOptions = {
  /** If provided, only files whose relative path matches this regex are included. */
  pattern?: RegExp;
  /** If provided, only include files accepted by this predicate (used for plugin filtering). */
  filter?: (absolutePath: string) => boolean;
};

export async function walkFiles(rootDir: string, dir = rootDir, result: string[] = [], options: WalkOptions = {}): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, "/");

    if (DEFAULT_IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
      continue;
    }

    if (entry.isDirectory()) {
      await walkFiles(rootDir, absolutePath, result, options);
      continue;
    }

    if (entry.isFile()) {
      if (options.filter && !options.filter(absolutePath)) continue;
      if (options.pattern && !options.pattern.test(relativePath)) continue;
      result.push(relativePath);
    }
  }

  return result;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
