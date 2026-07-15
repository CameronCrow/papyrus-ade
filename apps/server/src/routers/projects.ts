import { projects, workspaces } from "@superset/local-db";
import { localDb } from "@papyrus/server-core/local-db";
import { getDaemonTerminalManager } from "@papyrus/server-core/terminal";
import {
	hideProject,
	updateActiveWorkspaceIfRemoved,
} from "@papyrus/server-core/workspaces/db-helpers";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
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

	update: authedProcedure
		.input(
			z.object({
				id: z.string(),
				patch: z.object({
					name: z.string().trim().min(1).optional(),
					color: z.string().optional(),
					branchPrefixMode: z.string().nullable().optional(),
					branchPrefixCustom: z.string().nullable().optional(),
					workspaceBaseBranch: z.string().nullable().optional(),
					worktreeBaseDir: z.string().nullable().optional(),
					hideImage: z.boolean().optional(),
					defaultApp: z.string().nullable().optional(),
				}),
			}),
		)
		.mutation(({ input }) => {
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
			localDb
				.update(projects)
				.set({
					...(input.patch.name !== undefined && { name: input.patch.name }),
					...(input.patch.color !== undefined && { color: input.patch.color }),
					...(input.patch.hideImage !== undefined && {
						hideImage: input.patch.hideImage,
					}),
					lastOpenedAt: Date.now(),
				})
				.where(eq(projects.id, input.id))
				.run();
			return { success: true };
		}),

	reorder: authedProcedure
		.input(z.object({ fromIndex: z.number(), toIndex: z.number() }))
		.mutation(({ input }) => {
			const active = localDb
				.select()
				.from(projects)
				.all()
				.filter((p) => p.tabOrder !== null)
				.sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0));
			const { fromIndex, toIndex } = input;
			if (
				fromIndex < 0 ||
				fromIndex >= active.length ||
				toIndex < 0 ||
				toIndex >= active.length
			) {
				throw new Error("Invalid fromIndex or toIndex");
			}
			const [removed] = active.splice(fromIndex, 1);
			active.splice(toIndex, 0, removed);
			for (let i = 0; i < active.length; i++) {
				localDb
					.update(projects)
					.set({ tabOrder: i })
					.where(eq(projects.id, active[i].id))
					.run();
			}
			return { success: true };
		}),

	close: authedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			const project = localDb
				.select()
				.from(projects)
				.where(eq(projects.id, input.id))
				.get();
			if (!project) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
			}

			const projectWorkspaces = localDb
				.select()
				.from(workspaces)
				.where(eq(workspaces.projectId, input.id))
				.all();

			const terminal = getDaemonTerminalManager();
			let totalFailed = 0;
			for (const workspace of projectWorkspaces) {
				const result = await terminal.killByWorkspaceId(workspace.id);
				totalFailed += result.failed;
			}

			const closedIds = projectWorkspaces.map((w) => w.id);
			if (closedIds.length > 0) {
				localDb.delete(workspaces).where(inArray(workspaces.id, closedIds)).run();
			}

			hideProject(input.id);
			for (const id of closedIds) {
				updateActiveWorkspaceIfRemoved(id);
			}

			return {
				success: true,
				terminalWarning:
					totalFailed > 0
						? `${totalFailed} terminal process(es) may still be running`
						: undefined,
			};
		}),
});
