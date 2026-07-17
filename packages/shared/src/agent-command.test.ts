import { describe, expect, it } from "bun:test";
import {
	buildAgentPromptCommand,
	buildAgentSessionCommands,
	isClaudeFamilyRuntime,
} from "./agent-command";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";

describe("buildAgentPromptCommand", () => {
	it("adds `--` before codex prompt payload", () => {
		const command = buildAgentPromptCommand({
			prompt: "- Only modified file: runtime.ts",
			randomId: "1234-5678",
			agent: "codex",
		});

		expect(command).toContain(
			"--sandbox danger-full-access -- \"$(cat <<'SUPERSET_PROMPT_12345678'",
		);
		expect(command).toContain("- Only modified file: runtime.ts");
	});

	it("does not change non-codex commands", () => {
		const command = buildAgentPromptCommand({
			prompt: "hello",
			randomId: "abcd-efgh",
			agent: "claude",
		});

		expect(command).toStartWith(
			"claude --dangerously-skip-permissions \"$(cat <<'SUPERSET_PROMPT_abcdefgh'",
		);
	});
});

describe("buildAgentSessionCommands", () => {
	it("injects --resume <id> for claude when a session exists", () => {
		expect(
			buildAgentSessionCommands({ runtime: "claude", sessionId: SESSION_ID }),
		).toEqual([`claude --resume ${SESSION_ID} --dangerously-skip-permissions`]);
	});

	it("injects --resume after `claude` for OpenRouter (glm) variants", () => {
		const [command] = buildAgentSessionCommands({
			runtime: "glm",
			sessionId: SESSION_ID,
		});
		// Env assignments stay in front; --resume lands right after `claude`,
		// before the --model flag, so both the resume target and model apply.
		expect(command).toContain(`claude --resume ${SESSION_ID} --model`);
		expect(command).toStartWith('ANTHROPIC_BASE_URL="https://openrouter.ai/api"');
		// Exactly one resume flag (regex replaces only the first `claude` token).
		expect(command.match(/--resume/g)).toHaveLength(1);
	});

	it("starts fresh (base command) when there is no session id", () => {
		expect(
			buildAgentSessionCommands({ runtime: "claude", sessionId: null }),
		).toEqual(["claude --dangerously-skip-permissions"]);
	});

	it("never resumes a non-claude runtime even with a session id", () => {
		const commands = buildAgentSessionCommands({
			runtime: "codex",
			sessionId: SESSION_ID,
		});
		expect(commands.join(" ")).not.toContain("--resume");
	});

	it("ignores a malformed (non-UUID) session id", () => {
		expect(
			buildAgentSessionCommands({
				runtime: "claude",
				sessionId: "not-a-uuid; rm -rf /",
			}),
		).toEqual(["claude --dangerously-skip-permissions"]);
	});

	it("classifies claude-family runtimes", () => {
		expect(isClaudeFamilyRuntime("claude")).toBe(true);
		expect(isClaudeFamilyRuntime("glm")).toBe(true);
		expect(isClaudeFamilyRuntime("codex")).toBe(false);
		expect(isClaudeFamilyRuntime("gemini")).toBe(false);
	});
});
