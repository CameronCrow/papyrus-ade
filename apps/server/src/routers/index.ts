import { router } from "../trpc";
import { healthRouter } from "./health";

/**
 * The server router. Phase 1 extraction lands the desktop's core routers here
 * (workspaces, projects, terminal, filesystem, changes, config, settings,
 * ports, sync, cache, utils, resource-metrics, browser-history, ui-state) as
 * they move into packages/server-core — see planning/PHASE_1.md §3.
 */
export const appRouter = router({
	health: healthRouter,
});

export type AppRouter = typeof appRouter;
