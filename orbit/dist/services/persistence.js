"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistenceService = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const CACHE_DIR = ".orbit";
const CACHE_FILE = "index-cache.json";
const SCHEMA_VERSION = 1;
class PersistenceService {
    cacheFilePath;
    constructor(rootDir) {
        this.cacheFilePath = node_path_1.default.join(rootDir, CACHE_DIR, CACHE_FILE);
    }
    async saveIndex(index) {
        await promises_1.default.mkdir(node_path_1.default.dirname(this.cacheFilePath), { recursive: true });
        const envelope = { schemaVersion: SCHEMA_VERSION, index };
        await promises_1.default.writeFile(this.cacheFilePath, JSON.stringify(envelope), "utf8");
    }
    async loadIndex() {
        try {
            const raw = await promises_1.default.readFile(this.cacheFilePath, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed.schemaVersion !== SCHEMA_VERSION || !parsed.index)
                return null;
            return parsed.index;
        }
        catch {
            return null;
        }
    }
    async clearCache() {
        try {
            await promises_1.default.unlink(this.cacheFilePath);
        }
        catch {
            // Pas de cache à supprimer.
        }
    }
    getCacheFilePath() {
        return this.cacheFilePath;
    }
}
exports.PersistenceService = PersistenceService;
