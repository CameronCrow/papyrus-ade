import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CheckItem, GitHubStatus } from "@superset/local-db";
import { z } from "zod";
import { execWithShellEnv, getProcessEnvWithShellPath } from "./shell-env";

/**
 * GitHub team + PR-status helpers, lifted out of the desktop app
 * (apps/desktop/src/lib/trpc/routers/workspaces/utils/github, issue #51) so the
 * same `gh`/`git` CLI logic is shared by the desktop app and papyrus-server.
 *
 * HARD CONSTRAINT: this module must be import-time DB-free and Electron-free
 * (it runs under bun on Windows). The only `@superset/local-db` reference is a
 * type-only import (erased at compile time). Everything else is pure gh/git/fs
 * with paths passed as plain strings.
 */

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// gh CLI output schemas (lifted from the desktop github/types.ts)
// ---------------------------------------------------------------------------

const GHCheckContextSchema = z.object({
	name: z.string().optional(),
	context: z.string().optional(), // StatusContext uses 'context' instead of 'name'
	state: z.enum(["SUCCESS", "FAILURE", "PENDING", "ERROR"]).optional(),
	status: z.string().optional(), // CheckRun status: COMPLETED, IN_PROGRESS, etc.
	conclusion: z
		.enum([
			"SUCCESS",
			"FAILURE",
			"CANCELLED",
			"SKIPPED",
			"TIMED_OUT",
			"ACTION_REQUIRED",
			"NEUTRAL",
			"", // Can be empty string when in progress
		])
		.optional(),
	detailsUrl: z.string().optional(),
	targetUrl: z.string().optional(), // StatusContext uses 'targetUrl' instead of 'detailsUrl'
	startedAt: z.string().optional(),
	completedAt: z.string().optional(),
	workflowName: z.string().optional(),
});

const GHPRResponseSchema = z.object({
	number: z.number(),
	title: z.string(),
	url: z.string(),
	state: z.enum(["OPEN", "CLOSED", "MERGED"]),
	isDraft: z.boolean(),
	mergedAt: z.string().nullable(),
	additions: z.number(),
	deletions: z.number(),
	headRefOid: z.string(),
	reviewDecision: z
		.enum(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED", ""])
		.nullable(),
	// statusCheckRollup is an array directly, not { contexts: [...] }
	statusCheckRollup: z.array(GHCheckContextSchema).nullable(),
});

const GHRepoResponseSchema = z.object({
	url: z.string(),
});

type GHPRResponse = z.infer<typeof GHPRResponseSchema>;
type GHCheckContext = z.infer<typeof GHCheckContextSchema>;

// ---------------------------------------------------------------------------
// Per-worktree PR status (fetchGitHubPRStatus) — lifted from desktop
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: GitHubStatus; timestamp: number }>();
const CACHE_TTL_MS = 10_000;

/**
 * Fetches GitHub PR status for a worktree using the `gh` CLI.
 * Returns null if `gh` is not installed, not authenticated, or on error.
 */
export async function fetchGitHubPRStatus(
	worktreePath: string,
): Promise<GitHubStatus | null> {
	const cached = cache.get(worktreePath);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		return cached.data;
	}

	try {
		const repoUrl = await getRepoUrl(worktreePath);
		if (!repoUrl) {
			return null;
		}

		const { stdout: branchOutput } = await execFileAsync(
			"git",
			["rev-parse", "--abbrev-ref", "HEAD"],
			{ cwd: worktreePath },
		);
		const branchName = branchOutput.trim();

		const [branchExists, prInfo] = await Promise.all([
			branchExistsOnRemote(worktreePath, branchName),
			getPRForBranch(worktreePath, branchName),
		]);

		const result: GitHubStatus = {
			pr: prInfo,
			repoUrl,
			branchExistsOnRemote: branchExists,
			lastRefreshed: Date.now(),
		};

		cache.set(worktreePath, { data: result, timestamp: Date.now() });

		return result;
	} catch {
		return null;
	}
}

