/**
 * Last row with a 30-year value. Header: date,pmms30,pmms30p,pmms15,... Dates are M/D/YYYY.
 * Rows since 11/17/2022 wrap every value in quotes ("11/25/2026","7.21",...), older rows don't.
 */
export function parsePmms(csv: string): { weekOf: string; rate: number } | null {
  const lines = csv.trim().split(/\r?\n/);
  const split = (line: string) => line.split(",").map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim());
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const di = head.indexOf("date");
  const ri = head.indexOf("pmms30");
  if (di < 0 || ri < 0) return null;
  for (let i = lines.length - 1; i > 0; i--) {
    const cols = split(lines[i]);
    const rate = parseFloat(cols[ri]);
    const m = cols[di]?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!isNaN(rate) && m) {
      return { weekOf: `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, rate };
    }
  }
  return null;
}
