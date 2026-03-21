"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeBridgeService = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
class RuntimeBridgeService {
    rootDir;
    maxOutputChars;
    maxLogEntries;
    processes = new Map();
    nextId = 1;
    constructor(rootDir, options) {
        this.rootDir = node_path_1.default.resolve(rootDir);
        this.maxOutputChars = options?.maxOutputChars ?? 20_000;
        this.maxLogEntries = options?.maxLogEntries ?? 500;
    }
    async runCommand(command, cwd, timeoutMs) {
        const effectiveCwd = this.resolveCwd(cwd);
        const isWindows = process.platform === "win32";
        const shellCommand = isWindows ? `cmd /c ${command}` : command;
        const { stdout, stderr } = await exec(shellCommand, {
            cwd: effectiveCwd,
            maxBuffer: 10 * 1024 * 1024,
            timeout: timeoutMs ?? 60_000,
        });
        return {
            command,
            cwd: effectiveCwd,
            stdout: stdout.slice(0, this.maxOutputChars),
            stderr: stderr.slice(0, this.maxOutputChars),
        };
    }
    startProcess(command, cwd) {
        const effectiveCwd = this.resolveCwd(cwd);
        const id = `proc_${this.nextId++}`;
        const child = (0, node_child_process_1.spawn)(command, {
            cwd: effectiveCwd,
            shell: true,
            env: process.env,
            stdio: "pipe",
        });
        const record = {
            id,
            command,
            cwd: effectiveCwd,
            status: "running",
            startedAt: new Date().toISOString(),
            exitedAt: null,
            exitCode: null,
            signal: null,
            child,
            logs: [],
        };
        this.processes.set(id, record);
        this.pushLog(record, "system", `Process started: ${command}`);
        child.stdout.on("data", (chunk) => {
            this.pushChunk(record, "stdout", chunk.toString("utf8"));
        });
        child.stderr.on("data", (chunk) => {
            this.pushChunk(record, "stderr", chunk.toString("utf8"));
        });
        child.on("close", (code, signal) => {
            record.status = "exited";
            record.exitCode = code;
            record.signal = signal;
            record.exitedAt = new Date().toISOString();
            this.pushLog(record, "system", `Process exited with code ${code ?? "null"}${signal ? ` and signal ${signal}` : ""}`);
        });
        child.on("error", (error) => {
            this.pushLog(record, "system", `Process error: ${error.message}`);
        });
        return this.toSnapshot(record);
    }
    pruneExited() {
        for (const [id, record] of this.processes) {
            if (record.status === "exited") {
                this.processes.delete(id);
            }
        }
    }
    listProcesses() {
        return Array.from(this.processes.values())
            .map((record) => this.toSnapshot(record))
            .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
    }
    getProcess(processId) {
        const record = this.processes.get(processId);
        return record ? this.toSnapshot(record) : null;
    }
    readLogs(processId, limit, clearAfterRead) {
        const record = this.processes.get(processId);
        if (!record) {
            throw new Error(`Processus introuvable: ${processId}`);
        }
        const logs = typeof limit === "number"
            ? record.logs.slice(-limit)
            : [...record.logs];
        if (clearAfterRead) {
            record.logs.length = 0;
        }
        return {
            process: this.toSnapshot(record),
            count: logs.length,
            logs,
        };
    }
    getGlobalRecentLogs(limit = 50, filter) {
        const allLogs = [];
        for (const [id, record] of this.processes) {
            for (const log of record.logs) {
                allLogs.push({ ...log, processId: id, command: record.command });
            }
        }
        allLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        let result = allLogs;
        if (filter === "errors") {
            result = allLogs.filter((log) => log.source === "stderr" || /error|exception|fail/i.test(log.text));
        }
        else if (filter === "warnings") {
            result = allLogs.filter((log) => /warn|warning/i.test(log.text));
        }
        return result.slice(-limit);
    }
    stopProcess(processId, signal = "SIGTERM") {
        const record = this.processes.get(processId);
        if (!record) {
            throw new Error(`Processus introuvable: ${processId}`);
        }
        if (record.status === "running") {
            record.child.kill(signal);
            this.pushLog(record, "system", `Stop requested with signal ${signal}`);
        }
        return this.toSnapshot(record);
    }
    resolveCwd(cwd) {
        const resolved = cwd ? node_path_1.default.resolve(this.rootDir, cwd) : this.rootDir;
        const relative = node_path_1.default.relative(this.rootDir, resolved);
        if (relative.startsWith("..") || node_path_1.default.isAbsolute(relative)) {
            throw new Error(`Acces refuse hors du repo: ${cwd}`);
        }
        return resolved;
    }
    pushChunk(record, source, chunk) {
        const lines = chunk.split(/\r?\n/).filter((line) => line.trim().length > 0);
        for (const line of lines) {
            this.pushLog(record, source, line);
        }
    }
    pushLog(record, source, text) {
        record.logs.push({
            source,
            text: text.slice(0, this.maxOutputChars),
            timestamp: new Date().toISOString(),
        });
        if (record.logs.length > this.maxLogEntries) {
            record.logs.shift();
        }
    }
    toSnapshot(record) {
        return {
            id: record.id,
            command: record.command,
            cwd: record.cwd,
            status: record.status,
            startedAt: record.startedAt,
            exitedAt: record.exitedAt,
            exitCode: record.exitCode,
            signal: record.signal,
        };
    }
}
exports.RuntimeBridgeService = RuntimeBridgeService;