/**
 * Returns true if `branchName` exists on the `origin` remote. Simplified lift of
 * the desktop `branchExistsOnRemote` (which returned a categorized result) —
 * fetchGitHubPRStatus only needs the boolean. Any failure (git missing, network,
 * auth, no matching ref) degrades to `false`.
 */
async function branchExistsOnRemote(
	worktreePath: string,
	branchName: string,
): Promise<boolean> {
	try {
		const env = await getProcessEnvWithShellPath();
		await execFileAsync(
			"git",
			[
				"-C",
				worktreePath,
				"ls-remote",
				"--exit-code",
				"--heads",
				"origin",
				branchName,
			],
			{ env, timeout: 30_000 },
		);
		// Exit code 0 = branch exists (--exit-code flag ensures this).
		return true;
	} catch {
		return false;
	}
}

async function getRepoUrl(worktreePath: string): Promise<string | null> {
	try {
		const { stdout } = await execWithShellEnv(
			"gh",
			["repo", "view", "--json", "url"],
			{ cwd: worktreePath },
		);
		const raw = JSON.parse(stdout);
		const result = GHRepoResponseSchema.safeParse(raw);
		if (!result.success) {
			console.error("[GitHub] Repo schema validation failed:", result.error);
			console.error("[GitHub] Raw data:", JSON.stringify(raw, null, 2));
			return null;
		}
		return result.data.url;
	} catch {
		return null;
	}
}

const PR_JSON_FIELDS =
	"number,title,url,state,isDraft,mergedAt,additions,deletions,headRefOid,reviewDecision,statusCheckRollup";

async function getPRForBranch(
	worktreePath: string,
	branchName: string,
): Promise<GitHubStatus["pr"]> {
	const byTracking = await getPRByBranchTracking(worktreePath);
	if (byTracking) {
		return byTracking;
	}

	// Fallback for branches where local naming/casing diverges from PR head.
	return findPRByHeadBranch(worktreePath, branchName);
}

/**
 * Looks up a PR using `gh pr view` (no args), which matches via the branch's
 * tracking ref. Essential for fork PRs that track refs/pull/XXX/head.
 */
async function getPRByBranchTracking(
	worktreePath: string,
): Promise<GitHubStatus["pr"]> {
	try {
		const { stdout } = await execWithShellEnv(
			"gh",
			["pr", "view", "--json", PR_JSON_FIELDS],
			{ cwd: worktreePath },
		);

		const data = parsePRResponse(stdout);
		if (!data) {
			return null;
		}

		if (!(await sharesAncestry(worktreePath, data.headRefOid))) {
			return null;
		}

		return formatPRData(data);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.toLowerCase().includes("no pull requests found")
		) {
			return null;
		}
		throw error;
	}
}

async function findPRByHeadBranch(
	worktreePath: string,
	branchName: string,
): Promise<GitHubStatus["pr"]> {
	try {
		const { stdout } = await execWithShellEnv(
			"gh",
			[
				"pr",
				"list",
				"--state",
				"all",
				"--search",
				`head:${branchName}`,
				"--limit",
				"20",
				"--json",
				PR_JSON_FIELDS,
			],
			{ cwd: worktreePath },
		);

		const candidates = parsePRListResponse(stdout);
		for (const candidate of candidates) {
			if (await sharesAncestry(worktreePath, candidate.headRefOid)) {
				return formatPRData(candidate);
			}
		}

		return null;
	} catch {
		return null;
	}
}

function parsePRResponse(stdout: string): GHPRResponse | null {
	const trimmed = stdout.trim();
	if (!trimmed || trimmed === "null") {
		return null;
	}

	let raw: unknown;
	try {
		raw = JSON.parse(trimmed);
	} catch (error) {
		console.warn(
			"[GitHub] Failed to parse PR response JSON:",
			error instanceof Error ? error.message : String(error),
		);
		return null;
	}
	const result = GHPRResponseSchema.safeParse(raw);
	if (!result.success) {
		console.error("[GitHub] PR schema validation failed:", result.error);
		console.error("[GitHub] Raw data:", JSON.stringify(raw, null, 2));
		return null;
	}
	return result.data;
}

