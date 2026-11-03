// 色の計算（背景の色の移り変わり・文字の色の選び方）
export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToCss(c: Rgb): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

type Hsl = [number, number, number];

function toHsl(c: Rgb): Hsl {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

function fromHsl([h, s, l]: Hsl): Rgb {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** 色相の近い方へまわして混ぜる（濁らない） */
export function mixHsl(a: Rgb, b: Rgb, t: number): Rgb {
  const x = toHsl(a);
  const y = toHsl(b);
  let dh = y[0] - x[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return fromHsl([(x[0] + dh * t + 360) % 360, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** 相対輝度（WCAG） */
export function luminance(c: Rgb): number {
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const INK = "#141414";
export const CREAM = "#FFF6E5";

/** 高さ（階）ごとの背景の色。地面のレモン → 夕方のコーラル → ミント → 空のコバルト → 夜の宇宙 */
export const SKY_STOPS: ReadonlyArray<{ floor: number; hex: string }> = [
  { floor: 0, hex: "#FFE14D" },
  { floor: 8, hex: "#FF6B4A" },
  { floor: 16, hex: "#12C29B" },
  { floor: 24, hex: "#3D5AFE" },
  { floor: 32, hex: "#17132B" },
];

/**
 * 背景の色。明るい色から暗い色へ移る途中は、墨でもクリームでも読みにくい色を通るので、
 * そこだけ少し暗くして、クリームの文字が 4.5:1 以上で読めるようにする
 */
export function skyAt(floor: number): Rgb {
  let c = rawSkyAt(floor);
  const ink = hexToRgb(INK);
  const cream = hexToRgb(CREAM);
  for (let i = 0; i < 30 && Math.max(contrast(c, ink), contrast(c, cream)) < 4.6; i++) c = mix(c, ink, 0.04);
  return c;
}

function rawSkyAt(floor: number): Rgb {
  const stops = SKY_STOPS;
  if (floor <= stops[0].floor) return hexToRgb(stops[0].hex);
  for (let i = 1; i < stops.length; i++) {
    if (floor < stops[i].floor) {
      const a = stops[i - 1];
      const b = stops[i];
      const t = (floor - a.floor) / (b.floor - a.floor);
      // 色の境目に長くいるように、なめらかに。RGB で混ぜると濁るので、色相をまわして混ぜる
      const e = t * t * (3 - 2 * t);
      return mixHsl(hexToRgb(a.hex), hexToRgb(b.hex), e);
    }
  }
  return hexToRgb(stops[stops.length - 1].hex);
}

/** 背景の上で読みやすい方の文字の色（墨かクリーム） */
export function inkOn(bg: Rgb): string {
  return contrast(bg, hexToRgb(INK)) >= contrast(bg, hexToRgb(CREAM)) ? INK : CREAM;
}

/** ブロックの色（順に使う） */
export const BLOCK_COLORS = ["#FFF6E5", "#FF8FB1", "#7AE0FF", "#FFC83D", "#B69CFF", "#8CEB8C"] as const;
