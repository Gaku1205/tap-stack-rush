import { describe, expect, it } from "vitest";
import { BASE_WIDTH, COMBO_GROW, drop, speedFor, swingX, SWING } from "./stack";

describe("drop", () => {
  const top = { x: 0, w: 200 };

  it("ずれが小さければピッタリで、上に揃える", () => {
    const r = drop(top, { x: 3, w: 200 }, 0);
    expect(r.kind).toBe("perfect");
    expect(r.placed).toEqual({ x: 0, w: 200 });
    expect(r.chip).toBeNull();
    expect(r.combo).toBe(1);
  });

  it("3連続ピッタリから幅が戻る（最初の幅まで）", () => {
    expect(drop({ x: 0, w: 100 }, { x: 0, w: 100 }, 2).placed?.w).toBe(100 + COMBO_GROW);
    expect(drop({ x: 0, w: BASE_WIDTH }, { x: 0, w: BASE_WIDTH }, 5).placed?.w).toBe(BASE_WIDTH);
  });

  it("右にずれたら重なった分だけ残り、右のはみ出しが切れる", () => {
    const r = drop(top, { x: 50, w: 200 }, 4);
    expect(r.kind).toBe("cut");
    expect(r.placed).toEqual({ x: 25, w: 150 });
    expect(r.chip).toEqual({ x: 125, w: 50 });
    expect(r.combo).toBe(0);
  });

  it("左にずれたら左のはみ出しが切れる", () => {
    const r = drop(top, { x: -30, w: 200 }, 0);
    expect(r.placed).toEqual({ x: -15, w: 170 });
    expect(r.chip).toEqual({ x: -115, w: 30 });
  });

  it("重ならなければ外れ", () => {
    const r = drop(top, { x: 210, w: 200 }, 3);
    expect(r.kind).toBe("miss");
    expect(r.placed).toBeNull();
    expect(r.combo).toBe(0);
  });
});

describe("速さと動き", () => {
  it("高いほど速く、上限がある", () => {
    expect(speedFor(10)).toBeGreaterThan(speedFor(0));
    expect(speedFor(1000)).toBe(560);
  });

  it("端から出て、端で折り返す", () => {
    expect(swingX(0, 100, -1)).toBe(-SWING);
    expect(swingX(0, 100, 1)).toBe(SWING);
    expect(swingX((SWING * 2) / 100, 100, -1)).toBeCloseTo(SWING);
    expect(swingX((SWING * 4) / 100, 100, -1)).toBeCloseTo(-SWING);
  });
});
