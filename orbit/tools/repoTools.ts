import { exec as execCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RepoIndexer } from "../services/repoIndexer.js";
import { json, ok } from "../utils/mcpResponses.js";
import { escapeRegExp, normalizeSafePath, pathExists, walkFiles } from "../utils/repoFs.js";

const exec = promisify(execCallback);

const RG_IGNORED = ["node_modules", "dist", "build", ".next", "coverage", ".orbit", ".git"];

type SearchResult = { filePath: string; line: number; preview: string };

async function searchWithRipgrep(
  rootDir: string,
  query: string,
  isRegex: boolean,
  caseSensitive: boolean,
  hardLimit: number,
): Promise<SearchResult[] | null> {
  try {
    const flags = [
      "--line-number",
      "--no-heading",
      "--with-filename",
      caseSensitive ? "--case-sensitive" : "--ignore-case",
      isRegex ? "--regexp" : "--fixed-strings",
      ...RG_IGNORED.flatMap((d) => ["--glob", `!${d}`]),
      "--max-count",
      String(hardLimit),
    ];

    const escaped = query.replace(/'/g, "'\\''");
    const cmd = `rg ${flags.join(" ")} '${escaped}' .`;
    const { stdout } = await exec(cmd, { cwd: rootDir, maxBuffer: 5 * 1024 * 1024 });

    const results: SearchResult[] = [];
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) continue;
      results.push({
        filePath: match[1].replace(/\\/g, "/"),
        line: parseInt(match[2], 10),
        preview: match[3].trim(),
      });
      if (results.length >= hardLimit) break;
    }
    return results;
  } catch (err: unknown) {
    // rg exits with code 1 when no matches found — that's a valid empty result.
    const exitCode = (err as NodeJS.ErrnoException & { code?: number }).code;
    if (exitCode === 1) return [];
    // rg not found or other error — fall back to JS search.
    return null;
  }
}

async function searchWithJs(
  rootDir: string,
  query: string,
  isRegex: boolean,
  caseSensitive: boolean,
  hardLimit: number,
): Promise<SearchResult[]> {
  const files = await walkFiles(rootDir);
  const flags = caseSensitive ? "g" : "gi";
  const pattern = isRegex ? query : escapeRegExp(query);
  const re = new RegExp(pattern, flags);
  const results: SearchResult[] = [];

  for (const filePath of files) {
    if (results.length >= hardLimit) break;
    const absolutePath = normalizeSafePath(rootDir, filePath);
    try {
      const content = await fs.readFile(absolutePath, "utf8");
      for (const [index, lineText] of content.split(/\r?\n/).entries()) {
        re.lastIndex = 0;
        if (re.test(lineText)) {
          results.push({ filePath, line: index + 1, preview: lineText.trim() });
          if (results.length >= hardLimit) break;
        }
      }
    } catch {
      // Skip non-UTF-8 files.
    }
  }
  return results;
}

type RegisterRepoToolsOptions = {
  rootDir: string;
  maxFileSizeBytes: number;
  repoIndexer?: RepoIndexer;
};

