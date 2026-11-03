// 結果（称号・ひとこと・共有の文）を、その回の記録から決める
export type EndReason = "timeup" | "miss";

export interface RunStats {
  floors: number;
  perfects: number;
  maxCombo: number;
  /** 最後に残ったブロックの幅 ÷ 最初の幅（0〜1） */
  finalWidthRate: number;
  reason: EndReason;
  /** 遊んだ秒数 */
  seconds: number;
}

/** 1階あたりの高さ（m） */
export const METERS_PER_FLOOR = 3;
const GIRAFFE_M = 5;

export function heightMeters(floors: number): number {
  return floors * METERS_PER_FLOOR;
}

const TIERS: ReadonlyArray<readonly [number, string]> = [
  [4, "地面とお友だち"],
  [9, "ひよっこ積み師"],
  [15, "屋上の住人"],
  [22, "雲をつかむ人"],
  [30, "空の大工"],
  [40, "成層圏の棟梁"],
  [Infinity, "宇宙まで積んだ人"],
];

export function baseTitle(floors: number): string {
  for (const [limit, name] of TIERS) if (floors < limit) return name;
  return TIERS[TIERS.length - 1][1];
}

/** 称号の頭につく、その回の特徴（無いときは空） */
export function titlePrefix(s: RunStats): string {
  if (s.floors < 3) return "";
  const rate = s.perfects / s.floors;
  if (rate >= 0.6) return "ピタ止めの";
  if (s.maxCombo >= 6) return "連続ピタッの";
  if (s.reason === "miss" && s.floors >= 15) return "あと一歩の";
  if (s.finalWidthRate < 0.25) return "綱渡りの";
  if (s.floors / Math.max(1, s.seconds) >= 1.1) return "早押しの";
  return "";
}

export function titleFor(s: RunStats): string {
  return titlePrefix(s) + baseTitle(s.floors);
}

/** その回を表すひとこと */
export function commentFor(s: RunStats): string {
  if (s.floors === 0) return "1段目で落っこちた。次はいける";
  if (s.maxCombo >= 4) return `最大 ${s.maxCombo} 連続ピタッ！`;
  if (s.finalWidthRate < 0.25) return `最後は幅 ${Math.max(1, Math.round(s.finalWidthRate * 100))}% で耐えた`;
  const g = heightMeters(s.floors) / GIRAFFE_M;
  if (g >= 1) return `キリン ${Math.floor(g * 10) / 10} 頭ぶんの高さ`;
  return `ピタッ ${s.perfects} 回`;
}

export function shareText(s: RunStats, url: string): string {
  return `TAP STACK RUSH で ${s.floors}階（${heightMeters(s.floors)}m）積んだ！\n称号「${titleFor(s)}」\n${commentFor(s)}\n${url}`;
}
