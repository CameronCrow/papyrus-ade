/**
 * Headless smoke test: boots nothing itself — point it at a running server.
 *   bun run src/cli.ts serve            # terminal 1
 *   bun run scripts/smoke.ts            # terminal 2
 * Verifies: unauthenticated rejection, authed HTTP query, WS subscription.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	createTRPCClient,
	createWSClient,
	httpBatchLink,
	wsLink,
} from "@trpc/client";
import superjson from "superjson";
import WebSocket from "ws";
import type { AppRouter } from "../src/routers";

const PORT = Number(process.env.PAPYRUS_PORT || 7777);
const BASE = `http://127.0.0.1:${PORT}/trpc`;
const home = process.env.PAPYRUS_HOME_DIR || join(homedir(), ".papyrus");
const token = readFileSync(join(home, "token"), "utf8").trim();

function client(auth: boolean) {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: BASE,
				transformer: superjson,
				headers: auth ? { authorization: `Bearer ${token}` } : {},
			}),
		],
	});
}

async function main() {
	const failures: string[] = [];

	// 1. Unauthenticated info must be rejected
	try {
		await client(false).health.info.query();
		failures.push("unauthenticated health.info was NOT rejected");
	} catch {
		console.log("ok: unauthenticated request rejected");
	}

	// 2. Authenticated query
	const info = await client(true).health.info.query();
	if (info.name !== "papyrus-server") failures.push("health.info wrong payload");
	else console.log(`ok: health.info → ${info.platform}/${info.arch} node ${info.node}`);

	// 3. WS subscription streams ticks
	const wsClient = createWSClient({
		url: `ws://127.0.0.1:${PORT}/trpc?token=${token}`,
		WebSocket: WebSocket as unknown as typeof globalThis.WebSocket,
	});
	const wsTrpc = createTRPCClient<AppRouter>({
		links: [wsLink({ client: wsClient, transformer: superjson })],
	});
	const ticks = await new Promise<number>((resolve, reject) => {
		let n = 0;
		const sub = wsTrpc.health.tick.subscribe(undefined, {
			onData: () => {
				n++;
				if (n >= 2) {
					sub.unsubscribe();
					resolve(n);
				}
			},
			onError: reject,
		});
		setTimeout(() => reject(new Error("no ticks within 10s")), 10000);
	});
	console.log(`ok: WS subscription delivered ${ticks} ticks`);
	wsClient.close();

	// 4. Unauthenticated WS upgrade must be refused
	await new Promise<void>((resolve, reject) => {
		const raw = new WebSocket(`ws://127.0.0.1:${PORT}/trpc`);
		raw.on("open", () => reject(new Error("unauthenticated WS was accepted")));
		raw.on("error", () => resolve());
	});
	console.log("ok: unauthenticated WS upgrade refused");

	// 5. Terminal end-to-end: session in the daemon (named pipe on Windows),
	// bytes streamed back over the WS subscription.
	const paneId = `smoke-${Date.now()}`;
	const marker = "SMOKE_TERMINAL_OK";
	const wsClient2 = createWSClient({
		url: `ws://127.0.0.1:${PORT}/trpc?token=${token}`,
		WebSocket: WebSocket as unknown as typeof globalThis.WebSocket,
	});
	const wsTrpc2 = createTRPCClient<AppRouter>({
		links: [wsLink({ client: wsClient2, transformer: superjson })],
	});

	let received = "";
	const gotMarker = new Promise<void>((resolve, reject) => {
		const sub = wsTrpc2.terminal.stream.subscribe(
			{ paneId },
			{
				onData: (evt) => {
					if (evt.type === "data") {
						received += evt.data;
						if (received.includes(marker)) {
							sub.unsubscribe();
							resolve();
						}
					}
				},
				onError: reject,
			},
		);
		setTimeout(() => reject(new Error("no terminal marker within 30s")), 30000);
	});

	const snapshot = await client(true).terminal.createOrAttach.mutate({
		sessionId: paneId,
		workspaceId: "smoke-ws",
		paneId,
		tabId: "smoke-tab",
		cols: 80,
		rows: 24,
		cwd: process.env.USERPROFILE || process.env.HOME || ".",
	});
	console.log(`ok: terminal session created (attached=${!!snapshot})`);

	await client(true).terminal.write.mutate({
		paneId,
		data: `echo ${marker}\r`,
	});
	await gotMarker;
	console.log("ok: terminal bytes streamed over WS subscription");

	await client(true).terminal.kill.mutate({ paneId });
	console.log("ok: terminal session killed");
	wsClient2.close();

	if (failures.length) {
		console.error("SMOKE FAILURES:", failures);
		process.exit(1);
	}
	console.log("SMOKE OK");
	process.exit(0);
}

main().catch((e) => {
	console.error("SMOKE FAILED:", e);
	process.exit(1);
});
