import { createRequire } from "node:module";
import { getDaemonTerminalManager } from "@papyrus/server-core/terminal";
import {
	setDaemonExecPathResolver,
	setDaemonScriptPathResolver,
} from "@papyrus/server-core/terminal-host/client";
import { workspaces, worktrees } from "@superset/local-db";
import { localDb } from "@papyrus/server-core/local-db";
import { observable } from "@trpc/server/observable";
import { eq } from "drizzle-orm";
import { join } from "node:path";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

// The daemon runs under plain Node from a CJS bundle (see scripts/build.ts),
// where it sits next to server.cjs in dist/. import.meta.url is undefined in
// that bundle, so resolve via __dirname there and fall back to createRequire
// only in source/tooling mode.
const daemonBundle =
	typeof __dirname !== "undefined"
		? join(__dirname, "terminal-host.cjs")
		: createRequire(import.meta.url).resolve(
				"@papyrus/server-core/terminal-host/daemon",
			);
setDaemonScriptPathResolver(() => daemonBundle);
setDaemonExecPathResolver(() => (process.versions.bun ? "node" : process.execPath));

function terminal() {
	return getDaemonTerminalManager();
}

/** Resolve a workspace's on-disk worktree path for cwd defaulting. */
function workspaceCwd(workspaceId: string): string | undefined {
	const ws = localDb
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.get();
	if (!ws?.worktreeId) return undefined;
	const wt = localDb
		.select()
		.from(worktrees)
		.where(eq(worktrees.id, ws.worktreeId))
		.get();
	return wt?.path;
}

/**
 * Terminal router — mirrors the desktop router paths (PHASE_2: the desktop
 * router tree is the API contract) over the extracted DaemonTerminalManager,
 * so the renderer's terminal UI works unchanged. The manager owns scrollback,
 * history, and the per-pane event fan-out.
 */
export const terminalRouter = router({
	createOrAttach: authedProcedure
		.input(
			z.object({
				paneId: z.string(),
				tabId: z.string(),
				workspaceId: z.string(),
				cols: z.number().optional(),
				rows: z.number().optional(),
				cwd: z.string().optional(),
				skipColdRestore: z.boolean().optional(),
				allowKilled: z.boolean().optional(),
				themeType: z.enum(["dark", "light"]).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const ws = localDb
				.select()
				.from(workspaces)
				.where(eq(workspaces.id, input.workspaceId))
				.get();
			const workspacePath = workspaceCwd(input.workspaceId);
			const result = await terminal().createOrAttach({
				paneId: input.paneId,
				tabId: input.tabId,
				workspaceId: input.workspaceId,
				workspaceName: ws?.name,
				workspacePath,
				cwd: input.cwd ?? workspacePath,
				cols: input.cols,
				rows: input.rows,
				skipColdRestore: input.skipColdRestore,
				allowKilled: input.allowKilled,
				themeType: input.themeType,
				runtime: ws?.runtime ?? null,
			});
			return {
				paneId: input.paneId,
				isNew: result.isNew,
				scrollback: result.scrollback,
				wasRecovered: result.wasRecovered,
				isColdRestore: result.isColdRestore,
				previousCwd: result.previousCwd,
				claudeSessionId: result.claudeSessionId,
				snapshot: result.snapshot,
			};
		}),

	write: authedProcedure
		.input(z.object({ paneId: z.string(), data: z.string() }))
		.mutation(({ input }) => {
			terminal().write(input);
		}),

	resize: authedProcedure
		.input(
			z.object({
				paneId: z.string(),
				cols: z.number().int().min(1).max(1000),
				rows: z.number().int().min(1).max(1000),
			}),
		)
		.mutation(({ input }) => {
			terminal().resize(input);
		}),

	signal: authedProcedure
		.input(z.object({ paneId: z.string(), signal: z.string().optional() }))
		.mutation(({ input }) => {
			terminal().signal(input);
		}),

	kill: authedProcedure
		.input(z.object({ paneId: z.string() }))
		.mutation(async ({ input }) => {
			await terminal().kill({ paneId: input.paneId });
		}),

	detach: authedProcedure
		.input(z.object({ paneId: z.string() }))
		.mutation(({ input }) => {
			terminal().detach(input);
		}),

	clearScrollback: authedProcedure
		.input(z.object({ paneId: z.string() }))
		.mutation(async ({ input }) => {
			await terminal().clearScrollback(input);
		}),

	listDaemonSessions: authedProcedure.query(async () => {
		return terminal().listDaemonSessions();
	}),

	/**
	 * Per-pane stream. Exit is a state transition, NOT stream completion
	 * (paneId is reused across restarts) — matches the desktop invariant.
	 */
	stream: authedProcedure.input(z.string()).subscription(({ input: paneId }) =>
		observable<
			| { type: "data"; data: string }
			| {
					type: "exit";
					exitCode: number;
					signal?: number;
					reason?: "killed" | "exited" | "error";
			  }
			| { type: "disconnect"; reason: string }
			| { type: "error"; error: string; code?: string }
		>((emit) => {
			const mgr = terminal();
			const onData = (data: string) => emit.next({ type: "data", data });
			const onExit = (
				exitCode: number,
				signal?: number,
				reason?: "killed" | "exited" | "error",
			) => emit.next({ type: "exit", exitCode, signal, reason });
			const onDisconnect = (reason: string) =>
				emit.next({ type: "disconnect", reason });
			const onError = (payload: { error: string; code?: string }) =>
				emit.next({ type: "error", error: payload.error, code: payload.code });

			mgr.on(`data:${paneId}`, onData);
			mgr.on(`exit:${paneId}`, onExit);
			mgr.on(`disconnect:${paneId}`, onDisconnect);
			mgr.on(`error:${paneId}`, onError);
			return () => {
				mgr.off(`data:${paneId}`, onData);
				mgr.off(`exit:${paneId}`, onExit);
				mgr.off(`disconnect:${paneId}`, onDisconnect);
				mgr.off(`error:${paneId}`, onError);
			};
		}),
	),
});
