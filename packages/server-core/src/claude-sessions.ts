import { existsSync } from "node:fs";
import {
	appendFile,
	copyFile,
	mkdir,
	readdir,
	readFile,
	stat,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

/**
 * Import native `claude` CLI sessions into a Papyrus Workspace.
 *
 * Claude Code stores every session it runs as a JSONL transcript under
 * `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`. Papyrus itself never
 * ran those sessions (the user ran `claude` directly outside the app), so there
 * is no DB row, tab, or memory for them. This module is the Electron-free core
 * that (1) discovers those transcripts grouped by the repo they ran in,
 * (2) parses Claude Code's JSONL schema into a normalized message list, and
 * (3) binds a chosen session to an existing Workspace's worktree so it lives in
 * and is managed from that environment going forward.
 *
 * It is deliberately DB-free and Electron-free: callers (the papyrus-server
 * router and, per #28, the desktop router) resolve a Workspace to its worktree
 * path + agent-home dirs using their own local-db instance and hand those paths
 * in. That keeps this module unit-testable and shared across both apps.
 */

/** Root of Claude Code's per-project session store. */
export function getClaudeProjectsRoot(): string {
	return join(homedir(), ".claude", "projects");
}

/**
 * Encode an absolute repo/worktree path to Claude Code's project-dir name.
 * Claude replaces every non-alphanumeric, non-dash character with `-`
 * (so `C:\Users\me\proj` -> `C--Users-me-proj`). This is the same transform the
 * desktop's `logSession`/`listClaudeSessions` procedures already use, and it is
 * how a Workspace's worktree maps to its `~/.claude/projects/<dir>` bucket.
 */
export function encodeClaudeProjectDir(repoPath: string): string {
	return repoPath.replace(/[^a-zA-Z0-9-]/g, "-");
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface ClaudeSessionSummary {
	/** Session UUID (the `.jsonl` filename without extension). */
	sessionId: string;
	/** Absolute path to the source transcript. */
	filePath: string;
	/** The `~/.claude/projects` sub-directory this session lives under. */
	projectDir: string;
	/** Absolute cwd the session ran in (authoritative repo path), if recorded. */
	cwd: string | null;
	/** Git branch the session ran on, if recorded. */
	gitBranch: string | null;
	/** Claude Code version that wrote the transcript, if recorded. */
	version: string | null;
	/** Best display title: user custom title > AI-generated title > null. */
	title: string | null;
	/** First real user prompt (command/meta noise skipped), truncated. */
	firstPrompt: string | null;
	/** Count of real user + assistant messages (meta/command lines excluded). */
	messageCount: number;
	/** File mtime in epoch ms (for "most recent" sorting). */
	lastModified: number;
	/** File size in bytes. */
	size: number;
}

/** Sessions grouped by the repo (cwd) they originally ran in. */
export interface ClaudeRepoSessions {
	/** Originating repo path (cwd). Falls back to the encoded dir when unknown. */
	repoPath: string;
	/** Sessions for this repo, most-recently-modified first. */
	sessions: ClaudeSessionSummary[];
}

const PROMPT_PREVIEW_LEN = 200;

/** Pull the leading text out of a user/assistant message's content. */
function contentToText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (block && typeof block === "object" && "type" in block) {
			const b = block as { type: string; text?: unknown };
			if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
		}
	}
	return parts.join("\n");
}

/** A user line that is command/caveat plumbing, not something the user typed. */
function isNoiseUserText(text: string): boolean {
	const t = text.trimStart();
	return (
		t.length === 0 ||
		t.startsWith("<command-") ||
		t.startsWith("<local-command-") ||
		t.startsWith("<user-memory") ||
		t.startsWith("Caveat:")
	);
}

