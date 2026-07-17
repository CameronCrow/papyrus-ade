import {
	type AgentActivity,
	readLatestSessionActivity,
	readLatestSessionStats,
} from "./claude-sessions";
import {
	type ActivityEvent,
	type AgentRef,
	type BoardItem,
	deriveActivityFeed,
	deriveWorkBoard,
	fetchGitHubPRStatus,
	fetchTeamGitHubSnapshot,
} from "./github-team";
import { listMailEvents } from "./mail-events";

/**
 * Team dashboard derivations (issue #51, unit U5). The single place both the
 * desktop and papyrus-server `teamDashboard` routers do their real work, so the
 * routers stay thin (DB row → TeamWorkspaceRef mapping only).
 *
 * HARD CONSTRAINT: import-time DB-free and Electron-free. Nothing here touches
 * the local-db or electron — callers resolve `workspaces` rows to plain strings
 * (a `TeamWorkspaceRef[]`) and hand them in.
 */

/**
 * A workspace resolved to the plain strings this module needs. Routers build
 * these from their own DB rows (desktop: getWorkspacesByProjectId; server:
 * workspaces table + resolveAgentWorktreePath + getAgentHome).
 */
export type TeamWorkspaceRef = {
	workspaceId: string;
	name: string;
	iconUrl: string | null;
	branch: string | null;
	worktreePath: string;
	agentHome: string | null;
};

export type RosterEntry = {
	workspaceId: string;
	name: string;
	iconUrl: string | null;
	branch: string | null;
	status: "working" | "waiting" | "blocked" | "idle" | "unknown";
	session: { model: string | null; contextTokens: number | null } | null;
	pr: {
		number: number;
		title: string;
		url: string;
		checksStatus: "success" | "failure" | "pending" | "none";
	} | null;
	lastActivityAt: number | null;
};

/**
 * Combine an agent's live-session activity with its PR checks into the roster
 * status. A failing PR ("blocked") outranks everything; otherwise the raw
 * session activity carries through. Kept as a pure, dependency-free seam so the
 * precedence is unit-testable without the async filesystem/gh reads.
 */
export function deriveRosterStatus(
	activityStatus: AgentActivity["status"],
	checksStatus: string | null,
): RosterEntry["status"] {
	if (checksStatus === "failure") return "blocked";
	return activityStatus;
}

/**
 * Build the per-agent roster: for each workspace, its live session activity,
 * model/context stats, and PR status, collapsed into one row. Per-workspace
 * failures degrade that single entry to status "unknown" — they never sink the
 * whole roster.
 */
export async function buildRoster(
	workspaces: TeamWorkspaceRef[],
): Promise<RosterEntry[]> {
	return Promise.all(
		workspaces.map(async (ws): Promise<RosterEntry> => {
			try {
				const [activity, stats, prStatus] = await Promise.all([
					readLatestSessionActivity(ws.worktreePath),
					readLatestSessionStats(ws.worktreePath),
					fetchGitHubPRStatus(ws.worktreePath),
				]);

				const pr = prStatus?.pr
					? {
							number: prStatus.pr.number,
							title: prStatus.pr.title,
							url: prStatus.pr.url,
							checksStatus: prStatus.pr.checksStatus,
						}
					: null;

				return {
					workspaceId: ws.workspaceId,
					name: ws.name,
					iconUrl: ws.iconUrl,
					branch: ws.branch,
					status: deriveRosterStatus(activity.status, pr?.checksStatus ?? null),
					session: stats
						? { model: stats.model, contextTokens: stats.contextTokens }
						: null,
					pr,
					lastActivityAt: activity.lastModified,
				};
			} catch {
				return {
					workspaceId: ws.workspaceId,
					name: ws.name,
					iconUrl: ws.iconUrl,
					branch: ws.branch,
					status: "unknown",
					session: null,
					pr: null,
					lastActivityAt: null,
				};
			}
		}),
	);
}

/**
 * Build the merged activity feed: a team-wide GitHub snapshot (all workspaces
 * share one repo, so the first workspace's worktree is the repo path) plus the
 * agent-mail roll-up, folded into a time-ordered feed.
 */
export async function buildActivity(
	workspaces: TeamWorkspaceRef[],
	limit: number,
): Promise<ActivityEvent[]> {
	const repoPath = workspaces[0]?.worktreePath;
	if (!repoPath) return [];

	const homes = workspaces
		.filter((ws): ws is TeamWorkspaceRef & { agentHome: string } =>
			Boolean(ws.agentHome),
		)
		.map((ws) => ({ name: ws.name, home: ws.agentHome }));

	const [snap, mail] = await Promise.all([
		fetchTeamGitHubSnapshot(repoPath),
		listMailEvents(homes, limit),
	]);

	return deriveActivityFeed(snap, mail, limit);
}

/**
 * Build the work board (todo / doing / done) by correlating the team-wide
 * GitHub snapshot with the agents' branches.
 */
export async function buildWorkBoard(
	workspaces: TeamWorkspaceRef[],
): Promise<{ todo: BoardItem[]; doing: BoardItem[]; done: BoardItem[] }> {
	const repoPath = workspaces[0]?.worktreePath;
	if (!repoPath) return { todo: [], doing: [], done: [] };

	const snap = await fetchTeamGitHubSnapshot(repoPath);
	const agents: AgentRef[] = workspaces.map((ws) => ({
		workspaceId: ws.workspaceId,
		name: ws.name,
		branch: ws.branch,
	}));

	return deriveWorkBoard(snap, agents);
}
