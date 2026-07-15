import { router } from "../trpc";
import { changesRouter } from "./changes";
import { claudeSessionsRouter } from "./claude-sessions";
import { configRouter } from "./config";
import { filesystemRouter } from "./filesystem";
import { healthRouter } from "./health";
import { notificationsRouter } from "./notifications";
import { projectsRouter } from "./projects";
import { resourceMetricsRouter } from "./resource-metrics";
import { settingsRouter, syncRouter } from "./stubs";
import { terminalRouter } from "./terminal";
import { uiStateRouter } from "./ui-state";
import { workspacesRouter } from "./workspaces";

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
	notifications: notificationsRouter,
	terminal: terminalRouter,
	uiState: uiStateRouter,
	changes: changesRouter,
	resourceMetrics: resourceMetricsRouter,
	config: configRouter,
	claudeSessions: claudeSessionsRouter,
});

export type AppRouter = typeof appRouter;
