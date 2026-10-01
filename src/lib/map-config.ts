// Tile provider. Production needs a provider with production terms (MapTiler, Stadia, Mapbox):
// set NEXT_PUBLIC_MAPTILER_KEY, or NEXT_PUBLIC_TILE_URL (+ NEXT_PUBLIC_TILE_ATTRIBUTION) for any other.
// With neither set we fall back to the OSM public server, which is for development only.
const maptiler = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL ||
  (maptiler
    ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptiler}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png");

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  (maptiler
    ? '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    : "&copy; OpenStreetMap contributors");

export const MAP_OPTIONS = {
  zoomSnap: 0.25,
  zoomDelta: 0.75,
  wheelPxPerZoomLevel: 80,
  wheelDebounceTime: 15,
  inertia: true,
  inertiaDeceleration: 4000,
  easeLinearity: 0.2,
  bounceAtZoomLimits: false,
  minZoom: 8,
  maxZoom: 17,
} as const;

export const TILE_OPTIONS = { maxZoom: 19, keepBuffer: 6, updateWhenZooming: false } as const;

export const CENTER_PHONE: [number, number] = [39.8, -86.14];
export const CENTER_DESK: [number, number] = [39.87, -86.15];
