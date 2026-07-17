/**
 * Local structural types for the Team Dashboard (issue #51, unit U6).
 *
 * These mirror the frozen `teamDashboard` tRPC router contract exactly. We keep
 * them local (rather than inferring from the router) so the renderer UI type-checks
 * independently of whether the parallel router work has landed yet.
 */

export type AgentStatus =
	| "working"
	| "waiting"
	| "blocked"
	| "idle"
	| "unknown";

export type ChecksStatus = "success" | "failure" | "pending" | "none";

export interface RosterEntry {
	workspaceId: string;
	name: string;
	iconUrl: string | null;
	branch: string | null;
	status: AgentStatus;
	session: { model: string | null; contextTokens: number | null } | null;
	pr: {
		number: number;
		title: string;
		url: string;
		checksStatus: ChecksStatus;
	} | null;
	lastActivityAt: number | null;
}

export type ActivityKind =
	| "pr-opened"
	| "pr-merged"
	| "pr-closed"
	| "issue-opened"
	| "issue-closed"
	| "mail";

export interface ActivityEvent {
	id: string;
	kind: ActivityKind;
	at: string;
	title: string;
	url: string | null;
	number: number | null;
	actor: string | null;
}

export interface BoardItem {
	number: number;
	title: string;
	url: string;
	labels: string[];
	updatedAt: string;
	agent?: { workspaceId: string; name: string; branch: string | null };
	pr?: {
		number: number;
		title: string;
		url: string;
		state: string;
		headRefName: string;
		checksStatus: ChecksStatus;
		updatedAt: string;
		mergedAt: string | null;
		body: string;
	};
}

export interface WorkBoardData {
	todo: BoardItem[];
	doing: BoardItem[];
	done: BoardItem[];
}
