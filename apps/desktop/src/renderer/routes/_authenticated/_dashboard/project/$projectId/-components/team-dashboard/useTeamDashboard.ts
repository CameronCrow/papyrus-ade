import { useMemo } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useTabsStore } from "renderer/stores/tabs";
import { getHighestPriorityStatus, type PaneStatus } from "shared/tabs-types";
import type {
	ActivityEvent,
	AgentStatus,
	RosterEntry,
	WorkBoardData,
} from "./types";

/** Poll cadences (issue #51). Roster is the "live" surface, so it refreshes the
 * fastest; the board changes slowly, so it refreshes the slowest. */
const ROSTER_POLL_MS = 5_000;
const ACTIVITY_POLL_MS = 15_000;
const WORKBOARD_POLL_MS = 30_000;

const EMPTY_BOARD: WorkBoardData = { todo: [], doing: [], done: [] };

/**
 * Data hook for the Team Dashboard.
 *
 * Wraps the three `teamDashboard` queries with react-query polling and applies a
 * client-side status overlay: when an agent's workspace has an open tab whose
 * live pane status is more current than the (slower-polling) server roster, we
 * override the server-reported status.
 *
 * Overlay mapping (pane status -> agent status):
 *   - pane "permission" -> "waiting"  (agent is blocked on user input)
 *   - pane "working"    -> "working"
 * Server "blocked" ALWAYS wins over the overlay (a CI/PR failure the local pane
 * has no knowledge of). "review"/"idle" panes never override the server status.
 */
export function useTeamDashboard(projectId: string) {
	const rosterQuery = electronTrpc.teamDashboard.roster.useQuery(
		{ projectId },
		{ enabled: !!projectId, refetchInterval: ROSTER_POLL_MS },
	);
	const activityQuery = electronTrpc.teamDashboard.activity.useQuery(
		{ projectId, limit: 30 },
		{ enabled: !!projectId, refetchInterval: ACTIVITY_POLL_MS },
	);
	const workBoardQuery = electronTrpc.teamDashboard.workBoard.useQuery(
		{ projectId },
		{ enabled: !!projectId, refetchInterval: WORKBOARD_POLL_MS },
	);

	// Live pane statuses come from the tabs store. Panes map to workspaces via
	// their tab: pane.tabId -> tab.id -> tab.workspaceId.
	const tabs = useTabsStore((s) => s.tabs);
	const panes = useTabsStore((s) => s.panes);

	const overlayByWorkspace = useMemo(() => {
		const tabToWorkspace = new Map<string, string>();
		for (const tab of tabs) tabToWorkspace.set(tab.id, tab.workspaceId);

		const statusesByWorkspace = new Map<
			string,
			(PaneStatus | undefined)[]
		>();
		for (const pane of Object.values(panes)) {
			const workspaceId = tabToWorkspace.get(pane.tabId);
			if (!workspaceId) continue;
			const list = statusesByWorkspace.get(workspaceId) ?? [];
			list.push(pane.status);
			statusesByWorkspace.set(workspaceId, list);
		}

		const overlay = new Map<string, AgentStatus>();
		for (const [workspaceId, statuses] of statusesByWorkspace) {
			const highest = getHighestPriorityStatus(statuses);
			if (highest === "permission") overlay.set(workspaceId, "waiting");
			else if (highest === "working") overlay.set(workspaceId, "working");
		}
		return overlay;
	}, [tabs, panes]);

	const roster = useMemo<RosterEntry[]>(() => {
		const entries = (rosterQuery.data ?? []) as RosterEntry[];
		return entries.map((entry) => {
			// Server "blocked" always wins over the client overlay.
			if (entry.status === "blocked") return entry;
			const override = overlayByWorkspace.get(entry.workspaceId);
			if (!override) return entry;
			return { ...entry, status: override };
		});
	}, [rosterQuery.data, overlayByWorkspace]);

	const activity = (activityQuery.data ?? []) as ActivityEvent[];
	const board = (workBoardQuery.data ?? EMPTY_BOARD) as WorkBoardData;

	return {
		roster,
		activity,
		board,
		isRosterLoading: rosterQuery.isLoading,
		isActivityLoading: activityQuery.isLoading,
		isBoardLoading: workBoardQuery.isLoading,
	};
}
