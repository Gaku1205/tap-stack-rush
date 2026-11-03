// 描く部品（ブロック・ギザギザのバッジ・文字）。見た目は docs/design.md のとおり
import { hexToRgb, INK, mix, rgbToCss } from "./lib/color";
import { roundRect } from "./digits";

export const JP_FONT =
  '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",YuGothic,Meiryo,system-ui,sans-serif';
export const LATIN_FONT = `"Arial Black","Helvetica Neue",Arial,${JP_FONT}`;

export function font(size: number, latin = false): string {
  return `900 ${Math.round(size)}px ${latin ? LATIN_FONT : JP_FONT}`;
}

const shadeCache = new Map<string, { light: string; dark: string }>();
function shades(color: string): { light: string; dark: string } {
  let s = shadeCache.get(color);
  if (!s) {
    const c = hexToRgb(color);
    s = { light: rgbToCss(mix(c, [255, 255, 255], 0.55)), dark: rgbToCss(mix(c, hexToRgb(INK), 0.28)) };
    shadeCache.set(color, s);
  }
  return s;
}

/**
 * ぷっくりした積み木を1つ描く。x は中心、yBottom は下の辺（画面の座標）
 * squash（0〜1）で、置いた瞬間につぶれる
 */
export function drawSlab(
  ctx: CanvasRenderingContext2D,
  x: number,
  yBottom: number,
  w: number,
  h: number,
  color: string,
  unit: number,
  squash = 0,
): void {
  const sw = w * (1 + 0.07 * squash);
  const sh = h * (1 - 0.28 * squash);
  const left = x - sw / 2;
  const top = yBottom - sh;
  const r = Math.min(6 * unit, sh / 2, sw / 2);
  const { light, dark } = shades(color);
  ctx.fillStyle = dark;
  roundRect(ctx, left, top, sw, sh, r);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, left, top, sw, sh - 4.5 * unit, r);
  ctx.fill();
  // 上面の明るい帯（ぷっくり）
  if (sw > 10 * unit) {
    ctx.fillStyle = light;
    roundRect(ctx, left + 5 * unit, top + 3.5 * unit, Math.max(0, sw - 10 * unit), 3.2 * unit, 1.6 * unit);
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1.5, 2.4 * unit);
  ctx.strokeStyle = INK;
  roundRect(ctx, left, top, sw, sh, r);
  ctx.stroke();
}

/** ギザギザの吹き出し（バッジ）。影を下にずらして、シールのように見せる */
export function drawBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  spikes = 14,
  rot = 0,
): void {
  const path = (ox: number, oy: number): void => {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = rot + (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.8;
      const px = cx + ox + Math.cos(a) * rr;
      const py = cy + oy + Math.sin(a) * rr * 0.72;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  ctx.fillStyle = INK;
  path(0, r * 0.08);
  ctx.fill();
  ctx.fillStyle = fill;
  path(0, 0);
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** 放射の帯（ポスターの集中線）。背景の上に、薄い色で交互に塗る */
export function drawRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, alpha: number, rot: number, count = 20): void {
  const R = 2400;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a0 = rot + (i / count) * Math.PI * 2;
    const a1 = a0 + (Math.PI / count) * 1;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
    ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

/** シール（角丸の板）：墨の輪郭と、下にずらした墨の影 */
export function drawSticker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  r: number,
  shadow: number,
): void {
  ctx.fillStyle = INK;
  roundRect(ctx, x, y + shadow, w, h, r);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = Math.max(2, shadow * 0.5);
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** 縁取りした文字（墨のふち＋中の色） */
export function strokeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  edge: string,
  edgeWidth: number,
): void {
  ctx.lineJoin = "round";
  ctx.lineWidth = edgeWidth;
  ctx.strokeStyle = edge;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** 文字が幅 maxW に収まる大きさ */
export function fitSize(ctx: CanvasRenderingContext2D, text: string, size: number, maxW: number, latin = false): number {
  ctx.font = font(size, latin);
  const w = ctx.measureText(text).width;
  return w > maxW ? Math.max(10, Math.floor(size * (maxW / w))) : size;
}
