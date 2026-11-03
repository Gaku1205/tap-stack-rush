// 積み上げの判定（入力から出力が決まる部分）。座標は「世界の単位」で、塔の中心が x=0
export interface Slab {
  /** 中心の x */
  x: number;
  /** 幅 */
  w: number;
}

export type DropKind = "perfect" | "cut" | "miss";

export interface DropResult {
  kind: DropKind;
  /** 塔に残るブロック（miss のときは null） */
  placed: Slab | null;
  /** 切れて落ちるかけら（perfect のときは null。miss のときは落ちたブロック全部） */
  chip: Slab | null;
  /** 次の連続ピッタリの数 */
  combo: number;
}

export const BASE_WIDTH = 220;
export const SLAB_HEIGHT = 26;
/** これより小さいずれは「ピッタリ」として揃える */
export const PERFECT_TOLERANCE = 5;
/** 3連続ピッタリから、1回ごとに幅がこれだけ戻る（BASE_WIDTH まで） */
export const COMBO_GROW = 8;

/**
 * 動いているブロック `moving` を、いちばん上のブロック `top` の上で止めた結果を返す
 */
export function drop(top: Slab, moving: Slab, combo: number): DropResult {
  const dx = moving.x - top.x;
  const ad = Math.abs(dx);
  if (ad <= PERFECT_TOLERANCE) {
    const nextCombo = combo + 1;
    const grow = nextCombo >= 3 ? COMBO_GROW : 0;
    const w = Math.min(BASE_WIDTH, moving.w + grow);
    return { kind: "perfect", placed: { x: top.x, w }, chip: null, combo: nextCombo };
  }
  const topL = top.x - top.w / 2;
  const topR = top.x + top.w / 2;
  const mL = moving.x - moving.w / 2;
  const mR = moving.x + moving.w / 2;
  const l = Math.max(topL, mL);
  const r = Math.min(topR, mR);
  if (r - l <= 0.5) {
    return { kind: "miss", placed: null, chip: { ...moving }, combo: 0 };
  }
  const placed: Slab = { x: (l + r) / 2, w: r - l };
  // 切れたかけら：はみ出した側
  const chip: Slab = dx > 0 ? { x: (r + mR) / 2, w: mR - r } : { x: (mL + l) / 2, w: l - mL };
  return { kind: "cut", placed, chip, combo: 0 };
}

/** 何階目のブロックが動く速さ（単位/秒）。高いほど速い */
export function speedFor(floor: number): number {
  return Math.min(560, 170 + floor * 11);
}

/** 動くブロックが左右に行き来する幅（中心からの距離） */
export const SWING = 160;

/**
 * 経過時間 t 秒での、行き来するブロックの x。start が -1 なら左から、1 なら右から出る
 */
export function swingX(t: number, speed: number, start: -1 | 1): number {
  const span = SWING * 2;
  const d = (t * speed) % (span * 2);
  const p = d < span ? d : span * 2 - d; // 0..span..0
  return start === -1 ? -SWING + p : SWING - p;
}
