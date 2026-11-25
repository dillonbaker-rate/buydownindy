// Which 30-year fixed rate the site uses today. Shared by server and client (no secrets here).
import type { LoanType } from "./buydown";

export type RateSource =
  /** Dillon entered Rate's rates for today. */
  | "daily"
  /** Fallback: Freddie Mac PMMS weekly national average (labeled a sample rate). */
  | "pmms";

export interface RateInfo {
  source: RateSource;
  /** ISO date: the day entered, or the PMMS survey week. */
  date: string;
  rates: Record<LoanType, number>;
}

export const rateFor = (info: RateInfo, type: LoanType) => info.rates[type];

/** Short label after a rate, e.g. "7.125% sample rate" vs "7.125% rate for Oct 1". */
export const rateNoun = (info: RateInfo) => (info.source === "daily" ? "rate as of today" : "sample rate");

/** "September 24, 2026" */
export const longDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Today's date in Indianapolis as YYYY-MM-DD. */
export const indyToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Indiana/Indianapolis" }).format(now);

/** A rate older than this many days means the rate feed is broken (Freddie Mac publishes weekly). */
export const STALE_RATE_DAYS = 10;

/** Whole days since the rate's date (0 for a daily rate entered today). */
export const rateAgeDays = (info: RateInfo, now = new Date()) =>
  Math.floor((new Date(indyToday(now) + "T12:00:00Z").getTime() - new Date(info.date + "T12:00:00Z").getTime()) / 86_400_000);

export const isRateStale = (info: RateInfo, now = new Date()) => rateAgeDays(info, now) > STALE_RATE_DAYS;
