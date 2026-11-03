import { describe, expect, it } from "vitest";
import { CREAM, contrast, hexToRgb, INK, inkOn, rgbToCss, SKY_STOPS, skyAt } from "./color";

describe("背景の色", () => {
  it("決めた階ではその色", () => {
    expect(rgbToCss(skyAt(0))).toBe(rgbToCss(hexToRgb("#FFE14D")));
    expect(rgbToCss(skyAt(16))).toBe(rgbToCss(hexToRgb("#12C29B")));
    expect(rgbToCss(skyAt(99))).toBe(rgbToCss(hexToRgb("#17132B")));
  });

  it("途中の色は濁らない（彩度が下がりすぎない）", () => {
    const [r, g, b] = skyAt(12);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(120);
  });

  it("どの高さでも、選んだ文字の色は 4.5:1 以上で読める", () => {
    const last = SKY_STOPS[SKY_STOPS.length - 1].floor;
    for (let f = 0; f <= last; f += 0.25) {
      const bg = skyAt(f);
      const ink = hexToRgb(inkOn(bg));
      expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("明るい背景は墨、暗い背景はクリーム", () => {
    expect(inkOn(hexToRgb("#FFE14D"))).toBe(INK);
    expect(inkOn(hexToRgb("#17132B"))).toBe(CREAM);
  });
});
