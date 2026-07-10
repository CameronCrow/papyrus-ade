import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	getTerminalHostClient,
	setDaemonExecPathResolver,
	setDaemonScriptPathResolver,
} from "@papyrus/server-core/terminal-host/client";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

// The daemon runs under plain Node from a CJS bundle (scripts/build-daemon.ts):
// node-pty's ConPTY conin socket breaks under a bun-run daemon on Windows,
// and the bundle inlines the xterm window polyfill + erases TS enums.
const daemonBundle = join(import.meta.dirname, "..", "..", "dist", "terminal-host.cjs");

setDaemonScriptPathResolver(() => {
	if (!existsSync(daemonBundle)) {
		throw new Error(
			`terminal-host daemon bundle missing at ${daemonBundle} — run: bun run build:daemon`,
		);
	}
	return daemonBundle;
});

// Spawn with node even when the server itself runs under bun.
setDaemonExecPathResolver(() =>
	process.versions.bun ? "node" : process.execPath,
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
