import { listGitHubRepos } from "@papyrus/server-core/github-repos";
import { publicProcedure, router } from "..";

/**
 * GitHub repo picker (issue #48) — feeds the New Agent modal's "Pick from
 * GitHub" repo mode. Thin shell over the server-core `gh` CLI wrapper.
 */
export const createGithubRouter = () => {
	return router({
		listRepos: publicProcedure.query(() => listGitHubRepos()),
	});
};
