// Share text for a listing, used by the "Share this house" button and the link-preview description.
import { calc, MIN_DOWN, typeFor, usd } from "./buydown";
import { rateFor, type RateInfo } from "./rate-info";
import type { Listing } from "./types";

/** "12135 Ashland Dr, Fishers: $599,900. The seller is offering $15,000 in concessions: as low as $3,103/mo in year 1 with a 2-1 buydown." */
export function shareSummary(l: Listing, info: RateInfo) {
  const type = typeFor(l.loanTypes);
  const c = calc(l.price, l.concession, type, Math.max(l.defaultDownPct, MIN_DOWN[type]), 0, rateFor(info, type));
  const b = c.best;
  const title = `${l.address}, ${l.city}: ${usd(l.price)}`;
  const deal = b
    ? `as low as ${usd(b.y1)}/mo in year 1 with a ${b.name}`
    : `a ${usd(l.concession)} credit toward closing costs`;
  const text = `${title}. The seller is offering ${usd(l.concession)} in concessions: ${deal} (principal & interest, est.). See the numbers:`;
  return { title, text, deal };
}
