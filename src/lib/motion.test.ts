import { describe, expect, it } from "vitest";
import { burstRotation, motionOffset } from "./motion";

describe("motionOffset", () => {
  it("動きを減らさないときは元の量", () => expect(motionOffset(false, 6)).toBe(6));
  it("動きを減らすときは 0（跳ねない・流れない）", () => expect(motionOffset(true, 6)).toBe(0));
  it("負の量も同じ規則", () => expect(motionOffset(false, -30)).toBe(-30));
});

describe("burstRotation", () => {
  it("動きを減らさないときは時刻どおり回る", () => expect(burstRotation(false, 2.5)).toBe(2.5));
  it("動きを減らすときは回さない", () => expect(burstRotation(true, 2.5)).toBe(0));
});
