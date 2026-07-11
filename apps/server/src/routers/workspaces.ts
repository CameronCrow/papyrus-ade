import { projects, workspaces, worktrees } from "@superset/local-db";
import { getAgentWorktreePath } from "@papyrus/server-core/agent-home";
import { beginAgentInit } from "@papyrus/server-core/agent-init";
import { localDb } from "@papyrus/server-core/local-db";
import { workspaceInitManager } from "@papyrus/server-core/workspace-init-manager";
import type { WorkspaceInitProgress } from "@papyrus/server-core/types/workspace-init";
import {
	activateProject,
	getMaxWorkspaceTabOrder,
	getProject,
	setLastActiveWorkspace,
} from "@papyrus/server-core/workspaces/db-helpers";
import { observable } from "@trpc/server/observable";
import { eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

/**
 * Agents (workspaces) — server mirror of the desktop router paths. Thin
 * shells over the extracted core (agent-init, workspace-init-manager,
 * db-helpers all live in server-core).
 */

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

export const workspacesRouter = router({
	get: authedProcedure
		.input(z.object({ id: z.string() }))
		.query(({ input }) => {
			const workspace = localDb
				.select()
				.from(workspaces)
				.where(eq(workspaces.id, input.id))
				.get();
			if (!workspace) {
				throw new Error(`Workspace ${input.id} not found`);
			}
			const project = localDb
				.select()
				.from(projects)
				.where(eq(projects.id, workspace.projectId))
				.get();
			const worktree = workspace.worktreeId
				? localDb
						.select()
						.from(worktrees)
						.where(eq(worktrees.id, workspace.worktreeId))
						.get()
				: null;
			return {
				...workspace,
				type: workspace.type as "worktree" | "branch",
				worktreePath: worktree?.path ?? "",
				role: null,
				project: project
					? {
							id: project.id,
							name: project.name,
							mainRepoPath: project.mainRepoPath,
							githubOwner: project.githubOwner ?? null,
							defaultBranch: project.defaultBranch ?? null,
						}
					: null,
				worktree: worktree ?? null,
			};
		}),

	getAll: authedProcedure.query(() =>
		localDb.select().from(workspaces).all(),
	),

	getAllGrouped: authedProcedure.query(() => {
		const activeProjects = localDb
			.select()
			.from(projects)
			.where(isNotNull(projects.tabOrder))
			.all();
		const allWorktrees = localDb.select().from(worktrees).all();
		const worktreePathById = new Map(allWorktrees.map((w) => [w.id, w.path]));
		const allWorkspaces = localDb.select().from(workspaces).all();

		return activeProjects
			.sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0))
			.map((project) => ({
				project: {
					id: project.id,
					name: project.name,
					color: project.color,
					tabOrder: project.tabOrder ?? 0,
					githubOwner: project.githubOwner ?? null,
					mainRepoPath: project.mainRepoPath,
					hideImage: Boolean(project.hideImage),
					iconUrl: project.iconUrl ?? null,
				},
				workspaces: allWorkspaces
					.filter((w) => w.projectId === project.id)
					.sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0))
					.map((w) => ({
						...w,
						worktreePath: w.worktreeId
							? (worktreePathById.get(w.worktreeId) ?? "")
							: "",
					})),
			}));
	}),

	createAgent: authedProcedure
		.input(createAgentInput)
		.mutation(({ input }) => {
			const project = getProject(input.projectId);
			if (!project) {
				throw new Error(`Category ${input.projectId} not found`);
			}

			const agentId = randomUUID();
			const worktreePath = getAgentWorktreePath(agentId);
			const branch = "main"; // placeholder; init job resolves the real one

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
					tabOrder: getMaxWorkspaceTabOrder(input.projectId) + 1,
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

	getInitProgress: authedProcedure
		.input(z.object({ workspaceId: z.string() }))
		.query(
			({ input }) => workspaceInitManager.getProgress(input.workspaceId) ?? null,
		),

	onInitProgress: authedProcedure
		.input(
			z.object({ workspaceIds: z.array(z.string()).optional() }).optional(),
		)
		.subscription(({ input }) =>
			observable<WorkspaceInitProgress>((emit) => {
				const handler = (progress: WorkspaceInitProgress) => {
					if (
						input?.workspaceIds &&
						!input.workspaceIds.includes(progress.workspaceId)
					) {
						return;
					}
					emit.next(progress);
				};
				for (const progress of workspaceInitManager.getAllProgress()) {
					handler(progress);
				}
				workspaceInitManager.on("progress", handler);
				return () => workspaceInitManager.off("progress", handler);
			}),
		),
});
