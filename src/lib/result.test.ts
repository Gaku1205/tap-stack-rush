import { describe, expect, it } from "vitest";
import { baseTitle, commentFor, heightMeters, shareText, titleFor, type RunStats } from "./result";

const base: RunStats = { floors: 12, perfects: 2, maxCombo: 1, finalWidthRate: 0.6, reason: "timeup", seconds: 30 };

describe("称号", () => {
  it("高さで段階が上がる", () => {
    expect(baseTitle(0)).toBe("地面とお友だち");
    expect(baseTitle(12)).toBe("屋上の住人");
    expect(baseTitle(45)).toBe("宇宙まで積んだ人");
  });

  it("ピッタリが多いと頭に「ピタ止めの」", () => {
    expect(titleFor({ ...base, perfects: 9 })).toBe("ピタ止めの屋上の住人");
  });

  it("細くなって耐えたら「綱渡りの」", () => {
    expect(titleFor({ ...base, finalWidthRate: 0.1 })).toBe("綱渡りの屋上の住人");
  });

  it("特徴が無ければ高さの称号だけ", () => {
    expect(titleFor(base)).toBe("屋上の住人");
  });
});

describe("ひとこと", () => {
  it("連続ピッタリが目立てばそれを言う", () => {
    expect(commentFor({ ...base, maxCombo: 7 })).toBe("最大 7 連続ピタッ！");
  });
  it("高さをキリンで言う", () => {
    expect(commentFor(base)).toBe("キリン 7.2 頭ぶんの高さ");
  });
  it("0階でも励ます", () => {
    expect(commentFor({ ...base, floors: 0 })).toContain("1段目");
  });
});

describe("共有の文", () => {
  it("階数・高さ・称号・URL が入る", () => {
    const t = shareText(base, "https://example.com/");
    expect(heightMeters(12)).toBe(36);
    expect(t).toContain("12階（36m）");
    expect(t).toContain("称号「屋上の住人」");
    expect(t).toContain("https://example.com/");
  });
});
