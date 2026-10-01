import { expect, it } from "vitest";
import { estimateTaxesAndInsurance } from "@/content/program-rules";

it("estimates taxes at 1% and insurance at $5 per $1,000, rounded to $10", () => {
  expect(estimateTaxesAndInsurance(350000)).toEqual({ taxesYr: 3500, insuranceYr: 1750 });
  expect(estimateTaxesAndInsurance(599900)).toEqual({ taxesYr: 6000, insuranceYr: 3000 });
});
