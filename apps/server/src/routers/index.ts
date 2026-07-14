import { router } from "../trpc";
import { projectsRouter } from "./projects";
import { settingsRouter, syncRouter } from "./stubs";
import { workspacesRouter } from "./workspaces";
import { filesystemRouter } from "./filesystem";
import { healthRouter } from "./health";
import { uiStateRouter } from "./ui-state";
import { terminalRouter } from "./terminal";

/**
 * The server router. Phase 1 extraction lands the desktop's core routers here
 * (workspaces, projects, terminal, filesystem, changes, config, settings,
 * ports, sync, cache, utils, resource-metrics, browser-history, ui-state) as
 * they move into packages/server-core — see planning/PHASE_1.md §3.
 */
export const appRouter = router({
	projects: projectsRouter,
	settings: settingsRouter,
	sync: syncRouter,
	workspaces: workspacesRouter,
	filesystem: filesystemRouter,
	health: healthRouter,
	terminal: terminalRouter,
	uiState: uiStateRouter,
});

export type AppRouter = typeof appRouter;