function parsePRListResponse(stdout: string): GHPRResponse[] {
	const trimmed = stdout.trim();
	if (!trimmed || trimmed === "null") {
		return [];
	}

	let raw: unknown;
	try {
		raw = JSON.parse(trimmed);
	} catch (error) {
		console.warn(
			"[GitHub] Failed to parse PR list response JSON:",
			error instanceof Error ? error.message : String(error),
		);
		return [];
	}

	if (!Array.isArray(raw)) {
		return [];
	}

	const parsed: GHPRResponse[] = [];
	for (const item of raw) {
		const result = GHPRResponseSchema.safeParse(item);
		if (result.success) {
			parsed.push(result.data);
		}
	}
	return parsed;
}

/**
 * Returns true if local HEAD and the given commit share ancestry
 * (one is an ancestor of the other, or they are the same commit).
 */
async function sharesAncestry(
	worktreePath: string,
	prHeadOid: string,
): Promise<boolean> {
	try {
		const { stdout: localHead } = await execFileAsync(
			"git",
			["-C", worktreePath, "rev-parse", "HEAD"],
			{ timeout: 10_000 },
		);
		const localOid = localHead.trim();

		if (localOid === prHeadOid) {
			return true;
		}

		for (const [ancestor, descendant] of [
			[prHeadOid, localOid],
			[localOid, prHeadOid],
		]) {
			try {
				await execFileAsync(
					"git",
					[
						"-C",
						worktreePath,
						"merge-base",
						"--is-ancestor",
						ancestor,
						descendant,
					],
					{ timeout: 10_000 },
				);
				return true;
			} catch {
				// Try the other direction.
			}
		}

		return false;
	} catch {
		return false;
	}
}

function formatPRData(data: GHPRResponse): NonNullable<GitHubStatus["pr"]> {
	return {
		number: data.number,
		title: data.title,
		url: data.url,
		state: mapPRState(data.state, data.isDraft),
		mergedAt: data.mergedAt ? new Date(data.mergedAt).getTime() : undefined,
		additions: data.additions,
		deletions: data.deletions,
		reviewDecision: mapReviewDecision(data.reviewDecision),
		checksStatus: computeChecksStatus(data.statusCheckRollup),
		checks: parseChecks(data.statusCheckRollup),
	};
}

function mapPRState(
	state: GHPRResponse["state"],
	isDraft: boolean,
): NonNullable<GitHubStatus["pr"]>["state"] {
	if (state === "MERGED") return "merged";
	if (state === "CLOSED") return "closed";
	if (isDraft) return "draft";
	return "open";
}

function mapReviewDecision(
	decision: GHPRResponse["reviewDecision"],
): NonNullable<GitHubStatus["pr"]>["reviewDecision"] {
	if (decision === "APPROVED") return "approved";
	if (decision === "CHANGES_REQUESTED") return "changes_requested";
	return "pending";
}

function parseChecks(rollup: GHPRResponse["statusCheckRollup"]): CheckItem[] {
	if (!rollup || rollup.length === 0) {
		return [];
	}

	// GitHub returns two shapes: CheckRun (name/detailsUrl/conclusion) and
	// StatusContext (context/targetUrl/state). Normalize both here.
	return rollup.map((ctx) => {
		const name = ctx.name || ctx.context || "Unknown check";
		const url = ctx.detailsUrl || ctx.targetUrl;
		const rawStatus = ctx.state || ctx.conclusion;

		let status: CheckItem["status"];
		if (rawStatus === "SUCCESS") {
			status = "success";
		} else if (
			rawStatus === "FAILURE" ||
			rawStatus === "ERROR" ||
			rawStatus === "TIMED_OUT"
		) {
			status = "failure";
		} else if (rawStatus === "SKIPPED" || rawStatus === "NEUTRAL") {
			status = "skipped";
		} else if (rawStatus === "CANCELLED") {
			status = "cancelled";
		} else {
			status = "pending";
		}

		return { name, status, url };
	});
}

