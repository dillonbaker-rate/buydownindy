// Searchable places: the six counties we serve and their main cities, with approximate centers for
// zooming the map. ZIP codes are matched against listings. Shared by server and client.
import { COUNTIES } from "./types";

export type AreaKind = "city" | "county" | "zip";

export interface Area {
  kind: AreaKind;
  /** City or county name, or a 5-digit ZIP. */
  value: string;
  label: string;
  county?: string;
  center?: [number, number];
  zoom?: number;
}

const COUNTY_CENTERS: Record<string, [number, number]> = {
  Boone: [40.05, -86.45],
  Hamilton: [40.05, -86.03],
  Hancock: [39.82, -85.78],
  Hendricks: [39.77, -86.48],
  Johnson: [39.5, -86.1],
  Marion: [39.78, -86.14],
};

const CITY_LIST: [string, string, number, number][] = [
  ["Carmel", "Hamilton", 39.9784, -86.118],
  ["Fishers", "Hamilton", 39.9568, -86.0134],
  ["Noblesville", "Hamilton", 40.0456, -86.0086],
  ["Westfield", "Hamilton", 40.0428, -86.1275],
  ["Cicero", "Hamilton", 40.1239, -86.0133],
  ["Sheridan", "Hamilton", 40.135, -86.2203],
  ["Arcadia", "Hamilton", 40.1764, -86.0217],
  ["Indianapolis", "Marion", 39.7684, -86.1581],
  ["Lawrence", "Marion", 39.8387, -85.9953],
  ["Beech Grove", "Marion", 39.7156, -86.09],
  ["Speedway", "Marion", 39.8023, -86.2672],
  ["Southport", "Marion", 39.6656, -86.1281],
  ["Zionsville", "Boone", 39.9509, -86.2619],
  ["Whitestown", "Boone", 39.997, -86.3458],
  ["Lebanon", "Boone", 40.0484, -86.4692],
  ["Thorntown", "Boone", 40.1295, -86.6061],
  ["Avon", "Hendricks", 39.7628, -86.3997],
  ["Plainfield", "Hendricks", 39.7042, -86.3994],
  ["Brownsburg", "Hendricks", 39.8434, -86.3978],
  ["Danville", "Hendricks", 39.7606, -86.5264],
  ["Pittsboro", "Hendricks", 39.8639, -86.4669],
  ["Greenwood", "Johnson", 39.6137, -86.1067],
  ["Franklin", "Johnson", 39.4806, -86.055],
  ["Whiteland", "Johnson", 39.55, -86.0797],
  ["New Whiteland", "Johnson", 39.5581, -86.095],
  ["Bargersville", "Johnson", 39.5209, -86.1678],
  ["Trafalgar", "Johnson", 39.4164, -86.1508],
  ["Greenfield", "Hancock", 39.7851, -85.7694],
  ["McCordsville", "Hancock", 39.9081, -85.9228],
  ["Fortville", "Hancock", 39.9323, -85.848],
  ["New Palestine", "Hancock", 39.722, -85.8892],
  ["Cumberland", "Hancock", 39.7762, -85.9572],
];

export const CITIES: Area[] = CITY_LIST.map(([value, county, lat, lng]) => ({
  kind: "city",
  value,
  label: `${value}, IN`,
  county,
  center: [lat, lng],
  zoom: value === "Indianapolis" ? 11 : 12.5,
}));

export const COUNTY_AREAS: Area[] = COUNTIES.map((c) => ({
  kind: "county",
  value: c,
  label: `${c} County`,
  county: c,
  center: COUNTY_CENTERS[c],
  zoom: 10.75,
}));

export const POPULAR = ["Carmel", "Fishers", "Indianapolis", "Westfield", "Zionsville", "Greenwood"];

/** Encode for the URL: "city:Fishers", "county:Hamilton", "zip:46037". */
export const areaParam = (a: Pick<Area, "kind" | "value">) => `${a.kind}:${a.value}`;

const norm = (s: string) => s.toLowerCase().replace(/\s+county$/, "").replace(/,\s*in(diana)?$/, "").trim();

export function parseArea(param: string | null | undefined): Area | null {
  if (!param) return null;
  const [kind, ...rest] = param.split(":");
  const value = rest.join(":");
  if (kind === "zip" && /^\d{5}$/.test(value)) return { kind: "zip", value, label: value };
  if (kind === "city") return CITIES.find((c) => c.value.toLowerCase() === value.toLowerCase()) ?? null;
  if (kind === "county") return COUNTY_AREAS.find((c) => c.value.toLowerCase() === value.toLowerCase()) ?? null;
  return null;
}

/** Suggestions for what's been typed. ZIPs come from the listings plus any 5 digits typed. */
export function suggestAreas(q: string, listingZips: string[] = []): Area[] {
  const t = norm(q);
  if (!t) return [];
  if (/^\d{1,5}$/.test(t)) {
    const zips = [...new Set(listingZips.filter((z) => z.startsWith(t)))].sort();
    if (t.length === 5 && !zips.includes(t)) zips.unshift(t);
    return zips.slice(0, 6).map((z) => ({ kind: "zip", value: z, label: z }));
  }
  const starts = (s: string) => s.toLowerCase().startsWith(t);
  const has = (s: string) => s.toLowerCase().includes(t);
  const cities = CITIES.filter((c) => starts(c.value)).concat(CITIES.filter((c) => !starts(c.value) && has(c.value)));
  const counties = COUNTY_AREAS.filter((c) => starts(c.value) || has(c.label));
  return [...cities.slice(0, 5), ...counties.slice(0, 3)];
}

/** Does a listing fall in this area? */
export function inArea(a: Area, l: { city: string; county: string; zip?: string | null }) {
  if (a.kind === "county") return l.county === a.value;
  if (a.kind === "city") return l.city.toLowerCase() === a.value.toLowerCase();
  return (l.zip ?? "").startsWith(a.value);
}
