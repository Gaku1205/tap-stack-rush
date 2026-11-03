// 積み木で組んだ数字（スコア用）。3×5 マスの角丸の四角を積んで1文字にする
const GLYPHS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};

/** 文字列の幅（マスの大きさ cell で） */
export function blockTextWidth(text: string, cell: number): number {
  return text.length * cell * 3 + Math.max(0, text.length - 1) * cell * 0.7;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 中央 cx・上 y から、積み木の数字を描く。fill がマスの色、ink が輪郭と影
 * pop（0〜1）で、上の段ほど少し跳ねる（数字が変わった瞬間の動き）
 */
export function drawBlockText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  cell: number,
  fill: string,
  ink: string,
  pop = 0,
): void {
  const total = blockTextWidth(text, cell);
  let x = cx - total / 2;
  const gap = Math.max(1, cell * 0.08);
  const shadow = Math.max(2, cell * 0.16);
  const lw = Math.max(1.5, cell * 0.12);
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) {
      for (let row = 0; row < 5; row++) {
        const lift = pop * (5 - row) * cell * 0.08;
        for (let col = 0; col < 3; col++) {
          if (g[row][col] !== "#") continue;
          const px = x + col * cell + gap;
          const py = y + row * cell + gap - lift;
          const s = cell - gap * 2;
          ctx.fillStyle = ink;
          roundRect(ctx, px, py + shadow, s, s, cell * 0.22);
          ctx.fill();
          ctx.fillStyle = fill;
          roundRect(ctx, px, py, s, s, cell * 0.22);
          ctx.fill();
          ctx.lineWidth = lw;
          ctx.strokeStyle = ink;
          ctx.stroke();
        }
      }
    }
    x += cell * 3.7;
  }
}
