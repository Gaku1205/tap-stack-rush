import { describe, expect, it } from "vitest";
import { aPressedStates, justPressed } from "./gamepad";

const pad = (pressed: boolean) => ({ buttons: [{ pressed }] });

describe("justPressed", () => {
  it("押していない→押した で true", () => {
    expect(justPressed([false], [true])).toBe(true);
  });
  it("押しっぱなしは false", () => {
    expect(justPressed([true], [true])).toBe(false);
  });
  it("離した時は false", () => {
    expect(justPressed([true], [false])).toBe(false);
  });
  it("ずっと押していない時は false", () => {
    expect(justPressed([false], [false])).toBe(false);
  });
  it("複数のパッド：どれかが押し始めたら true", () => {
    expect(justPressed([true, false], [true, true])).toBe(true);
    expect(justPressed([true, false], [true, false])).toBe(false);
  });
  it("前のフレームに無かったパッドは、押されていれば true", () => {
    expect(justPressed([], [true])).toBe(true);
  });
  it("パッドが無ければ false", () => {
    expect(justPressed([], [])).toBe(false);
  });
});

describe("aPressedStates", () => {
  it("A ボタンの状態を並びのまま返す", () => {
    expect(aPressedStates([pad(true), null, pad(false)])).toEqual([true, false, false]);
  });
  it("無い・空でも落ちない", () => {
    expect(aPressedStates(null)).toEqual([]);
    expect(aPressedStates(undefined)).toEqual([]);
    expect(aPressedStates([])).toEqual([]);
    expect(aPressedStates([{ buttons: [] }])).toEqual([false]);
  });
});
