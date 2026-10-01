// Share-window graphic options (shared by the image route and the share window).
export const GRAPHIC_SIZES = [
  { value: "post", label: "Post", ratio: "4:5", w: 1080, h: 1350 },
  { value: "story", label: "Story", ratio: "9:16", w: 1080, h: 1920 },
  { value: "flyer", label: "Flyer", ratio: "A4", w: 1240, h: 1754 },
] as const;
export type GraphicSize = (typeof GRAPHIC_SIZES)[number]["value"];
export const GRAPHIC_DESIGNS = ["Classic", "Bold", "Numbers"] as const;
