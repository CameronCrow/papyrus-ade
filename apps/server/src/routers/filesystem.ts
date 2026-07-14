import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { z } from "zod/v4";
import { authedProcedure, router } from "../trpc";

interface DirectoryEntry {
	id: string;
	name: string;
	path: string;
	relativePath: string;
	isDirectory: boolean;
}

/**
 * Filesystem router — mirrors the desktop paths the Agent Files panel calls.
 * Reads happen on the server (where the agent worktrees live); the browser
 * only ever sees the resulting tree/content.
 */
export const filesystemRouter = router({
	readDirectory: authedProcedure
		.input(
			z.object({
				dirPath: z.string(),
				rootPath: z.string(),
				includeHidden: z.boolean().default(false),
			}),
		)
		.query(async ({ input }): Promise<DirectoryEntry[]> => {
			try {
				const entries = await readdir(input.dirPath, { withFileTypes: true });
				return entries
					.filter((e) => input.includeHidden || !e.name.startsWith("."))
					.map((e) => {
						const fullPath = join(input.dirPath, e.name);
						return {
							id: relative(input.rootPath, fullPath),
							name: e.name,
							path: fullPath,
							relativePath: relative(input.rootPath, fullPath),
							isDirectory: e.isDirectory(),
						};
					})
					.sort((a, b) =>
						a.isDirectory !== b.isDirectory
							? a.isDirectory
								? -1
								: 1
							: a.name.localeCompare(b.name),
					);
			} catch {
				return [];
			}
		}),

	readFile: authedProcedure
		.input(z.object({ filePath: z.string() }))
		.query(async ({ input }) => {
			try {
				return { content: await readFile(input.filePath, "utf8") };
			} catch (error) {
				return {
					content: "",
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}),
});
