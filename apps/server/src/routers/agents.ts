import { projects, workspaces, worktrees } from "@superset/local-db";
import { getAgentWorktreePath } from "@papyrus/server-core/agent-home";
import { beginAgentInit } from "@papyrus/server-core/agent-init";
import { localDb } from "@papyrus/server-core/local-db";
import { workspaceInitManager } from "@papyrus/server-core/workspace-init-manager";
import {
	activateProject,
	getMaxProjectTabOrder,
	getMaxWorkspaceTabOrder,
	getProject,
	setLastActiveWorkspace,
} from "@papyrus/server-core/workspaces/db-helpers";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

/**
 * Agents (workspaces) + Categories (projects) — thin server shells over the
 * extracted core (PHASE_1.md §2b option b: package-local zod, shared
 * business logic). Mirrors the desktop's createAgent semantics: rows are
 * inserted immediately, then beginAgentInit builds the repo + memory
 * scaffold in the background.
 */

// Mirrors the desktop's createAgentInput (kept separate — the isolated
// linker means schemas can't cross the package boundary).
const createAgentInput = z.object({
	projectId: z.string(),
	name: z.string().min(1),
	role: z
		.string()
		.trim()
		.max(280)
		.optional()
		.transform((v) => (v ? v : undefined)),
	runtime: z.enum(["claude", "codex", "opencode"]).default("claude"),
	repo: z
		.discriminatedUnion("type", [
			z.object({ type: z.literal("init") }),
			z.object({ type: z.literal("clone"), url: z.string().min(1) }),
		])
		.default({ type: "init" }),
});

export const agentsRouter = router({
	createCategory: authedProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(({ input }) => {
			const project = localDb
				.insert(projects)
				.values({
					name: input.name,
					mainRepoPath: "", // Categories are pure groupings (no shared repo)
					color: "#8b7355",
					tabOrder: getMaxProjectTabOrder() + 1,
				})
				.returning()
				.get();
			return project;
		}),

	listCategories: authedProcedure.query(() =>
		localDb.select().from(projects).all(),
	),

	createAgent: authedProcedure
		.input(createAgentInput)
		.mutation(({ input }) => {
			const project = getProject(input.projectId);
			if (!project) {
				throw new Error(`Category ${input.projectId} not found`);
			}

			const agentId = randomUUID();
			const worktreePath = getAgentWorktreePath(agentId);
			// Placeholder branch; the init job resolves the real branch and
			// updates these rows.
			const branch = "main";

			const worktree = localDb
				.insert(worktrees)
				.values({
					projectId: input.projectId,
					path: worktreePath,
					branch,
					baseBranch: branch,
					gitStatus: null,
				})
				.returning()
				.get();

			const maxTabOrder = getMaxWorkspaceTabOrder(input.projectId);
			const workspace = localDb
				.insert(workspaces)
				.values({
					id: agentId,
					projectId: input.projectId,
					worktreeId: worktree.id,
					type: "worktree",
					branch,
					name: input.name,
					runtime: input.runtime,
					isUnnamed: false,
					tabOrder: maxTabOrder + 1,
				})
				.returning()
				.get();

			activateProject(project);
			setLastActiveWorkspace(agentId);

			beginAgentInit(agentId, {
				categoryId: input.projectId,
				worktreeId: worktree.id,
				agentName: input.name,
				role: input.role,
				runtime: input.runtime,
				source: input.repo,
			});

			return {
				workspace,
				worktreePath,
				worktreeId: worktree.id,
				isInitializing: true,
			};
		}),

	listAgents: authedProcedure.query(() =>
		localDb.select().from(workspaces).all(),
	),

	/** Poll the background init job; undefined once the job is cleared/done. */
	initProgress: authedProcedure
		.input(z.object({ agentId: z.string() }))
		.query(({ input }) => {
			return workspaceInitManager.getProgress(input.agentId) ?? null;
		}),
});
