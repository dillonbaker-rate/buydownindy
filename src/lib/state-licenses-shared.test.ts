import { describe, expect, it } from "vitest";
import { detectColumns, matchLicense, normalizeLicense, parseCsv, toIsoDate, toRecord, type StateLicense } from "./state-licenses-shared";

const rec = (o: Partial<StateLicense>): StateLicense => ({
  license_number: "RB14012345",
  first_name: "Jane",
  last_name: "Smith",
  full_name: null,
  license_type: "Broker",
  status: "Active",
  expires_on: "2028-06-30",
  city: "Fishers",
  ...o,
});
const today = "2026-11-19";

describe("state license list: reading the file", () => {
  it("parses quoted CSV with commas, quotes and line breaks", () => {
    const rows = parseCsv('﻿License Number,Name,Status\r\nRB1,"SMITH, JANE ""JJ""",Active\nRB2,"Multi\nLine",Expired\n\n');
    expect(rows).toEqual([
      ["License Number", "Name", "Status"],
      ["RB1", 'SMITH, JANE "JJ"', "Active"],
      ["RB2", "Multi\nLine", "Expired"],
    ]);
  });

  it("finds columns by name and builds records", () => {
    const head = ["Last Name", "First Name", "Middle", "License Number", "License Type", "License Status", "Expiration Date", "City"];
    const c = detectColumns(head);
    if ("error" in c) throw new Error(c.error);
    const r = toRecord(["Smith", "Jane", "A", "rb-1401 2345", "Broker", "Active", "6/30/2028", "Fishers"], c);
    expect(r).toMatchObject({ license_number: "RB14012345", last_name: "Smith", first_name: "Jane", status: "Active", expires_on: "2028-06-30" });
  });

  it("explains what's missing", () => {
    const c = detectColumns(["Name", "Address"]);
    expect("error" in c && c.error).toMatch(/license number column/);
  });

  it("normalizes license numbers and dates", () => {
    expect(normalizeLicense(" rb-1401 2345 ")).toBe("RB14012345");
    expect(toIsoDate("12/31/27")).toBe("2027-12-31");
    expect(toIsoDate("2027-1-5")).toBe("2027-01-05");
    expect(toIsoDate("soon")).toBeNull();
  });
});

describe("state license list: matching an agent", () => {
  it("verifies a clear match", () => {
    expect(matchLicense("Jane Smith", rec({}), today)).toEqual({ ok: true });
    expect(matchLicense("Jane A. Smith", rec({}), today).ok).toBe(true);
  });

  it("accepts nicknames and full-name records", () => {
    expect(matchLicense("Bob Jones", rec({ first_name: "Robert", last_name: "Jones" }), today).ok).toBe(true);
    expect(matchLicense("Jane Smith", rec({ first_name: null, last_name: null, full_name: "SMITH, JANE A" }), today).ok).toBe(true);
    expect(matchLicense("Jane Smith-Jones", rec({ last_name: "Smith-Jones" }), today).ok).toBe(true);
    expect(matchLicense("Chris Lee Jr", rec({ first_name: "Christopher", last_name: "Lee" }), today).ok).toBe(true);
  });

  it("leaves anything unclear for a manual check", () => {
    expect(matchLicense("Jane Doe", rec({}), today).ok).toBe(false);
    expect(matchLicense("John Smith", rec({}), today).ok).toBe(false);
    expect(matchLicense("Jane Smith", rec({ status: "Inactive" }), today).ok).toBe(false);
    expect(matchLicense("Jane Smith", rec({ status: "Expired" }), today).ok).toBe(false);
    expect(matchLicense("Jane Smith", rec({ expires_on: "2026-11-18" }), today).ok).toBe(false);
    expect(matchLicense("Jane", rec({}), today).ok).toBe(false);
    expect(matchLicense("Jo Smith", rec({ first_name: "Joanna" }), today).ok).toBe(false);
  });
});
