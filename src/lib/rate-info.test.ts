import { expect, it } from "vitest";
import { indyToday } from "./rate-info";

it("uses Indianapolis time for 'today'", () => {
  // 11:30 PM Eastern on Oct 1 is already Oct 2 in UTC.
  expect(indyToday(new Date("2026-10-02T03:30:00Z"))).toBe("2026-10-01");
  expect(indyToday(new Date("2026-10-02T04:30:00Z"))).toBe("2026-10-02");
});
