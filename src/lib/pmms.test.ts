import { expect, it } from "vitest";
import { parsePmms } from "./pmms";

it("reads the latest 30-year PMMS row", () => {
  const csv = "date,pmms30,pmms30p,pmms15\n4/2/1971,7.33, ,\n9/17/2026,6.95,,6.26\n9/24/2026,7.03,,6.42\n";
  expect(parsePmms(csv)).toEqual({ weekOf: "2026-09-24", rate: 7.03 });
});

it("skips trailing rows without a 30-year value", () => {
  expect(parsePmms("date,pmms30\n9/17/2026,6.95\n9/24/2026,\n")).toEqual({ weekOf: "2026-09-17", rate: 6.95 });
});

it("reads Freddie Mac's quoted rows (since 11/17/2022), not the last unquoted one", () => {
  const csv =
    'date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread\n' +
    "11/10/2022,7.08,0.9,6.38,1,6.06,0.2,2.75,1.02\n" +
    '"11/17/2022","6.61","","5.98"\n' +
    '"11/19/2026","7.28","","6.66","","","",""\n' +
    '"11/25/2026","7.21","","6.54","","","",""\n';
  expect(parsePmms(csv)).toEqual({ weekOf: "2026-11-25", rate: 7.21 });
});
