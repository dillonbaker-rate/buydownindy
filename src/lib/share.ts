// Share text for a listing, used by the "Share this house" button and the link-preview description.
import { FOOTER_LINE } from "@/content/disclosures";
import { calc, kUsd, MIN_DOWN, pct, saving, typeFor, usd } from "./buydown";
import { APR_ASSUMPTION, exampleLine, stepUpLine } from "./ad-terms";
import { longDate } from "./rate-info";
import { rateFor, type RateInfo } from "./rate-info";
import type { Listing } from "./types";

/**
 * Short text (link previews, X, texts) names no payment or rate, so it carries no Reg Z trigger terms.
 * The longer social post states payments, so it includes the step-up, the example terms and the APR.
 */
export function shareSummary(l: Listing, info: RateInfo) {
  const type = typeFor(l.loanTypes);
  const c = calc(l.price, l.concession, type, Math.max(l.defaultDownPct, MIN_DOWN[type]), 0, rateFor(info, type));
  const b = c.best;
  const title = `${l.address}, ${l.city}: ${usd(l.price)}`;
  const deal = b ? `see what a ${b.name} does to the monthly payment` : `a ${usd(l.concession)} credit toward closing costs`;
  const text = `${title}. The seller is offering ${usd(l.concession)} in concessions. See what it does to the monthly payment:`;
  // Ready-to-copy social post (Facebook, Instagram, LinkedIn). The link is appended by the share window.
  // COMPLIANCE: payment figures in an ad are Reg Z trigger terms; the last line is the required disclosure.
  const rate = rateFor(info, type);
  const down = Math.max(l.defaultDownPct, MIN_DOWN[type]);
  const k = kUsd(l.concession);
  const tag = (s: string) => "#" + s.replace(/[^A-Za-z0-9]/g, "");
  const post = [
    `🏡 The seller is paying ${usd(l.concession)} toward the buyer at ${l.address}, ${l.city}!`,
    "",
    b
      ? `💡 ${k} off the price saves about ${usd(saving(c.base, c.cut))}/mo. ${k} toward a ${b.name} saves about ${usd(saving(c.base, b.y1))}/mo in year 1. ${stepUpLine(b, c.base)}`
      : `💡 That's ${usd(l.concession)} less cash to bring to closing.`,
    "",
    `${usd(l.price)} · ${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString("en-US")} sq ft`,
    "",
    "See every option, side by side:",
    "{link}",
    "",
    [tag(l.city + "IN"), tag(l.county + "County"), "#IndyRealEstate", "#HomeBuying", "#Buydown", "#FirstTimeHomeBuyer"].join(" "),
    "",
    `${exampleLine({ price: l.price, type, down, rate })} Est. principal & interest; taxes and insurance extra. ${pct(rate)} is ${info.source === "daily" ? `the rate as of ${longDate(info.date)}` : `a sample rate (Freddie Mac, week of ${longDate(info.date)})`}. ${APR_ASSUMPTION} Buydowns require a seller-paid concession in a signed contract. Not a commitment to lend. ${FOOTER_LINE}.`,
  ].join("\n");
  return { title, text, deal, post };
}