/** Read one transcript's summary metadata without materializing the whole thing. */
async function readSessionSummary(
	filePath: string,
	projectDir: string,
): Promise<ClaudeSessionSummary | null> {
	let raw: string;
	let stats: Awaited<ReturnType<typeof stat>>;
	try {
		stats = await stat(filePath);
		raw = await readFile(filePath, "utf8");
	} catch {
		return null;
	}

	const summary: ClaudeSessionSummary = {
		sessionId: basename(filePath).replace(/\.jsonl$/, ""),
		filePath,
		projectDir,
		cwd: null,
		gitBranch: null,
		version: null,
		title: null,
		firstPrompt: null,
		messageCount: 0,
		lastModified: stats.mtimeMs,
		size: stats.size,
	};
	let aiTitle: string | null = null;
	let customTitle: string | null = null;

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		let record: Record<string, unknown>;
		try {
			record = JSON.parse(trimmed);
		} catch {
			continue;
		}
		const type = record.type;

		if (summary.cwd == null && typeof record.cwd === "string") {
			summary.cwd = record.cwd;
		}
		if (summary.gitBranch == null && typeof record.gitBranch === "string") {
			summary.gitBranch = record.gitBranch;
		}
		if (summary.version == null && typeof record.version === "string") {
			summary.version = record.version;
		}
		if (type === "ai-title" && typeof record.aiTitle === "string") {
			aiTitle = record.aiTitle;
		}
		if (type === "custom-title" && typeof record.customTitle === "string") {
			customTitle = record.customTitle;
		}
		if (type === "user" || type === "assistant") {
			if (record.isMeta === true) continue;
			const message = record.message as { content?: unknown } | undefined;
			const text = contentToText(message?.content);
			if (type === "user" && isNoiseUserText(text)) continue;
			summary.messageCount++;
			if (
				type === "user" &&
				summary.firstPrompt == null &&
				text.trim().length > 0
			) {
				summary.firstPrompt = text.trim().slice(0, PROMPT_PREVIEW_LEN);
			}
		}
	}

	summary.title = customTitle ?? aiTitle;
	return summary;
}

/** List every `.jsonl` transcript under one `~/.claude/projects/<dir>`. */
async function listTranscriptFiles(projectPath: string): Promise<string[]> {
	try {
		const entries = await readdir(projectPath);
		return entries
			.filter((name) => name.endsWith(".jsonl"))
			.map((name) => join(projectPath, name));
	} catch {
		return [];
	}
}

/**
 * Scan `~/.claude/projects/**\/*.jsonl`, grouped by the repo each session ran
 * in. Grouping keys on the transcript's recorded `cwd` (authoritative) rather
 * than the lossy encoded dir name, so two repos that happen to encode alike are
 * still separated. Empty/unreadable transcripts are skipped.
 */
export async function scanClaudeSessions(): Promise<ClaudeRepoSessions[]> {
	const root = getClaudeProjectsRoot();
	let projectDirs: string[];
	try {
		projectDirs = (await readdir(root, { withFileTypes: true }))
			.filter((e) => e.isDirectory())
			.map((e) => e.name);
	} catch {
		return [];
	}

	const byRepo = new Map<string, ClaudeSessionSummary[]>();
	for (const dir of projectDirs) {
		const files = await listTranscriptFiles(join(root, dir));
		for (const file of files) {
			const summary = await readSessionSummary(file, dir);
			if (!summary || summary.messageCount === 0) continue;
			const key = summary.cwd ?? dir;
			const list = byRepo.get(key) ?? [];
			list.push(summary);
			byRepo.set(key, list);
		}
	}

	const groups: ClaudeRepoSessions[] = [];
	for (const [repoPath, sessions] of byRepo) {
		sessions.sort((a, b) => b.lastModified - a.lastModified);
		groups.push({ repoPath, sessions });
	}
	// Most-recently-active repos first.
	groups.sort(
		(a, b) =>
			(b.sessions[0]?.lastModified ?? 0) - (a.sessions[0]?.lastModified ?? 0),
	);
	return groups;
}

