import { expect, it } from "vitest";
import { indyToday, isRateStale, rateAgeDays, type RateInfo } from "./rate-info";

it("uses Indianapolis time for 'today'", () => {
  // 11:30 PM Eastern on Oct 1 is already Oct 2 in UTC.
  expect(indyToday(new Date("2026-10-02T03:30:00Z"))).toBe("2026-10-01");
  expect(indyToday(new Date("2026-10-02T04:30:00Z"))).toBe("2026-10-02");
});
const info = (date: string): RateInfo => ({ source: "pmms", date, rates: { Conventional: 7.21, FHA: 7.21, VA: 7.21 } });
const now = new Date("2026-11-25T18:00:00Z");

it("counts days since the rate's date", () => {
  expect(rateAgeDays(info("2026-11-25"), now)).toBe(0);
  expect(rateAgeDays(info("2026-11-19"), now)).toBe(6);
});

it("flags a rate more than 10 days old, like the November 2022 one", () => {
  expect(isRateStale(info("2026-11-19"), now)).toBe(false);
  expect(isRateStale(info("2026-11-15"), now)).toBe(false);
  expect(isRateStale(info("2026-11-14"), now)).toBe(true);
  expect(isRateStale(info("2022-11-10"), now)).toBe(true);
});
