import fs from "node:fs/promises";
import path from "node:path";
import type { RepoIndex } from "./repoIndexer.js";

const CACHE_DIR = ".orbit";
const CACHE_FILE = "index-cache.json";
const SCHEMA_VERSION = 1;

type CacheEnvelope = {
  schemaVersion: number;
  index: RepoIndex;
};

export class PersistenceService {
  private readonly cacheFilePath: string;

  constructor(rootDir: string) {
    this.cacheFilePath = path.join(rootDir, CACHE_DIR, CACHE_FILE);
  }

  async saveIndex(index: RepoIndex): Promise<void> {
    await fs.mkdir(path.dirname(this.cacheFilePath), { recursive: true });
    const envelope: CacheEnvelope = { schemaVersion: SCHEMA_VERSION, index };
    await fs.writeFile(this.cacheFilePath, JSON.stringify(envelope), "utf8");
  }

  async loadIndex(): Promise<RepoIndex | null> {
    try {
      const raw = await fs.readFile(this.cacheFilePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<CacheEnvelope>;
      if (parsed.schemaVersion !== SCHEMA_VERSION || !parsed.index) return null;
      return parsed.index;
    } catch {
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await fs.unlink(this.cacheFilePath);
    } catch {
      // Pas de cache à supprimer.
    }
  }

  getCacheFilePath(): string {
    return this.cacheFilePath;
  }
}