/** Sessions for a single repo path (its own `~/.claude/projects` bucket). */
export async function listSessionsForRepo(
	repoPath: string,
): Promise<ClaudeSessionSummary[]> {
	const dir = encodeClaudeProjectDir(repoPath);
	const files = await listTranscriptFiles(join(getClaudeProjectsRoot(), dir));
	const out: ClaudeSessionSummary[] = [];
	for (const file of files) {
		const summary = await readSessionSummary(file, dir);
		if (summary && summary.messageCount > 0) out.push(summary);
	}
	out.sort((a, b) => b.lastModified - a.lastModified);
	return out;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParsedToolCall {
	id: string;
	name: string;
	input: unknown;
}

export interface ParsedToolResult {
	toolUseId: string;
	content: string;
	isError: boolean;
}

export interface ParsedMessage {
	uuid: string | null;
	role: "user" | "assistant";
	timestamp: string | null;
	text: string;
	thinking: string;
	toolCalls: ParsedToolCall[];
	toolResults: ParsedToolResult[];
	/** True for command/caveat plumbing lines (renderers usually skip these). */
	isMeta: boolean;
}

export interface ParsedTranscript {
	sessionId: string;
	cwd: string | null;
	gitBranch: string | null;
	version: string | null;
	title: string | null;
	messages: ParsedMessage[];
	messageCount: number;
	userMessageCount: number;
	assistantMessageCount: number;
	toolCallCount: number;
}

/** Flatten a tool_result's content (string or block array) to text. */
function toolResultToText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (!block || typeof block !== "object") continue;
		const b = block as { type?: string; text?: unknown; tool_name?: unknown };
		if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
		else if (b.type === "tool_reference" && typeof b.tool_name === "string")
			parts.push(`[tool: ${b.tool_name}]`);
		else if (typeof b.type === "string") parts.push(`[${b.type}]`);
	}
	return parts.join("\n");
}

/** Normalize one JSONL user/assistant record into a ParsedMessage. */
function parseMessageRecord(
	record: Record<string, unknown>,
	role: "user" | "assistant",
): ParsedMessage {
	const message = record.message as { content?: unknown } | undefined;
	const content = message?.content;
	const msg: ParsedMessage = {
		uuid: typeof record.uuid === "string" ? record.uuid : null,
		role,
		timestamp: typeof record.timestamp === "string" ? record.timestamp : null,
		text: "",
		thinking: "",
		toolCalls: [],
		toolResults: [],
		isMeta: record.isMeta === true,
	};

	if (typeof content === "string") {
		msg.text = content;
		if (isNoiseUserText(content)) msg.isMeta = true;
		return msg;
	}
	if (!Array.isArray(content)) return msg;

	const textParts: string[] = [];
	const thinkingParts: string[] = [];
	for (const block of content) {
		if (!block || typeof block !== "object" || !("type" in block)) continue;
		const b = block as Record<string, unknown>;
		switch (b.type) {
			case "text":
				if (typeof b.text === "string") textParts.push(b.text);
				break;
			case "thinking":
				if (typeof b.thinking === "string") thinkingParts.push(b.thinking);
				break;
			case "tool_use":
				msg.toolCalls.push({
					id: typeof b.id === "string" ? b.id : "",
					name: typeof b.name === "string" ? b.name : "tool",
					input: b.input,
				});
				break;
			case "tool_result":
				msg.toolResults.push({
					toolUseId: typeof b.tool_use_id === "string" ? b.tool_use_id : "",
					content: toolResultToText(b.content),
					isError: b.is_error === true,
				});
				break;
		}
	}
	msg.text = textParts.join("\n");
	msg.thinking = thinkingParts.join("\n");
	return msg;
}

/**
 * Parse a Claude Code JSONL transcript into a normalized message list. Handles
 * the real schema: string- or block-array content, `thinking`/`text`/`tool_use`
 * blocks on assistant turns, and `tool_result` blocks (string or block-array
 * content) on user turns. Non-message record types (mode, file-history-*,
 * ai-title, system, ...) are used only for header metadata.
 */
