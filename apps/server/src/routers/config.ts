import { MEMORY_SCAFFOLD_ENABLED } from "@papyrus/server-core/feature-flags";
import { authedProcedure, router } from "../trpc";

/**
 * Config router — server mirror of the desktop `config` paths the renderer
 * reads at boot. Only `featureFlags` is mirrored so far: it gates the Agent
 * Files panel (RightSidebar shows the tab only when memoryScaffold is on) and
 * therefore must be reachable for viewer parity on web. Other config procedures
 * (runtimeAvailability, setup-card flows, project config editing) remain
 * desktop-only until their surfaces are needed on web.
 */
export const configRouter = router({
	featureFlags: authedProcedure.query(() => ({
		memoryScaffold: MEMORY_SCAFFOLD_ENABLED,
	})),
});
