import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PAPYRUS_HOME_DIR_ENV = "PAPYRUS_HOME_DIR";

/**
 * Papyrus home dir for the headless server. Mirrors the desktop app's
 * app-environment.ts resolution (same env var, same default) so the server
 * and the Electron app share one data dir. Kept dependency-free until the
 * shared module moves into packages/server-core (Phase 1 extraction).
 */
export function getPapyrusHomeDir(): string {
	return process.env[PAPYRUS_HOME_DIR_ENV] || join(homedir(), ".papyrus");
}

export const PAPYRUS_HOME_DIR_MODE = 0o700;
export const PAPYRUS_SENSITIVE_FILE_MODE = 0o600;

export function ensurePapyrusHomeDir(): string {
	const dir = getPapyrusHomeDir();
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true, mode: PAPYRUS_HOME_DIR_MODE });
	}
	// Best-effort on Windows: chmod maps poorly to ACLs but must not crash.
	try {
		chmodSync(dir, PAPYRUS_HOME_DIR_MODE);
	} catch {
		// noop
	}
	return dir;
}