function computeChecksStatus(
	rollup: GHCheckContext[] | null,
): NonNullable<GitHubStatus["pr"]>["checksStatus"] {
	if (!rollup || rollup.length === 0) {
		return "none";
	}

	let hasFailure = false;
	let hasPending = false;

	for (const ctx of rollup) {
		const status = ctx.state || ctx.conclusion;

		if (status === "FAILURE" || status === "ERROR" || status === "TIMED_OUT") {
			hasFailure = true;
		} else if (
			status === "PENDING" ||
			status === "" ||
			status === null ||
			status === undefined
		) {
			hasPending = true;
		}
	}

	if (hasFailure) return "failure";
	if (hasPending) return "pending";
	return "success";
}

// ---------------------------------------------------------------------------
// Team dashboard snapshot + derivations (issue #51, unit U2)
// ---------------------------------------------------------------------------

export type TeamGitHubSnapshot = {
	issues: Array<{
		number: number;
		title: string;
		url: string;
		state: "open" | "closed";
		labels: string[];
		assignees: string[];
		body: string;
		updatedAt: string;
		closedAt: string | null;
	}>;
	prs: Array<{
		number: number;
		title: string;
		url: string;
		state: "open" | "merged" | "closed";
		headRefName: string;
		body: string;
		checksStatus: "success" | "failure" | "pending" | "none";
		updatedAt: string;
		mergedAt: string | null;
	}>;
};

export type AgentRef = {
	workspaceId: string;
	name: string;
	branch: string | null;
};

export type BoardItem = {
	number: number;
	title: string;
	url: string;
	labels: string[];
	updatedAt: string;
	agent?: AgentRef;
	pr?: TeamGitHubSnapshot["prs"][number];
};

export type ActivityEvent = {
	id: string;
	kind: "pr-opened" | "pr-merged" | "pr-closed" | "issue-opened" | "issue-closed" | "mail";
	at: string;
	title: string;
	url: string | null;
	number: number | null;
	actor: string | null;
};

/**
 * Canonical home for the mail-event shape (frozen contract). The team dashboard's
 * mail-events unit imports this type from here rather than redefining it.
 */
export type MailEvent = {
	id: string;
	thread: string;
	from: string;
	to: string;
	status: string;
	at: string;
	subjectLine: string;
};

// Loose schemas for the two team-wide gh list calls. Kept permissive so a single
// odd field never sinks the whole fetch — anything unparseable is skipped.
const GHTeamIssueSchema = z.object({
	number: z.number(),
	title: z.string(),
	url: z.string(),
	state: z.string(),
	labels: z.array(z.object({ name: z.string() })).nullish(),
	assignees: z.array(z.object({ login: z.string() })).nullish(),
	body: z.string().nullish(),
	updatedAt: z.string(),
	closedAt: z.string().nullish(),
});

const GHTeamPRSchema = z.object({
	number: z.number(),
	title: z.string(),
	url: z.string(),
	state: z.string(),
	headRefName: z.string(),
	body: z.string().nullish(),
	statusCheckRollup: z.array(GHCheckContextSchema).nullish(),
	updatedAt: z.string(),
	mergedAt: z.string().nullish(),
});

/**
 * Fetches an org/repo-wide snapshot of issues + PRs for the team dashboard using
 * two `gh` list calls run with cwd=repoPath.
 *
 * NEVER throws: `gh` missing, not a repo, not authenticated, or any parse error
 * all degrade to `{ issues: [], prs: [] }`.
 */
export async function fetchTeamGitHubSnapshot(
	repoPath: string,
): Promise<TeamGitHubSnapshot> {
	try {
		const [issues, prs] = await Promise.all([
			fetchTeamIssues(repoPath),
			fetchTeamPRs(repoPath),
		]);
		return { issues, prs };
	} catch {
		return { issues: [], prs: [] };
	}
}

