import { expect, it } from "vitest";
import { parsePmms } from "./pmms";

it("reads the latest 30-year PMMS row", () => {
  const csv = "date,pmms30,pmms30p,pmms15\n4/2/1971,7.33, ,\n9/17/2026,6.95,,6.26\n9/24/2026,7.03,,6.42\n";
  expect(parsePmms(csv)).toEqual({ weekOf: "2026-09-24", rate: 7.03 });
});

it("skips trailing rows without a 30-year value", () => {
  expect(parsePmms("date,pmms30\n9/17/2026,6.95\n9/24/2026,\n")).toEqual({ weekOf: "2026-09-17", rate: 6.95 });
});
