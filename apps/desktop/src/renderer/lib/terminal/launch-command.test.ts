import { describe, expect, it, mock } from "bun:test";
import {
	buildTerminalCommand,
	launchCommandInPane,
	writeCommandsInPane,
} from "./launch-command";

describe("launchCommandInPane", () => {
	it("creates a terminal session and writes the command with a newline", async () => {
		const createOrAttach = mock(async () => ({}));
		const write = mock(async () => ({}));

		await launchCommandInPane({
			paneId: "pane-1",
			tabId: "tab-1",
			workspaceId: "ws-1",
			command: "echo hello",
			createOrAttach,
			write,
		});

		expect(createOrAttach).toHaveBeenCalledWith({
			paneId: "pane-1",
			tabId: "tab-1",
			workspaceId: "ws-1",
		});
		expect(write).toHaveBeenCalledWith({
			paneId: "pane-1",
			data: "echo hello\n",
			throwOnError: true,
		});
	});

	it("settles before writing when a fresh shell was spawned (issue #49)", async () => {
		const createOrAttach = mock(async () => ({ isNew: true }));
		const write = mock(async () => ({}));
		const order: string[] = [];
		const delay = mock(async (_ms: number) => {
			order.push("delay");
		});
		const wrappedWrite = mock(async (input: { paneId: string; data: string }) => {
			order.push("write");
			return write(input);
		});

		await launchCommandInPane({
			paneId: "pane-1",
			tabId: "tab-1",
			workspaceId: "ws-1",
			command: "claude --resume abc",
			createOrAttach,
			write: wrappedWrite,
			settleMs: 300,
			delay,
		});

		// The command still runs — just after the shell has had a beat to settle.
		expect(delay).toHaveBeenCalledWith(300);
		expect(order).toEqual(["delay", "write"]);
		expect(write).toHaveBeenCalledWith({
			paneId: "pane-1",
			data: "claude --resume abc\n",
			throwOnError: true,
		});
	});

	it("writes immediately when warm-attaching to a live shell", async () => {
		const createOrAttach = mock(async () => ({ isNew: false }));
		const write = mock(async () => ({}));
		const delay = mock(async (_ms: number) => {});

		await launchCommandInPane({
			paneId: "pane-1",
			tabId: "tab-1",
			workspaceId: "ws-1",
			command: "echo hi",
			createOrAttach,
			write,
			delay,
		});

		expect(delay).not.toHaveBeenCalled();
		expect(write).toHaveBeenCalledWith({
			paneId: "pane-1",
			data: "echo hi\n",
			throwOnError: true,
		});
	});

	it("does not append a second newline when command already has one", async () => {
		const createOrAttach = mock(async () => ({}));
		const write = mock(async () => ({}));

		await launchCommandInPane({
			paneId: "pane-1",
			tabId: "tab-1",
			workspaceId: "ws-1",
			command: "echo hello\n",
			createOrAttach,
			write,
		});

		expect(write).toHaveBeenCalledWith({
			paneId: "pane-1",
			data: "echo hello\n",
			throwOnError: true,
		});
	});
});

describe("buildTerminalCommand", () => {
	it("joins commands with shell separators", () => {
		expect(buildTerminalCommand(["echo one", "echo two"])).toBe(
			"echo one && echo two",
		);
	});

	it("returns null for empty commands", () => {
		expect(buildTerminalCommand([])).toBeNull();
		expect(buildTerminalCommand(null)).toBeNull();
		expect(buildTerminalCommand(undefined)).toBeNull();
	});
});

describe("writeCommandsInPane", () => {
	it("writes joined command with newline", async () => {
		const write = mock(async () => ({}));

		await writeCommandsInPane({
			paneId: "pane-1",
			commands: ["echo one", "echo two"],
			write,
		});

		expect(write).toHaveBeenCalledWith({
			paneId: "pane-1",
			data: "echo one && echo two\n",
			throwOnError: true,
		});
	});

	it("does not write when commands are empty", async () => {
		const write = mock(async () => ({}));

		await writeCommandsInPane({
			paneId: "pane-1",
			commands: [],
			write,
		});

		expect(write).not.toHaveBeenCalled();
	});
});
