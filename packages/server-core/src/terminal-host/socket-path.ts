import { chmodSync, existsSync, unlinkSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { SUPERSET_DIR_NAME } from "../constants";

/**
 * Terminal-host IPC endpoint (D6).
 *
 * posix: unix socket at ~/.papyrus[-<ws>]/terminal-host.sock (chmod 600).
 * win32: named pipe \\.\pipe\papyrus[-<ws>]-terminal-host-<user>. Pipes have
 * no filesystem file: they are per-user ACL'd by default, cannot be
 * chmod'ed or unlinked, and vanish when the server closes. existsSync DOES
 * work against the \\.\pipe\ namespace, so liveness probes stay uniform.
 */
export function getTerminalHostSocketPath(): string {
	return getTerminalHostSocketPathFor(SUPERSET_DIR_NAME);
}

/** Parameterized variant so tests can target an isolated data dir. */
export function getTerminalHostSocketPathFor(dirName: string): string {
	if (process.platform === "win32") {
		const user = userInfo().username.replace(/[^A-Za-z0-9-]/g, "-");
		const base = dirName.replace(/^\./, "");
		return `\\\\.\\pipe\\${base}-terminal-host-${user}`;
	}
	return join(homedir(), dirName, "terminal-host.sock");
}

export function isNamedPipePath(socketPath: string): boolean {
	return socketPath.startsWith("\\\\.\\pipe\\");
}

/** Remove a stale socket file. No-op for named pipes (nothing to unlink). */
export function removeSocketFile(socketPath: string): void {
	if (isNamedPipePath(socketPath)) return;
	try {
		if (existsSync(socketPath)) unlinkSync(socketPath);
	} catch {
		// best-effort
	}
}

/** Restrict socket access to the owner. No-op for named pipes (ACL'd per user). */
export function chmodSocketFile(socketPath: string, mode = 0o600): void {
	if (isNamedPipePath(socketPath)) return;
	try {
		chmodSync(socketPath, mode);
	} catch {
		// best-effort
	}
}
