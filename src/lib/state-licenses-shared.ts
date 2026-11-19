// Indiana licensee list: reading the state's bulk download (CSV) and matching an agent to a license.
// Pure functions, shared by the browser (parsing the upload) and the server (matching). Matching is strict on
// purpose: anything short of a clear match leaves the agent pending for a manual check.

export interface StateLicense {
  license_number: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  license_type: string | null;
  status: string | null;
  /** YYYY-MM-DD */
  expires_on: string | null;
  city: string | null;
}

/** Uppercase, no spaces or dashes: "rb-1401 2345" → "RB14012345". */
export const normalizeLicense = (s: string | null | undefined) => (s ?? "").replace(/[\s-]/g, "").toUpperCase();

// ── CSV ──────────────────────────────────────────────────────────────────
/** RFC 4180 CSV: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export interface Columns {
  license: number;
  first?: number;
  last?: number;
  full?: number;
  type?: number;
  status?: number;
  expires?: number;
  city?: number;
}

/** Find the columns by their header names (the state's file has used slightly different names over time). */
export function detectColumns(headers: string[]): Columns | { error: string } {
  const h = headers.map((x) => x.trim().toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim());
  const find = (...tests: ((s: string) => boolean)[]) => {
    for (const t of tests) {
      const i = h.findIndex(t);
      if (i >= 0) return i;
    }
    return undefined;
  };
  const license = find(
    (s) => /licen[sc]e (number|no|num|#)/.test(s),
    (s) => s === "license" || s === "license#" || s === "licence",
    (s) => s.includes("license") && !/type|status|date|expir|issue|state/.test(s),
  );
  if (license === undefined) return { error: `Couldn't find the license number column. Columns found: ${headers.join(", ")}` };
  const cols: Columns = {
    license,
    first: find((s) => /^first( name)?$/.test(s), (s) => s.includes("first name")),
    last: find((s) => /^last( name)?$/.test(s), (s) => s.includes("last name"), (s) => s === "surname"),
    full: find((s) => /^(full )?name$/.test(s), (s) => /licensee name|full name/.test(s)),
    type: find((s) => /licen[sc]e type/.test(s), (s) => s === "type", (s) => s.includes("profession")),
    status: find((s) => /licen[sc]e status/.test(s), (s) => s === "status", (s) => s.includes("status")),
    expires: find((s) => s.includes("expir")),
    city: find((s) => s === "city", (s) => s.includes("city")),
  };
  if (cols.last === undefined && cols.full === undefined)
    return { error: `Couldn't find a name column (Last Name, or Name). Columns found: ${headers.join(", ")}` };
  if (cols.status === undefined) return { error: `Couldn't find the license status column. Columns found: ${headers.join(", ")}` };
  return cols;
}

/** "12/31/2027", "2027-12-31", "12/31/27" → "2027-12-31" (null if not a date). */
export function toIsoDate(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

export function toRecord(row: string[], c: Columns): StateLicense | null {
  const get = (i?: number) => (i === undefined ? null : (row[i] ?? "").trim() || null);
  const license_number = normalizeLicense(get(c.license));
  if (!license_number) return null;
  return {
    license_number,
    first_name: get(c.first),
    last_name: get(c.last),
    full_name: get(c.full),
    license_type: get(c.type),
    status: get(c.status),
    expires_on: toIsoDate(get(c.expires) ?? undefined),
    city: get(c.city),
  };
}

// ── Matching ─────────────────────────────────────────────────────────────
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s,'-]/g, " ")
    .replace(/[']/g, "")
    .split(/[\s,]+/)
    .filter((w) => w && !SUFFIXES.has(w));

/** Common nicknames → formal first names (either direction counts). */
const NICK: Record<string, string[]> = {
  bob: ["robert"], rob: ["robert"], bobby: ["robert"], bill: ["william"], will: ["william"], billy: ["william"],
  jim: ["james"], jimmy: ["james"], jamie: ["james"], mike: ["michael"], mikey: ["michael"], kate: ["katherine", "kathryn", "catherine"],
  katie: ["katherine", "kathryn", "catherine"], kathy: ["katherine", "kathryn", "kathleen"], liz: ["elizabeth"], beth: ["elizabeth"],
  betsy: ["elizabeth"], tom: ["thomas"], tommy: ["thomas"], dave: ["david"], chris: ["christopher", "christina", "christine"],
  matt: ["matthew"], nick: ["nicholas"], tony: ["anthony"], joe: ["joseph"], joey: ["joseph"], dan: ["daniel"], danny: ["daniel"],
  sam: ["samuel", "samantha"], alex: ["alexander", "alexandra"], jen: ["jennifer"], jenny: ["jennifer"], steve: ["steven", "stephen"],
  rick: ["richard"], rich: ["richard"], dick: ["richard"], andy: ["andrew"], drew: ["andrew"], ben: ["benjamin"], greg: ["gregory"],
  pat: ["patrick", "patricia"], patty: ["patricia"], sue: ["susan", "suzanne"], peggy: ["margaret"], maggie: ["margaret"],
  meg: ["margaret", "megan"], ted: ["edward", "theodore"], ed: ["edward"], eddie: ["edward"], jon: ["jonathan"], josh: ["joshua"],
  zach: ["zachary"], zack: ["zachary"], nate: ["nathan", "nathaniel"], tim: ["timothy"], ken: ["kenneth"], larry: ["lawrence"],
  jerry: ["gerald", "jerome"], terry: ["terrence", "theresa"], cindy: ["cynthia"], debbie: ["deborah"], deb: ["deborah"],
  abby: ["abigail"], becky: ["rebecca"], vicky: ["victoria"], tori: ["victoria"], mandy: ["amanda"], manda: ["amanda"],
};

const sameFirst = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a === b) return true;
  if (NICK[a]?.includes(b) || NICK[b]?.includes(a)) return true;
  // "Christoph" vs "Christopher": a long shared start.
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 4 && l.startsWith(s);
};

/** The record's first and last name, from separate columns or a full name ("SMITH, JANE A" or "Jane A Smith"). */
function recordName(r: StateLicense): { first: string; lasts: string[] } | null {
  if (r.last_name) {
    const first = words(r.first_name ?? "")[0] ?? "";
    return { first, lasts: words(r.last_name.replace(/-/g, " ")) };
  }
  if (!r.full_name) return null;
  if (r.full_name.includes(",")) {
    const [last, rest] = r.full_name.split(",", 2);
    return { first: words(rest ?? "")[0] ?? "", lasts: words(last.replace(/-/g, " ")) };
  }
  const w = words(r.full_name);
  return w.length >= 2 ? { first: w[0], lasts: [w[w.length - 1]] } : null;
}

export type MatchResult = { ok: true } | { ok: false; reason: string };

/**
 * Does this license clearly belong to an agent named `profileName`, and is it active? `today` is YYYY-MM-DD.
 * Needs: the last name to match (any part of a hyphenated or two-word last name), the first name to match
 * (or a common nickname, or a long shared start), status containing "active" (not "inactive"), not expired.
 */
export function matchLicense(profileName: string, r: StateLicense, today: string): MatchResult {
  const status = (r.status ?? "").toLowerCase();
  if (!status.includes("active") || status.includes("inactive")) return { ok: false, reason: `License status is "${r.status ?? "unknown"}".` };
  if (r.expires_on && r.expires_on < today) return { ok: false, reason: `License expired ${r.expires_on}.` };
  const rec = recordName(r);
  if (!rec) return { ok: false, reason: "No name on the state record." };
  const w = words(profileName.replace(/-/g, " "));
  if (w.length < 2) return { ok: false, reason: "Profile needs a first and last name." };
  const profileFirst = w[0];
  const profileLast = w[w.length - 1];
  if (!rec.lasts.includes(profileLast)) return { ok: false, reason: `Last name doesn't match the state record (${r.last_name ?? r.full_name}).` };
  if (!sameFirst(profileFirst, rec.first)) return { ok: false, reason: `First name doesn't match the state record (${r.first_name ?? r.full_name}).` };
  return { ok: true };
}

/** Today in Indianapolis, YYYY-MM-DD. */
export const indyDate = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/Indiana/Indianapolis" });
