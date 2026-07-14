import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { extractToken, loadOrMintToken, verifyToken } from "./auth";
import type { ServerConfig } from "./config";
import { isLockedOut, recordAuthResult } from "./rate-limit";
import { appRouter } from "./routers";
import { serveStatic } from "./static";
import type { ServerContext } from "./trpc";

const TRPC_PREFIX = "/trpc";

export interface RunningServer {
	server: Server;
	close(): Promise<void>;
}

export function startServer(config: ServerConfig): Promise<RunningServer> {
	const { token, minted, path } = loadOrMintToken();

	const contextFor = (req: IncomingMessage): ServerContext => {
		if (isLockedOut(req)) return { authed: false };
		const ok = verifyToken(
			token,
			extractToken(req.headers.authorization, req.url),
		);
		recordAuthResult(req, ok);
		return { authed: ok };
	};

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
		// The built webui SPA, same origin (no CORS). 404s fall back to
		// index.html for client-side routing.
		serveStatic(req, res);
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
		if (isLockedOut(req)) {
			socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
			socket.destroy();
			return;
		}
		const ok = verifyToken(
			token,
			extractToken(req.headers.authorization, req.url),
		);
		recordAuthResult(req, ok);
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
