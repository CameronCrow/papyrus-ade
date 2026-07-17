import { describe, expect, it } from "bun:test";
import { deriveRosterStatus } from "./team-dashboard";

/**
 * team-dashboard unit tests (issue #51, unit U5). Only the pure status-precedence
 * seam is exercised here — buildRoster/buildActivity/buildWorkBoard reach out to
 * the filesystem and `gh`, which isn't worth mocking for v1.
 */
describe("deriveRosterStatus", () => {
	it("blocks when PR checks are failing, regardless of activity", () => {
		for (const activity of ["working", "waiting", "idle", "unknown"] as const) {
			expect(deriveRosterStatus(activity, "failure")).toBe("blocked");
		}
	});

	it("passes through the session activity when checks are not failing", () => {
		expect(deriveRosterStatus("working", "success")).toBe("working");
		expect(deriveRosterStatus("waiting", "pending")).toBe("waiting");
		expect(deriveRosterStatus("idle", "none")).toBe("idle");
		expect(deriveRosterStatus("working", null)).toBe("working");
		expect(deriveRosterStatus("unknown", null)).toBe("unknown");
	});
});
