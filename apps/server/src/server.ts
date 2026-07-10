import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { extractToken, loadOrMintToken, verifyToken } from "./auth";
import type { ServerConfig } from "./config";
import { appRouter } from "./routers";
import type { ServerContext } from "./trpc";

const TRPC_PREFIX = "/trpc";

export interface RunningServer {
	server: Server;
	close(): Promise<void>;
}

export function startServer(config: ServerConfig): Promise<RunningServer> {
	const { token, minted, path } = loadOrMintToken();

	const contextFor = (req: IncomingMessage): ServerContext => ({
		authed: verifyToken(token, extractToken(req.headers.authorization, req.url)),
	});

	const trpcHandler = createHTTPHandler({
		router: appRouter,
		createContext: ({ req }) => contextFor(req),
	});

	const server = createServer((req, res) => {
		if (req.url?.startsWith(TRPC_PREFIX)) {
			req.url = req.url.slice(TRPC_PREFIX.length) || "/";
			trpcHandler(req, res);
			return;
		}
		// Phase 2 serves the built webui SPA from here (same origin, no CORS).
		res.writeHead(404, { "content-type": "text/plain" });
		res.end("papyrus-server: not found\n");
	});

	// WebSocket endpoint for subscriptions. The token is verified at upgrade
	// time (Authorization header or ?token= query param) — an unauthenticated
	// socket is refused before tRPC ever sees it.
	const wss = new WebSocketServer({ noServer: true });
	applyWSSHandler({
		wss,
		router: appRouter,
		// Upgrade-time verification is the gate; sockets that reach tRPC are authed.
		createContext: () => ({ authed: true }),
	});

	server.on("upgrade", (req, socket, head) => {
		const ok = verifyToken(
			token,
			extractToken(req.headers.authorization, req.url),
		);
		if (!ok || !req.url?.startsWith(TRPC_PREFIX)) {
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
			socket.destroy();
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit("connection", ws, req);
		});
	});

	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(config.port, config.bind, () => {
			console.log(
				`papyrus-server listening on http://${config.bind}:${config.port}${TRPC_PREFIX}`,
			);
			if (minted) {
				console.log(`Minted auth token (shown once): ${token}`);
				console.log(`Token stored at: ${path}`);
			} else {
				console.log(`Auth token: ${path}`);
			}
			resolve({
				server,
				close: () =>
					new Promise<void>((res, rej) => {
						wss.close();
						server.close((e) => (e ? rej(e) : res()));
					}),
			});
		});
	});
}