async function fetchTeamIssues(
	repoPath: string,
): Promise<TeamGitHubSnapshot["issues"]> {
	try {
		const { stdout } = await execWithShellEnv(
			"gh",
			[
				"issue",
				"list",
				"--state",
				"all",
				"--limit",
				"100",
				"--json",
				"number,title,url,state,labels,assignees,body,updatedAt,closedAt",
			],
			{ cwd: repoPath },
		);

		const raw: unknown = JSON.parse(stdout.trim() || "[]");
		if (!Array.isArray(raw)) {
			return [];
		}

		const issues: TeamGitHubSnapshot["issues"] = [];
		for (const item of raw) {
			const parsed = GHTeamIssueSchema.safeParse(item);
			if (!parsed.success) {
				continue;
			}
			const data = parsed.data;
			issues.push({
				number: data.number,
				title: data.title,
				url: data.url,
				state: data.state.toLowerCase() === "closed" ? "closed" : "open",
				labels: (data.labels ?? []).map((l) => l.name),
				assignees: (data.assignees ?? []).map((a) => a.login),
				body: data.body ?? "",
				updatedAt: data.updatedAt,
				closedAt: data.closedAt ?? null,
			});
		}
		return issues;
	} catch {
		return [];
	}
}

async function fetchTeamPRs(
	repoPath: string,
): Promise<TeamGitHubSnapshot["prs"]> {
	try {
		const { stdout } = await execWithShellEnv(
			"gh",
			[
				"pr",
				"list",
				"--state",
				"all",
				"--limit",
				"50",
				"--json",
				"number,title,url,state,headRefName,body,statusCheckRollup,updatedAt,mergedAt",
			],
			{ cwd: repoPath },
		);

		const raw: unknown = JSON.parse(stdout.trim() || "[]");
		if (!Array.isArray(raw)) {
			return [];
		}

		const prs: TeamGitHubSnapshot["prs"] = [];
		for (const item of raw) {
			const parsed = GHTeamPRSchema.safeParse(item);
			if (!parsed.success) {
				continue;
			}
			const data = parsed.data;
			prs.push({
				number: data.number,
				title: data.title,
				url: data.url,
				state: normalizeTeamPRState(data.state, data.mergedAt ?? null),
				headRefName: data.headRefName,
				body: data.body ?? "",
				checksStatus: computeChecksStatus(data.statusCheckRollup ?? null),
				updatedAt: data.updatedAt,
				mergedAt: data.mergedAt ?? null,
			});
		}
		return prs;
	} catch {
		return [];
	}
}

function normalizeTeamPRState(
	state: string,
	mergedAt: string | null,
): TeamGitHubSnapshot["prs"][number]["state"] {
	const lower = state.toLowerCase();
	if (lower === "merged" || mergedAt) return "merged";
	if (lower === "closed") return "closed";
	return "open";
}

// Extracts an issue-like number from a branch/ref name. Matches a run of digits
// bounded by a separator or the string edge, optionally prefixed with `#`.
// e.g. "feat/issue-51-team-dashboard" -> {51}, "fix-12" -> {12}.
const BRANCH_NUMBER_RE = /(?:^|[-/_])#?(\d+)(?:[-_/]|$)/g;

function extractBranchNumbers(branch: string): Set<number> {
	const nums = new Set<number>();
	BRANCH_NUMBER_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = BRANCH_NUMBER_RE.exec(branch)) !== null) {
		nums.add(Number.parseInt(match[1], 10));
		// Guard against zero-width matches locking the loop.
		if (match.index === BRANCH_NUMBER_RE.lastIndex) {
			BRANCH_NUMBER_RE.lastIndex++;
		}
	}
	return nums;
}

// True if `#<number>` appears in the text as a whole token (so #51 does not match
// #510 or #515).
function mentionsIssue(text: string, issueNumber: number): boolean {
	return new RegExp(`#${issueNumber}(?![0-9])`).test(text);
}

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]): T[] {
	return [...items].sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
}

function toTime(value: string | null): number {
	if (!value) return 0;
	const t = Date.parse(value);
	return Number.isNaN(t) ? 0 : t;
}

/**
 * Derives the three work-board columns (pure, synchronous).
 *
 * - `done`  = closed issues.
 * - `doing` = open issues correlated with work-in-flight via any of:
 *     (a) an OPEN PR whose headRefName encodes the issue number,
 *     (b) `#N` appearing in an OPEN PR's title or body,
 *     (c) an agent whose branch encodes the issue number.
 *   The matching PR and/or agent is attached to the board item.
 * - `todo`  = remaining open issues.
 *
 * Each column is sorted by `updatedAt` descending.
 */
