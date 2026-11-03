// SNS のカード画像（og:image）の絵。1200×630 の1枚。`/?scene=og` で開いて撮り、public/og.png に置く
// 見た目の決まりは docs/design.md の「SNS のカード画像」
import { drawBurst, drawRays, drawSlab, drawSticker, fitSize, font } from "./draw";
import { BLOCK_COLORS, CREAM, INK, inkOn, rgbToCss, skyAt } from "./lib/color";
import { BASE_WIDTH, SLAB_HEIGHT } from "./lib/stack";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** 塔の各段の、真ん中からのずれ（世界の単位） */
const TOWER_OFFSETS = [0, 14, -8, 20, 4, -14, 10, 22];
const GROUND = 560;

export function drawOgCard(ctx: CanvasRenderingContext2D): void {
  const bg = skyAt(8);
  const textColor = inkOn(bg);
  ctx.fillStyle = rgbToCss(bg);
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);
  drawRays(ctx, 900, 330, textColor === INK ? "#FFFFFF" : CREAM, textColor === INK ? 0.28 : 0.08, 0, 22);

  // 地面（墨のベタ）
  ctx.fillStyle = INK;
  ctx.fillRect(0, GROUND, OG_WIDTH, OG_HEIGHT - GROUND);

  // 左：ロゴ（TAP / STACK / RUSH のシール）
  const words: Array<[string, number, number, string, number]> = [
    ["TAP", 340, 0, "#FF8FB1", -0.03],
    ["STACK", 520, 26, CREAM, 0],
    ["RUSH", 430, 8, "#7AE0FF", 0.015],
  ];
  const slabH = 112;
  const left = 60;
  const top = 70;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  words.forEach(([word, w, off, color, rot], i) => {
    const x = left + off;
    const y = top + i * (slabH + 10);
    ctx.save();
    ctx.translate(x + w / 2, y + slabH / 2);
    ctx.rotate(rot);
    ctx.translate(-(x + w / 2), -(y + slabH / 2));
    drawSticker(ctx, x, y, w, slabH, color, 18, 8);
    ctx.fillStyle = INK;
    ctx.font = font(fitSize(ctx, word, slabH * 0.74, w - 40, true), true);
    ctx.fillText(word, x + w / 2, y + slabH / 2 + 3);
    ctx.restore();
  });

  // 「30秒 勝負！」のバッジ
  ctx.save();
  ctx.translate(left + 540, top + 40);
  ctx.rotate(0.18);
  drawBurst(ctx, 0, 0, 84, "#FF6B4A", 14);
  ctx.fillStyle = INK;
  ctx.font = font(30);
  ctx.fillText("30秒", 0, -14);
  ctx.fillText("勝負！", 0, 22);
  ctx.restore();

  // ひとこと（背景の上の文字は inkOn の色）
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.font = font(fitSize(ctx, "止めて、重ねて、空まで積め。", 44, 560));
  ctx.fillText("止めて、重ねて、空まで積め。", left, 478);

  // 右：積み木の塔
  const unit = 1.5;
  const slabW = BASE_WIDTH * unit;
  const slabHeight = SLAB_HEIGHT * unit;
  const cx = 900;
  TOWER_OFFSETS.forEach((off, i) => {
    drawSlab(ctx, cx + off * unit, GROUND - i * slabHeight, slabW - i * 4, slabHeight, BLOCK_COLORS[i % BLOCK_COLORS.length], unit);
  });

  // 右上：称号のシール（見本）
  const cardW = 400;
  const cardH = 100;
  ctx.save();
  ctx.translate(cx, 112);
  ctx.rotate(-0.025);
  drawSticker(ctx, -cardW / 2, -cardH / 2, cardW, cardH, CREAM, 18, 8);
  ctx.font = font(18);
  const tagW = ctx.measureText("称号").width + 28;
  drawSticker(ctx, -cardW / 2 + 18, -cardH / 2 - 15, tagW, 32, "#FF6B4A", 16, 0);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.fillText("称号", -cardW / 2 + 18 + tagW / 2, -cardH / 2 + 2);
  ctx.font = font(fitSize(ctx, "雲をつかむ人", 46, cardW - 40));
  ctx.fillText("雲をつかむ人", 0, 8);
  ctx.restore();
}
