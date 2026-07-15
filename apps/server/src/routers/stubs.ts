import { localDb } from "@papyrus/server-core/local-db";
import {
	clearProviderKey,
	getProviderKeyStatus,
	PROVIDER_IDS,
	setProviderKey,
} from "@papyrus/server-core/provider-keys";
import { settings } from "@superset/local-db";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

/**
 * Minimal stubs for desktop router paths the renderer calls at boot but
 * which have no headless behavior yet. Each is a candidate for a real
 * implementation as Phase 2 hardening continues.
 */

export const settingsRouter = router({
	/** Ringtones are a desktop nicety; none selected headless. */
	getSelectedRingtoneId: authedProcedure.query(() => null),

	// Notification sound mute — the web shell reads this to decide whether its
	// Web Notifications are silent (mirrors the desktop ringtone toggle).
	// Persisted in the same `settings` row (id=1) the desktop uses.
	getNotificationSoundsMuted: authedProcedure.query(() => {
		const row = localDb.select().from(settings).get();
		return row?.notificationSoundsMuted ?? false;
	}),

	setNotificationSoundsMuted: authedProcedure
		.input(z.object({ muted: z.boolean() }))
		.mutation(({ input }) => {
			localDb
				.insert(settings)
				.values({ id: 1, notificationSoundsMuted: input.muted })
				.onConflictDoUpdate({
					target: settings.id,
					set: { notificationSoundsMuted: input.muted },
				})
				.run();
			return { success: true };
		}),

	// Provider API keys — encrypted at rest via the server's file-key
	// SecretStore. The renderer only ever learns presence; the key itself is
	// never returned.
	providerKeys: router({
		status: authedProcedure.query(() => getProviderKeyStatus()),

		set: authedProcedure
			.input(
				z.object({
					provider: z.enum(PROVIDER_IDS),
					key: z.string().refine((v) => v.trim().length > 0, {
						message: "API key must not be empty",
					}),
				}),
			)
			.mutation(({ input }) => {
				try {
					setProviderKey(input.provider, input.key);
				} catch (error) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message:
							error instanceof Error
								? error.message
								: "Failed to store provider key",
					});
				}
				return { success: true };
			}),

		clear: authedProcedure
			.input(z.object({ provider: z.enum(PROVIDER_IDS) }))
			.mutation(({ input }) => {
				clearProviderKey(input.provider);
				return { success: true };
			}),
	}),
});

export const syncRouter = router({
	/** Cross-window app-state sync — single-window web has nothing to sync yet. */
	appStateUpdates: authedProcedure.subscription(() =>
		observable<never>(() => () => {}),
	),
});
