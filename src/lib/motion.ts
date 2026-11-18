/**
 * 動きを減らす設定（prefers-reduced-motion）のときは 0、そうでなければ元の量を返す。
 * 点数の跳ね・ポップの流れなど、位置のずれに使う。
 */
export function motionOffset(reduced: boolean, amount: number): number {
  return reduced ? 0 : amount;
}

/**
 * 連続のバッジ（ギザギザ）の回転の角度。動きを減らすときは回さず 0 のまま。
 */
export function burstRotation(reduced: boolean, clock: number): number {
  return reduced ? 0 : clock;
}
