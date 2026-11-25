import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { isRateStale, longDate, rateAgeDays, STALE_RATE_DAYS, type RateInfo } from "@/lib/rate-info";

/** Admins only: a red warning when the rate the site shows is more than STALE_RATE_DAYS old. */
export function StaleRateBanner({ info }: { info: RateInfo }) {
  if (!isRateStale(info)) return null;
  return (
    <div role="alert" className="flex flex-none items-start gap-2.5 border-b border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900 lg:px-8">
      <AlertTriangle size={18} className="mt-px flex-none text-red-600" />
      <div>
        <strong>The rate on the site is out of date.</strong> Every listing, flyer and email is using {info.rates.Conventional}% from{" "}
        {longDate(info.date)}, {rateAgeDays(info)} days old (the limit is {STALE_RATE_DAYS}). Freddie Mac&apos;s weekly rate didn&apos;t come through.{" "}
        <Link href="/agent/rates" className="font-semibold text-red-900 underline">
          Enter today&apos;s rate
        </Link>{" "}
        to fix it now, and tell Claude so the feed gets fixed.
      </div>
    </div>
  );
}
