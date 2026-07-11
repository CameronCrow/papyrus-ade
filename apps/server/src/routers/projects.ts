import { projects } from "@superset/local-db";
import { localDb } from "@papyrus/server-core/local-db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

/**
 * Categories (projects) — server mirror of the desktop router paths the
 * renderer calls (PHASE_2: the desktop router tree IS the API contract).
 */

const CATEGORY_COLORS = [
	"#8b7355",
	"#6b8e23",
	"#4682b4",
	"#9370db",
	"#cd5c5c",
	"#2e8b57",
];

export const projectsRouter = router({
	get: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(({ input }) => {
			const project = localDb
				.select()
				.from(projects)
				.where(eq(projects.id, input.id))
				.get();
			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Project ${input.id} not found`,
				});
			}
			return project;
		}),

	createCategory: authedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				color: z.string().optional(),
			}),
		)
		.mutation(({ input }) => {
			const allProjects = localDb.select().from(projects).all();
			const maxTabOrder = allProjects.reduce(
				(max, p) => (p.tabOrder != null && p.tabOrder > max ? p.tabOrder : max),
				-1,
			);
			return localDb
				.insert(projects)
				.values({
					mainRepoPath: "",
					name: input.name,
					color:
						input.color ??
						(CATEGORY_COLORS[allProjects.length % CATEGORY_COLORS.length] ?? "#8b7355"),
					tabOrder: maxTabOrder + 1,
				})
				.returning()
				.get();
		}),
});
