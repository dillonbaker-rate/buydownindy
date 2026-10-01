/** "$1,250,000" from any string of digits, or "" when empty. */
export const commas = (v: string | number) => {
  const d = String(v).replace(/[^0-9]/g, "");
  return d ? "$" + Number(d).toLocaleString("en-US") : "";
};
export const num = (v: string | number | null | undefined) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
export const digitsOnly = (v: string) => v.replace(/[^0-9]/g, "");
export const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
