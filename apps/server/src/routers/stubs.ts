import { observable } from "@trpc/server/observable";
import { authedProcedure, router } from "../trpc";

/**
 * Minimal stubs for desktop router paths the renderer calls at boot but
 * which have no headless behavior yet. Each is a candidate for a real
 * implementation as Phase 2 hardening continues.
 */

export const settingsRouter = router({
	/** Ringtones are a desktop nicety; none selected headless. */
	getSelectedRingtoneId: authedProcedure.query(() => null),
});

export const syncRouter = router({
	/** Cross-window app-state sync — single-window web has nothing to sync yet. */
	appStateUpdates: authedProcedure.subscription(() =>
		observable<never>(() => () => {}),
	),
});