export function registerRepoTools(server: McpServer, options: RegisterRepoToolsOptions) {
  server.registerTool(
    "repo_list_files",
    {
      title: "List repo files",
      description: "Liste les fichiers du depot en ignorant les dossiers volumineux et generes.",
      inputSchema: {
        limit: z.number().int().positive().max(10_000).optional(),
        pattern: z.string().optional().describe("Regex pattern to filter file paths (e.g. '\\.ts$' or '^src/')"),
      },
    },
    async ({ limit, pattern }) => {
      const patternRegex = pattern ? new RegExp(pattern) : undefined;
      const files = await walkFiles(options.rootDir, options.rootDir, [], { pattern: patternRegex });
      const output = typeof limit === "number" ? files.slice(0, limit) : files;

      return json({
        rootDir: options.rootDir,
        total: files.length,
        returned: output.length,
        files: output,
      });
    }
  );

  server.registerTool(
    "repo_read_file",
    {
      title: "Read file",
      description: "Lit un fichier texte du depot.",
      inputSchema: {
        filePath: z.string().min(1),
      },
    },
    async ({ filePath }) => {
      const absolutePath = normalizeSafePath(options.rootDir, filePath);

      if (!(await pathExists(absolutePath))) {
        throw new Error(`Fichier introuvable: ${filePath}`);
      }

      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        throw new Error(`Ce chemin n'est pas un fichier: ${filePath}`);
      }

      if (stats.size > options.maxFileSizeBytes) {
        throw new Error(
          `Fichier trop volumineux (${stats.size} octets). Limite: ${options.maxFileSizeBytes}.`
        );
      }

      const content = await fs.readFile(absolutePath, "utf8");

      return json({
        filePath: filePath.replace(/\\/g, "/"),
        size: stats.size,
        content,
      });
    }
  );

  server.registerTool(
    "repo_write_file",
    {
      title: "Write file",
      description: "Ecrit completement un fichier texte dans le depot.",
      inputSchema: {
        filePath: z.string().min(1),
        content: z.string(),
        createDirectories: z.boolean().optional(),
      },
    },
    async ({ filePath, content, createDirectories }) => {
      const absolutePath = normalizeSafePath(options.rootDir, filePath);

      if (createDirectories) {
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      }

      await fs.writeFile(absolutePath, content, "utf8");

      // Keep the structural index in sync after a write (fire-and-forget).
      options.repoIndexer?.refreshFile(filePath).catch(() => undefined);

      return ok(`Fichier ecrit avec succes: ${filePath.replace(/\\/g, "/")}`);
    }
  );

  server.registerTool(
    "repo_delete_file",
    {
      title: "Delete file",
      description: "Supprime un fichier du depot.",
      inputSchema: {
        filePath: z.string().min(1),
      },
    },
    async ({ filePath }) => {
      const absolutePath = normalizeSafePath(options.rootDir, filePath);

      if (!(await pathExists(absolutePath))) {
        throw new Error(`Fichier introuvable: ${filePath}`);
      }

      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        throw new Error(`Ce chemin n'est pas un fichier: ${filePath}`);
      }

      await fs.unlink(absolutePath);
      return ok(`Fichier supprime: ${filePath.replace(/\\/g, "/")}`);
    }
  );

  server.registerTool(
    "repo_move_file",
    {
      title: "Move / rename file",
      description: "Deplace ou renomme un fichier dans le depot.",
      inputSchema: {
        sourcePath: z.string().min(1),
        destPath: z.string().min(1),
        createDirectories: z.boolean().optional(),
      },
    },
    async ({ sourcePath, destPath, createDirectories }) => {
      const absoluteSource = normalizeSafePath(options.rootDir, sourcePath);
      const absoluteDest = normalizeSafePath(options.rootDir, destPath);

      if (!(await pathExists(absoluteSource))) {
        throw new Error(`Fichier source introuvable: ${sourcePath}`);
      }

      if (createDirectories) {
        await fs.mkdir(path.dirname(absoluteDest), { recursive: true });
      }

      await fs.rename(absoluteSource, absoluteDest);
      return ok(`Fichier deplace: ${sourcePath.replace(/\\/g, "/")} → ${destPath.replace(/\\/g, "/")}`);
    }
  );

  server.registerTool(
    "repo_search_text",
    {
      title: "Search text",
      description: "Recherche un texte exact ou une regex dans les fichiers du depot.",
      inputSchema: {
        query: z.string().min(1),
        regex: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        maxResults: z.number().int().positive().max(500).optional(),
      },
    },
    async ({ query, regex, caseSensitive, maxResults }) => {
      const hardLimit = maxResults ?? 100;
      const isRegex = Boolean(regex);
      const isCaseSensitive = Boolean(caseSensitive);

      const rgResults = await searchWithRipgrep(options.rootDir, query, isRegex, isCaseSensitive, hardLimit);
      const results = rgResults ?? await searchWithJs(options.rootDir, query, isRegex, isCaseSensitive, hardLimit);

      return json({
        query,
        regex: isRegex,
        caseSensitive: isCaseSensitive,
        engine: rgResults !== null ? "ripgrep" : "js",
        count: results.length,
        results,
      });
    }
  );
}