export async function parseClaudeTranscript(
	filePath: string,
): Promise<ParsedTranscript> {
	const raw = await readFile(filePath, "utf8");
	const transcript: ParsedTranscript = {
		sessionId: basename(filePath).replace(/\.jsonl$/, ""),
		cwd: null,
		gitBranch: null,
		version: null,
		title: null,
		messages: [],
		messageCount: 0,
		userMessageCount: 0,
		assistantMessageCount: 0,
		toolCallCount: 0,
	};
	let aiTitle: string | null = null;
	let customTitle: string | null = null;

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		let record: Record<string, unknown>;
		try {
			record = JSON.parse(trimmed);
		} catch {
			continue;
		}
		if (transcript.cwd == null && typeof record.cwd === "string") {
			transcript.cwd = record.cwd;
		}
		if (transcript.gitBranch == null && typeof record.gitBranch === "string") {
			transcript.gitBranch = record.gitBranch;
		}
		if (transcript.version == null && typeof record.version === "string") {
			transcript.version = record.version;
		}
		if (record.type === "ai-title" && typeof record.aiTitle === "string") {
			aiTitle = record.aiTitle;
		}
		if (
			record.type === "custom-title" &&
			typeof record.customTitle === "string"
		) {
			customTitle = record.customTitle;
		}
		if (record.type === "user" || record.type === "assistant") {
			const msg = parseMessageRecord(record, record.type);
			transcript.messages.push(msg);
		}
	}

	transcript.title = customTitle ?? aiTitle;
	for (const m of transcript.messages) {
		if (m.isMeta) continue;
		transcript.messageCount++;
		if (m.role === "user") transcript.userMessageCount++;
		else transcript.assistantMessageCount++;
		transcript.toolCallCount += m.toolCalls.length;
	}
	return transcript;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const TOOL_INPUT_PREVIEW_LEN = 800;
const TOOL_RESULT_PREVIEW_LEN = 1200;

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}\n… (${text.length - max} more chars)`;
}

/**
 * Render a parsed transcript as a readable Markdown document. This is what
 * Papyrus surfaces as the imported session's history: a standalone, read-only
 * document in the Workspace's Agent Files, kept distinct from Papyrus's own
 * live terminal scrollback (see the "imported marker" decision in the PR).
 */
export function renderTranscriptMarkdown(transcript: ParsedTranscript): string {
	const lines: string[] = [];
	lines.push(`# Imported Claude session`);
	lines.push("");
	if (transcript.title) lines.push(`**${transcript.title}**`);
	lines.push("");
	lines.push(`- Session ID: \`${transcript.sessionId}\``);
	if (transcript.cwd) lines.push(`- Original repo: \`${transcript.cwd}\``);
	if (transcript.gitBranch)
		lines.push(`- Git branch: \`${transcript.gitBranch}\``);
	if (transcript.version)
		lines.push(`- Claude Code version: ${transcript.version}`);
	lines.push(
		`- Messages: ${transcript.messageCount} (${transcript.userMessageCount} user, ${transcript.assistantMessageCount} assistant), ${transcript.toolCallCount} tool calls`,
	);
	lines.push("");
	lines.push(
		`> Imported into this Workspace from a native \`claude\` CLI session. Resume it from the worktree with \`claude --resume ${transcript.sessionId}\`.`,
	);
	lines.push("");
	lines.push("---");
	lines.push("");

	for (const m of transcript.messages) {
		if (m.isMeta) continue;
		if (
			!m.text.trim() &&
			m.toolCalls.length === 0 &&
			m.toolResults.length === 0
		) {
			continue;
		}
		const who = m.role === "user" ? "🧑 User" : "🤖 Assistant";
		const ts = m.timestamp ? ` · ${m.timestamp}` : "";
		lines.push(`### ${who}${ts}`);
		lines.push("");
		if (m.text.trim()) {
			lines.push(m.text.trim());
			lines.push("");
		}
		for (const call of m.toolCalls) {
			const input =
				typeof call.input === "string"
					? call.input
					: JSON.stringify(call.input, null, 2);
			lines.push(`**⚙️ ${call.name}**`);
			lines.push("```json");
			lines.push(truncate(input ?? "", TOOL_INPUT_PREVIEW_LEN));
			lines.push("```");
			lines.push("");
		}
		for (const result of m.toolResults) {
			if (!result.content.trim()) continue;
			lines.push(result.isError ? "**↳ tool error**" : "**↳ tool result**");
			lines.push("```");
			lines.push(truncate(result.content.trim(), TOOL_RESULT_PREVIEW_LEN));
			lines.push("```");
			lines.push("");
		}
	}
	return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportClaudeSessionParams {
	/** Session UUID to import. */
	sessionId: string;
	/**
	 * Repo the session ran in. When given we look straight in its encoded bucket;
	 * when omitted we scan every bucket for the sessionId.
	 */
	sourceRepoPath?: string;
	/**
	 * Absolute worktree path to bind the session to. MUST already exist and be a
	 * git repo — import never creates git state; the caller sets the Workspace up
	 * first.
	 */
	worktreePath: string;
	/** The agent's canonical memory dir (for carrying over memory notes). */
	agentMemoryDir: string;
	/** The agent's home dir (the rendered transcript lands under `imported/`). */
	agentHome: string;
}

