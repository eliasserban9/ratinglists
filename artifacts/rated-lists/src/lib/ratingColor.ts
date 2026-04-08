// Smooth color gradient: red(1–3) → orange(4–5) → yellow(6–7) → light green(8) → dark green(9) → blue(10)
const STOPS: [number, number, number][] = [
  [1,  0,   85],  // red
  [3,  0,   85],  // red (holds through 3)
  [4,  28,  90],  // orange
  [5,  30,  88],  // orange
  [6,  53,  85],  // yellow
  [7,  55,  85],  // yellow
  [8,  100, 65],  // light green
  [9,  195, 75],  // light blue
  [10, 215, 78],  // blue
];

function interpolate(rating: number): { h: number; s: number } {
  const r = Math.max(1, Math.min(10, rating));
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (r >= STOPS[i][0] && r <= STOPS[i + 1][0]) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const t = (r - lo[0]) / (hi[0] - lo[0]);
  return {
    h: lo[1] + t * (hi[1] - lo[1]),
    s: lo[2] + t * (hi[2] - lo[2]),
  };
}

export function fmt(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
}

export function ratingToColor(rating: number, lightness = 50): string {
  const { h, s } = interpolate(rating);
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${lightness}%)`;
}

export function ratingToColorRgba(rating: number, lightness: number, alpha: number): string {
  const { h, s } = interpolate(rating);
  return `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${lightness}%, ${alpha})`;
}

export interface ItemColors {
  bg: string;
  bgTransparent: string;
  borderColor: string;
  rankColor: string;
  nameColor: string;
  ratingColor: string;
  deleteColor: string;
  deleteBg: string;
  barBg: string;
  barText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  confirmBg: string;
  confirmFg: string;
}

export function ratingColors(rating: number): ItemColors {
  const { h, s } = interpolate(rating);
  const hsl = (l: number) => `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l}%)`;
  const hsla = (l: number, a: number) => `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l}%, ${a})`;
  return {
    bg:              hsl(18),
    bgTransparent:   hsla(18, 0.72),
    borderColor:     hsl(10),
    rankColor:    hsla(78, 0.6),
    nameColor:    hsl(93),
    ratingColor:  hsl(72),
    deleteColor:  hsla(78, 0.55),
    deleteBg:     hsla(78, 0.12),
    barBg:        "rgba(0,0,0,0.18)",
    barText:      hsla(78, 0.7),
    inputBg:      "rgba(0,0,0,0.25)",
    inputBorder:  hsla(72, 0.45),
    inputText:    hsl(72),
    confirmBg:    hsl(72),
    confirmFg:    hsl(18),
  };
}