export function deriveWorkBoard(
	snap: TeamGitHubSnapshot,
	agents: AgentRef[],
): { todo: BoardItem[]; doing: BoardItem[]; done: BoardItem[] } {
	const openPRs = snap.prs.filter((pr) => pr.state === "open");

	const done: BoardItem[] = [];
	const doing: BoardItem[] = [];
	const todo: BoardItem[] = [];

	for (const issue of snap.issues) {
		const base: BoardItem = {
			number: issue.number,
			title: issue.title,
			url: issue.url,
			labels: issue.labels,
			updatedAt: issue.updatedAt,
		};

		if (issue.state === "closed") {
			done.push(base);
			continue;
		}

		// (a) + (b): correlate against open PRs.
		const matchingPr = openPRs.find(
			(pr) =>
				extractBranchNumbers(pr.headRefName).has(issue.number) ||
				mentionsIssue(pr.title, issue.number) ||
				mentionsIssue(pr.body, issue.number),
		);

		// (c): correlate against agent branches.
		const matchingAgent = agents.find(
			(agent) =>
				agent.branch != null &&
				extractBranchNumbers(agent.branch).has(issue.number),
		);

		if (matchingPr || matchingAgent) {
			doing.push({
				...base,
				...(matchingPr ? { pr: matchingPr } : {}),
				...(matchingAgent ? { agent: matchingAgent } : {}),
			});
		} else {
			todo.push(base);
		}
	}

	return {
		todo: sortByUpdatedAtDesc(todo),
		doing: sortByUpdatedAtDesc(doing),
		done: sortByUpdatedAtDesc(done),
	};
}

/**
 * Derives a merged, time-ordered activity feed (pure, synchronous).
 *
 * PRs: open -> pr-opened @updatedAt; merged -> pr-merged @mergedAt;
 * closed-unmerged -> pr-closed @updatedAt.
 * Issues: open -> issue-opened @updatedAt; closed -> issue-closed @closedAt
 * (falling back to updatedAt).
 * Mail: kind "mail", title = subjectLine, actor = from.
 *
 * Events are merged, sorted by `at` descending, and truncated to `limit`.
 */
export function deriveActivityFeed(
	snap: TeamGitHubSnapshot,
	mail: MailEvent[],
	limit: number,
): ActivityEvent[] {
	const events: ActivityEvent[] = [];

	for (const pr of snap.prs) {
		if (pr.state === "merged") {
			events.push({
				id: `pr-merged-${pr.number}`,
				kind: "pr-merged",
				at: pr.mergedAt ?? pr.updatedAt,
				title: pr.title,
				url: pr.url,
				number: pr.number,
				actor: null,
			});
		} else if (pr.state === "closed") {
			events.push({
				id: `pr-closed-${pr.number}`,
				kind: "pr-closed",
				at: pr.updatedAt,
				title: pr.title,
				url: pr.url,
				number: pr.number,
				actor: null,
			});
		} else {
			events.push({
				id: `pr-opened-${pr.number}`,
				kind: "pr-opened",
				at: pr.updatedAt,
				title: pr.title,
				url: pr.url,
				number: pr.number,
				actor: null,
			});
		}
	}

	for (const issue of snap.issues) {
		if (issue.state === "closed") {
			events.push({
				id: `issue-closed-${issue.number}`,
				kind: "issue-closed",
				at: issue.closedAt ?? issue.updatedAt,
				title: issue.title,
				url: issue.url,
				number: issue.number,
				actor: null,
			});
		} else {
			events.push({
				id: `issue-opened-${issue.number}`,
				kind: "issue-opened",
				at: issue.updatedAt,
				title: issue.title,
				url: issue.url,
				number: issue.number,
				actor: null,
			});
		}
	}

	for (const m of mail) {
		events.push({
			id: m.id,
			kind: "mail",
			at: m.at,
			title: m.subjectLine,
			url: null,
			number: null,
			actor: m.from,
		});
	}

	events.sort((a, b) => toTime(b.at) - toTime(a.at));
	return events.slice(0, Math.max(0, limit));
}
