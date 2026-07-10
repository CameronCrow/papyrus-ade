import { createRequire } from "node:module";
import {
	getTerminalHostClient,
	setDaemonScriptPathResolver,
	setDaemonSpawnArgsResolver,
} from "@papyrus/server-core/terminal-host/client";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

const require = createRequire(import.meta.url);

// The client spawns the daemon via process.execPath. Under bun (dev) that
// runs the TS source directly; a bundled production daemon lands with the
// server build step (Phase 1 hardening).
setDaemonScriptPathResolver(() =>
	require.resolve("@papyrus/server-core/terminal-host/daemon"),
);

// Under bun, CJS deps (xterm-headless) evaluate at link time — before ESM
// import order can apply the window polyfill — so preload it explicitly.
setDaemonSpawnArgsResolver((scriptPath) =>
	process.versions.bun
		? [
				"run",
				"--preload",
				require.resolve(
					"@papyrus/server-core/terminal-host/xterm-env-polyfill",
				),
				scriptPath,
			]
		: [scriptPath],
);

const createOrAttachInput = z.object({
	sessionId: z.string().min(1),
	workspaceId: z.string().min(1),
	paneId: z.string().min(1),
	tabId: z.string().min(1),
	cols: z.number().int().min(1).max(1000),
	rows: z.number().int().min(1).max(1000),
	cwd: z.string().optional(),
	shell: z.string().optional(),
});

/**
 * Lean terminal router straight over the daemon client — enough for the
 * Phase-1 headless smoke path (create session → write → stream bytes →
 * detach/kill). The desktop's full terminal router (env building, agent
 * runtimes, workspace wiring) lands when the manager layer is extracted.
 */
export const terminalRouter = router({
	createOrAttach: authedProcedure
		.input(createOrAttachInput)
		.mutation(async ({ input }) => {
			const client = getTerminalHostClient();
			return client.createOrAttach(input);
		}),

	write: authedProcedure
		.input(z.object({ paneId: z.string(), data: z.string() }))
		.mutation(({ input }) => {
			getTerminalHostClient().writeNoAck({
				sessionId: input.paneId,
				data: input.data,
			});
		}),

	resize: authedProcedure
		.input(
			z.object({
				paneId: z.string(),
				cols: z.number().int().min(1).max(1000),
				rows: z.number().int().min(1).max(1000),
			}),
		)
		.mutation(async ({ input }) => {
			await getTerminalHostClient().resize({
				sessionId: input.paneId,
				cols: input.cols,
				rows: input.rows,
			});
		}),

	detach: authedProcedure
		.input(z.object({ paneId: z.string() }))
		.mutation(async ({ input }) => {
			await getTerminalHostClient().detach({ sessionId: input.paneId });
		}),

	kill: authedProcedure
		.input(z.object({ paneId: z.string() }))
		.mutation(async ({ input }) => {
			await getTerminalHostClient().kill({ sessionId: input.paneId });
		}),

	listSessions: authedProcedure.query(async () => {
		return getTerminalHostClient().listSessions();
	}),

	/**
	 * Stream terminal output/exit for one session. Mirrors the desktop
	 * invariant: exit is a state transition, NOT stream completion.
	 */
	stream: authedProcedure
		.input(z.object({ paneId: z.string() }))
		.subscription(({ input }) =>
			observable<
				| { type: "data"; data: string }
				| { type: "exit"; exitCode: number; signal?: number }
			>((emit) => {
				const client = getTerminalHostClient();
				const onData = (sessionId: string, data: string) => {
					if (sessionId === input.paneId) emit.next({ type: "data", data });
				};
				const onExit = (
					sessionId: string,
					exitCode: number,
					signal?: number,
				) => {
					if (sessionId === input.paneId)
						emit.next({ type: "exit", exitCode, signal });
				};
				client.on("data", onData);
				client.on("exit", onExit);
				return () => {
					client.off("data", onData);
					client.off("exit", onExit);
				};
			}),
		),
});