export interface ImportClaudeSessionResult {
	sessionId: string;
	/** The encoded `~/.claude/projects` dir the transcript was bound into. */
	worktreeProjectDir: string;
	/** Absolute path of the transcript now resumable from the worktree. */
	boundTranscriptPath: string;
	/** Absolute path of the rendered Markdown history in the agent's files. */
	renderedTranscriptPath: string;
	/** `claude --resume <id>` — how to continue the session from the worktree. */
	resumeCommand: string;
	messageCount: number;
	/** Names of memory files carried over from the source repo (if any). */
	memoryFilesImported: string[];
}

/** Find a session's transcript file, optionally scoped to a source repo. */
export async function findSessionTranscript(
	sessionId: string,
	sourceRepoPath?: string,
): Promise<string | null> {
	if (sourceRepoPath) {
		const candidate = join(
			getClaudeProjectsRoot(),
			encodeClaudeProjectDir(sourceRepoPath),
			`${sessionId}.jsonl`,
		);
		return existsSync(candidate) ? candidate : null;
	}
	const root = getClaudeProjectsRoot();
	let dirs: string[];
	try {
		dirs = (await readdir(root, { withFileTypes: true }))
			.filter((e) => e.isDirectory())
			.map((e) => e.name);
	} catch {
		return null;
	}
	for (const dir of dirs) {
		const candidate = join(root, dir, `${sessionId}.jsonl`);
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

/** Memory files we carry over from the source repo, mapped to the agent file. */
const MEMORY_CARRYOVER: Array<{ source: string; target: string }> = [
	{ source: "AGENT.md", target: "AGENT.md" },
	{ source: "USER.md", target: "USER.md" },
	{ source: "MEMORY.md", target: "MEMORY.md" },
	// A repo's CLAUDE.md is project guidance; fold it into the agent's MEMORY.md.
	{ source: "CLAUDE.md", target: "MEMORY.md" },
];

/**
 * Carry AGENT.md/MEMORY.md/USER.md/CLAUDE.md notes the source session
 * accumulated in its repo into the agent's canonical memory files. Conservative
 * and idempotent: content is appended under a clearly-marked, session-scoped
 * heading, and a re-import of the same session is a no-op (the marker guards
 * against duplication). Never overwrites the agent's existing memory.
 */
async function carryOverMemory(
	sourceRepoPath: string,
	agentMemoryDir: string,
	sessionId: string,
): Promise<string[]> {
	const imported: string[] = [];
	await mkdir(agentMemoryDir, { recursive: true });
	const marker = `<!-- imported from claude session ${sessionId}`;

	for (const { source, target } of MEMORY_CARRYOVER) {
		const sourcePath = join(sourceRepoPath, source);
		if (!existsSync(sourcePath)) continue;
		let sourceContent: string;
		try {
			sourceContent = (await readFile(sourcePath, "utf8")).trim();
		} catch {
			continue;
		}
		if (!sourceContent) continue;

		const targetPath = join(agentMemoryDir, target);
		let existing = "";
		if (existsSync(targetPath)) {
			try {
				existing = await readFile(targetPath, "utf8");
			} catch {
				existing = "";
			}
		}
		if (existing.includes(`${marker} (${source})`)) continue;

		const block =
			`\n\n${marker} (${source}) -->\n` +
			`## Imported from ${source} (native session ${sessionId})\n\n` +
			`${sourceContent}\n`;
		await appendFile(targetPath, block, "utf8");
		imported.push(source);
	}
	return imported;
}

/**
 * Bind a native `claude` session to an existing Workspace worktree.
 *
 * Concretely this:
 *  1. Verifies the worktree already exists and is a git repo (import must NOT
 *     create git state).
 *  2. Copies the source transcript into the worktree's own
 *     `~/.claude/projects/<encoded-worktree>` bucket so the session is
 *     resumable and managed from that environment (`claude --resume <id>`).
 *  3. Renders the transcript to Markdown under `<agentHome>/imported/` so the
 *     history is browsable in the Workspace's Agent Files.
 *  4. Carries over any AGENT.md/MEMORY.md/USER.md/CLAUDE.md notes from the
 *     source repo into the agent's canonical memory files.
 *
 * It does not clone the repo, create branches, or touch the worktree's git —
 * that is the caller's responsibility, done before import.
 */
export async function importClaudeSession(
	params: ImportClaudeSessionParams,
): Promise<ImportClaudeSessionResult> {
	const { sessionId, sourceRepoPath, worktreePath, agentMemoryDir, agentHome } =
		params;

	// 1. Worktree must already exist as a git repo — never create git state.
	if (!existsSync(worktreePath)) {
		throw new Error(
			`Worktree does not exist: ${worktreePath}. Create the Workspace first, then import.`,
		);
	}
	if (!existsSync(join(worktreePath, ".git"))) {
		throw new Error(
			`Worktree is not a git repo: ${worktreePath}. Import binds to an existing worktree and never creates git state.`,
		);
	}

	// 2. Locate the source transcript.
	const source = await findSessionTranscript(sessionId, sourceRepoPath);
	if (!source) {
		throw new Error(
			`No transcript found for session ${sessionId}${sourceRepoPath ? ` under ${sourceRepoPath}` : ""}.`,
		);
	}

	const transcript = await parseClaudeTranscript(source);

	// 3. Bind: copy the transcript into the worktree's project bucket so a later
	//    `claude --resume <id>` run from the worktree finds it.
	const worktreeProjectDir = encodeClaudeProjectDir(worktreePath);
	const destDir = join(getClaudeProjectsRoot(), worktreeProjectDir);
	await mkdir(destDir, { recursive: true });
	const boundTranscriptPath = join(destDir, `${sessionId}.jsonl`);
	if (boundTranscriptPath !== source) {
		await copyFile(source, boundTranscriptPath);
	}

	// 4. Render the history as a browsable Markdown document.
	const importedDir = join(agentHome, "imported");
	await mkdir(importedDir, { recursive: true });
	const renderedTranscriptPath = join(importedDir, `${sessionId}.md`);
	await writeFile(
		renderedTranscriptPath,
		renderTranscriptMarkdown(transcript),
		"utf8",
	);

	// 5. Carry over memory notes from the source repo (if resolvable).
	let memoryFilesImported: string[] = [];
	const repoForMemory = sourceRepoPath ?? transcript.cwd ?? null;
	if (repoForMemory && existsSync(repoForMemory)) {
		memoryFilesImported = await carryOverMemory(
			repoForMemory,
			agentMemoryDir,
			sessionId,
		);
	}

	return {
		sessionId,
		worktreeProjectDir,
		boundTranscriptPath,
		renderedTranscriptPath,
		resumeCommand: `claude --resume ${sessionId}`,
		messageCount: transcript.messageCount,
		memoryFilesImported,
	};
}

/** List rendered imported-transcript files for an agent (for Agent Files). */
export async function listImportedTranscripts(
	agentHome: string,
): Promise<Array<{ label: string; absolutePath: string }>> {
	const importedDir = join(agentHome, "imported");
	if (!existsSync(importedDir)) return [];
	try {
		const names = await readdir(importedDir);
		return names
			.filter((n) => n.endsWith(".md"))
			.map((n) => ({
				label: `imported/${n}`,
				absolutePath: join(importedDir, n),
			}));
	} catch {
		return [];
	}
}
