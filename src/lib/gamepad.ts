// ゲームパッドの A ボタン（standard マッピングの buttons[0]）の押し始めを見つける

export type PadLike = { buttons: ReadonlyArray<{ pressed: boolean }> } | null;

/** 各パッドの A ボタンが今押されているか（順番はパッドの並びのまま） */
export function aPressedStates(pads: ArrayLike<PadLike> | null | undefined): boolean[] {
  if (!pads) return [];
  const out: boolean[] = [];
  for (let i = 0; i < pads.length; i++) {
    out.push(pads[i]?.buttons[0]?.pressed === true);
  }
  return out;
}

/**
 * 前のフレームと今の状態から「いま押された」を返す。
 * どれか1つのパッドで、離れていた A が押された時だけ true。
 */
export function justPressed(prev: readonly boolean[], now: readonly boolean[]): boolean {
  for (let i = 0; i < now.length; i++) {
    if (now[i] && !prev[i]) return true;
  }
  return false;
}
