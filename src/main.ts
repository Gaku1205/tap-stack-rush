import { Game, type Scene } from "./game";
import { shareText } from "./lib/result";
import { drawOgCard, OG_HEIGHT, OG_WIDTH } from "./ogCard";

// 入口：canvas とボタン（音・スタート・もう一回・シェア）をつなぐ
const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("canvas がありません");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D の描画が使えません");

const BEST_KEY = "tap-stack-rush:best";
const MUTE_KEY = "tap-stack-rush:mute";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const ui = el("div", "ui");
const muteBtn = el("button", "btn-icon");
muteBtn.type = "button";
const startBtn = el("button", "btn-start", "タップでスタート");
startBtn.type = "button";
const actions = el("div", "actions");
const shareBtn = el("button", "btn btn-sub", "結果をシェア");
shareBtn.type = "button";
const retryBtn = el("button", "btn btn-main", "もう一回");
retryBtn.type = "button";
actions.append(shareBtn, retryBtn);
const toast = el("div", "toast");
toast.setAttribute("role", "status");
ui.append(muteBtn, startBtn, actions, toast);
document.body.append(ui);

const game = new Game(ctx, { onScene: sceneChanged });
game.best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
game.reduced = motion.matches;
motion.addEventListener("change", () => (game.reduced = motion.matches));

function setMuted(m: boolean): void {
  game.sound.setMuted(m);
  localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  muteBtn.setAttribute("aria-label", m ? "音を出す" : "音を消す");
  muteBtn.setAttribute("aria-pressed", String(m));
  muteBtn.innerHTML = m
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none"/></svg>';
}
setMuted(localStorage.getItem(MUTE_KEY) === "1");

function sceneChanged(scene: Scene): void {
  ui.dataset.scene = scene;
  if (scene === "over") {
    if (game.stats && game.newBest) localStorage.setItem(BEST_KEY, String(game.best));
    lockUntil = performance.now() + 450;
    window.setTimeout(() => retryBtn.focus({ preventScroll: true }), 500);
  }
}
let lockUntil = 0;

function showToast(text: string): void {
  toast.textContent = text;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

async function share(): Promise<void> {
  const st = game.stats;
  if (!st) return;
  game.sound.ui();
  const url = location.origin + location.pathname;
  const text = shareText(st, url);
  const data: ShareData = { title: "TAP STACK RUSH", text };
  try {
    const blob = await new Promise<Blob | null>((res) => canvas!.toBlob(res, "image/png"));
    if (blob) {
      const file = new File([blob], "tap-stack-rush.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) data.files = [file];
    }
  } catch {
    // 画像が作れなくても、文だけ送る
  }
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("結果の文をコピーしました");
  } catch {
    showToast("コピーできませんでした");
  }
}

function retry(): void {
  if (performance.now() < lockUntil) return;
  game.sound.unlock();
  game.start();
}

muteBtn.addEventListener("click", () => {
  game.sound.unlock();
  setMuted(!game.sound.muted);
});
startBtn.addEventListener("click", () => game.action());
retryBtn.addEventListener("click", retry);
shareBtn.addEventListener("click", () => void share());

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (game.scene === "over") return;
  game.action();
});
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const onButton = document.activeElement instanceof HTMLButtonElement;
  const k = e.key.toLowerCase();
  if (k === "m") {
    game.sound.unlock();
    setMuted(!game.sound.muted);
    return;
  }
  if (game.scene === "over") {
    if (k === "r" || ((k === " " || k === "enter") && !onButton)) {
      e.preventDefault();
      retry();
    } else if (k === "s") void share();
    return;
  }
  if (k === " " || k === "enter" || k === "arrowdown" || k === "arrowup") {
    e.preventDefault();
    // スタートのボタンにフォーカスがあるときは、ボタンの click に任せる
    if (onButton && game.scene === "title" && k !== "arrowdown" && k !== "arrowup") return;
    game.action();
  }
});
document.addEventListener("gesturestart", (e) => e.preventDefault());

// 画面の大きさ
let L = game.layout(window.innerWidth, window.innerHeight);
function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas!.width = Math.floor(w * dpr);
  canvas!.height = Math.floor(h * dpr);
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  L = game.layout(w, h);
  ui.style.left = `${L.sx}px`;
  ui.style.width = `${L.sw}px`;
  const gy = L.ground;
  startBtn.style.top = `${gy}px`;
  startBtn.style.height = `${L.h - gy}px`;
}
// URL で場面を直接開く（撮影用）：?scene=play / ?scene=result / ?scene=og
const scene = new URLSearchParams(location.search).get("scene");
if (scene !== "og") {
  window.addEventListener("resize", resize);
  resize();
}
if (scene === "og") {
  // SNS のカード画像（1200×630）を1枚だけ描く。撮って public/og.png に置く
  ui.remove();
  canvas.style.width = `${OG_WIDTH}px`;
  canvas.style.height = `${OG_HEIGHT}px`;
  canvas.width = OG_WIDTH;
  canvas.height = OG_HEIGHT;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  document.documentElement.style.overflow = "auto";
  document.body.style.overflow = "auto";
  drawOgCard(ctx);
} else if (scene === "play") game.startDemo(14);
else if (scene === "result") game.showDemoResult();
else sceneChanged("title");

let last = performance.now();
function frame(now: number): void {
  // 遅い端末でも30秒が30秒になるように、実際の時間で進める（タブを離れた時だけ切る）
  const raw = (now - last) / 1000;
  last = now;
  game.update(Math.min(0.05, raw), L, Math.min(1, raw));
  game.render(L);
  requestAnimationFrame(frame);
}
if (scene !== "og") requestAnimationFrame(frame);
// 別のタブに移っていた間は、時計を進めない
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) last = performance.now();
});
