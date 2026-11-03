// ゲームの本体：タイトル → 遊ぶ → 結果。描画は Canvas 2D
import { Sound } from "./audio";
import { blockTextWidth, drawBlockText, roundRect } from "./digits";
import { drawBurst, drawRays, drawSlab, drawSticker, fitSize, font, strokeText } from "./draw";
import { BLOCK_COLORS, CREAM, INK, inkOn, rgbToCss, skyAt, type Rgb } from "./lib/color";
import { commentFor, heightMeters, titleFor, type EndReason, type RunStats } from "./lib/result";
import { BASE_WIDTH, drop, SLAB_HEIGHT, speedFor, swingX, type Slab } from "./lib/stack";

export type Scene = "title" | "play" | "over";

interface Placed extends Slab {
  color: string;
  /** 置いてからの秒数（つぶれの動き） */
  age: number;
}
interface Chip extends Slab {
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}
interface Ring {
  x: number;
  y: number;
  w: number;
  life: number;
  max: number;
}
interface Popup {
  text: string;
  sub: string;
  x: number;
  y: number;
  life: number;
  max: number;
}

export interface Layout {
  w: number;
  h: number;
  /** 舞台（縦長の列）の左と幅 */
  sx: number;
  sw: number;
  cx: number;
  /** 世界の1単位が何 px か */
  s: number;
  /** 地面の線（画面の y） */
  ground: number;
}

export const TIME_START = 30;
export const PERFECT_BONUS = 1;
const H = SLAB_HEIGHT;

export interface GameEvents {
  onScene: (scene: Scene) => void;
}

export class Game {
  scene: Scene = "title";
  readonly sound = new Sound();
  reduced = false;
  best = 0;
  newBest = false;
  stats: RunStats | null = null;

  private tower: Placed[] = [];
  private moving = { x: 0, w: BASE_WIDTH, t: 0, start: -1 as -1 | 1, color: BLOCK_COLORS[1] as string };
  private chips: Chip[] = [];
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private popups: Popup[] = [];
  private combo = 0;
  private maxCombo = 0;
  private perfects = 0;
  timeLeft = TIME_START;
  private elapsed = 0;
  private cam = 0;
  private shake = 0;
  private flash = 0;
  private hitstop = 0;
  private lines = 0;
  private scorePop = 0;
  private dip = 0;
  private ending: EndReason | null = null;
  private endT = 0;
  private clock = 0;
  private overT = 0;
  /** 撮影用：自動で積む（最初の操作で止まる） */
  auto = false;
  private autoTarget = 0;
  private lastTick = 99;
  private stars: Array<[number, number, number]> = [];

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly events: GameEvents,
  ) {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) this.stars.push([rnd(), rnd(), 0.6 + rnd() * 1.6]);
    this.resetTower();
    // タイトルの見本：少しずれながら積んだ塔
    const offs = [0, -14, -14, 6, 6, 6];
    let w = BASE_WIDTH;
    for (let i = 1; i < offs.length; i++) {
      const prev = this.tower[i - 1];
      w -= Math.abs(offs[i] - (offs[i - 1] ?? 0));
      this.tower.push({ x: prev.x + (offs[i] - offs[i - 1]) / 2, w, color: BLOCK_COLORS[i % BLOCK_COLORS.length], age: 9 });
    }
    this.nextMoving();
  }

  get floors(): number {
    return Math.max(0, this.tower.length - 1);
  }

  layout(w: number, h: number): Layout {
    const sw = Math.min(w, Math.max(320, h * 0.62));
    const sx = (w - sw) / 2;
    const s = Math.min(sw / 400, h / 760);
    return { w, h, sx, sw, cx: sx + sw / 2, s, ground: h * 0.8 };
  }

  private resetTower(): void {
    this.tower = [{ x: 0, w: BASE_WIDTH, color: BLOCK_COLORS[0], age: 9 }];
    this.chips = [];
    this.particles = [];
    this.rings = [];
    this.popups = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.perfects = 0;
    this.timeLeft = TIME_START;
    this.elapsed = 0;
    this.cam = 0;
    this.skyF = 0;
    this.ending = null;
    this.endT = 0;
    this.lastTick = 99;
    this.nextMoving();
  }

  private nextMoving(): void {
    const top = this.tower[this.tower.length - 1];
    const i = this.tower.length;
    this.moving = {
      x: 0,
      w: top.w,
      t: 0,
      start: i % 2 === 0 ? 1 : -1,
      color: BLOCK_COLORS[i % BLOCK_COLORS.length],
    };
    this.moving.x = swingX(0, speedFor(this.floors), this.moving.start);
    this.autoTarget = Math.random() < 0.8 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 20);
  }

  start(): void {
    this.resetTower();
    this.scene = "play";
    this.stats = null;
    this.newBest = false;
    this.sound.start();
    this.events.onScene(this.scene);
  }

  /** 撮影用：途中まで積んだ状態から始める */
  startDemo(floors: number): void {
    this.start();
    this.auto = true;
    for (let i = 0; i < floors; i++) {
      const top = this.tower[this.tower.length - 1];
      const off = i % 4 === 3 ? 9 : 0;
      const w = Math.max(60, top.w - off);
      this.tower.push({ x: top.x + off / 2, w, color: BLOCK_COLORS[this.tower.length % BLOCK_COLORS.length], age: 9 });
    }
    this.perfects = Math.floor(floors * 0.7);
    this.combo = 3;
    this.maxCombo = 5;
    this.timeLeft = 17.4;
    this.elapsed = 14;
    this.nextMoving();
    this.cam = this.camTarget(this.layout(this.ctx.canvas.clientWidth, this.ctx.canvas.clientHeight));
    this.skyF = floors;
  }

  /** 撮影用：結果の画面を直接開く */
  showDemoResult(): void {
    this.startDemo(23);
    this.auto = false;
    this.finish({ floors: 23, perfects: 15, maxCombo: 7, finalWidthRate: 0.42, reason: "timeup", seconds: 41 });
  }

  /** タップ・スペース */
  action(): void {
    this.sound.unlock();
    if (this.scene === "title") {
      this.start();
      return;
    }
    if (this.scene === "play" && !this.ending) {
      this.auto = false;
      this.place();
    }
  }

  private place(): void {
    const top = this.tower[this.tower.length - 1];
    const m = this.moving;
    const r = drop(top, { x: m.x, w: m.w }, this.combo);
    const yTop = this.tower.length * H;
    this.combo = r.combo;
    if (r.kind === "miss") {
      if (r.chip) this.addChip(r.chip, yTop, m.color, m.x > top.x ? 1 : -1, true);
      this.sound.miss();
      this.shake = this.reduced ? 0 : 16;
      this.end("miss");
      return;
    }
    const placed = r.placed;
    if (!placed) return;
    this.tower.push({ ...placed, color: m.color, age: 0 });
    this.dip = 1;
    this.scorePop = 1;
    if (r.kind === "perfect") {
      this.perfects++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.timeLeft += PERFECT_BONUS;
      this.rings.push({ x: placed.x, y: yTop + H / 2, w: placed.w, life: 0, max: 0.45 + Math.min(this.combo, 8) * 0.04 });
      if (this.combo >= 3) this.rings.push({ x: placed.x, y: yTop + H / 2, w: placed.w * 1.2, life: -0.08, max: 0.55 });
      this.flash = this.reduced ? 0 : 0.6;
      this.hitstop = 0.045;
      this.lines = this.combo >= 3 && !this.reduced ? 0.28 : 0;
      this.burst(placed.x, yTop + H, placed.w, 10 + Math.min(this.combo, 10) * 2, true);
      this.popups.push({
        text: this.combo >= 5 ? "神ピタッ！" : "ピタッ！",
        sub: this.combo >= 2 ? `×${this.combo}  +${PERFECT_BONUS}秒` : `+${PERFECT_BONUS}秒`,
        x: placed.x,
        y: yTop + H * 2.6,
        life: 0,
        max: 0.75,
      });
      this.sound.perfect(this.combo);
      navigator.vibrate?.(12);
    } else if (r.chip) {
      const dir = m.x > top.x ? 1 : -1;
      this.addChip(r.chip, yTop, m.color, dir, false);
      const rate = r.chip.w / m.w;
      this.shake = this.reduced ? 0 : 3 + Math.min(10, r.chip.w * 0.12);
      this.burst(dir > 0 ? placed.x + placed.w / 2 : placed.x - placed.w / 2, yTop + H / 2, 4, 6, false);
      this.sound.cut(rate);
    }
    this.nextMoving();
  }

  private addChip(c: Slab, y: number, color: string, dir: number, whole: boolean): void {
    this.chips.push({
      ...c,
      y,
      vx: dir * (whole ? 60 : 40 + Math.random() * 60),
      vy: whole ? 0 : 60,
      rot: 0,
      vr: dir * (whole ? 1.2 : 2 + Math.random() * 3),
      color,
      life: 0,
    });
  }

  private burst(x: number, y: number, w: number, n: number, bright: boolean): void {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI;
      const sp = 120 + Math.random() * 260;
      this.particles.push({
        x: x + (Math.random() - 0.5) * w,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.8 + 60,
        life: 0,
        max: 0.5 + Math.random() * 0.4,
        size: 3 + Math.random() * 5,
        color: bright ? (i % 3 === 0 ? INK : i % 3 === 1 ? CREAM : BLOCK_COLORS[(i % 5) + 1]) : INK,
      });
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  private end(reason: EndReason): void {
    this.ending = reason;
    this.endT = 0;
    this.combo = 0;
    this.popups.push({ text: reason === "timeup" ? "タイムアップ！" : "落っこちた！", sub: "", x: 0, y: 0, life: 0, max: 1.4 });
  }

  private finish(stats: RunStats): void {
    this.stats = stats;
    this.newBest = stats.floors > this.best;
    if (this.newBest) this.best = stats.floors;
    this.scene = "over";
    this.overT = 0;
    this.sound.end();
    this.events.onScene(this.scene);
  }

  private camTarget(L: Layout): number {
    const above = (L.ground - L.h * 0.44) / L.s;
    return Math.max(0, (this.tower.length + 1) * H - above);
  }

  /** dt：動きの時間（短く切る）。real：時計の時間（実際に過ぎた時間） */
  update(dt: number, L: Layout, real = dt): void {
    this.clock += dt;
    let sim = dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      sim = 0;
    }
    if (this.ending) sim *= 0.55;

    if (this.scene === "play") {
      if (!this.ending) {
        this.elapsed += real;
        this.timeLeft -= real;
        const sec = Math.ceil(this.timeLeft);
        if (sec <= 5 && sec < this.lastTick && sec > 0) this.sound.tick(sec <= 3);
        this.lastTick = sec;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.sound.miss();
          this.end("timeup");
        }
      } else {
        this.endT += real;
        if (this.endT > 1.25) {
          const top = this.tower[this.tower.length - 1];
          this.finish({
            floors: this.floors,
            perfects: this.perfects,
            maxCombo: this.maxCombo,
            finalWidthRate: top.w / BASE_WIDTH,
            reason: this.ending,
            seconds: this.elapsed,
          });
        }
      }
      const m = this.moving;
      if (!this.ending) {
        m.t += sim;
        m.x = swingX(m.t, speedFor(this.floors), m.start);
        if (this.auto) {
          const top = this.tower[this.tower.length - 1];
          const d = m.x - (top.x + this.autoTarget);
          if (Math.abs(d) < speedFor(this.floors) * dt * 0.6 && m.t > 0.25) {
            this.place();
            if (this.timeLeft < 8) this.timeLeft += 6;
          }
        }
      }
      this.cam += (this.camTarget(L) - this.cam) * Math.min(1, dt * 7);
      this.skyF += (this.floors - this.skyF) * Math.min(1, dt * 3);
    } else if (this.scene === "title") {
      const m = this.moving;
      m.t += dt;
      m.x = swingX(m.t, 150, m.start);
    } else {
      this.overT += dt;
    }

    for (const p of this.tower) p.age += dt;
    for (const c of this.chips) {
      c.life += sim;
      c.vy -= 1500 * sim;
      c.x += c.vx * sim;
      c.y += c.vy * sim;
      c.rot += c.vr * sim;
    }
    this.chips = this.chips.filter((c) => c.life < 2.2);
    for (const p of this.particles) {
      p.life += dt;
      p.vy -= 700 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const r of this.rings) r.life += dt;
    this.rings = this.rings.filter((r) => r.life < r.max);
    for (const p of this.popups) p.life += dt;
    this.popups = this.popups.filter((p) => p.life < p.max);
    this.shake = Math.max(0, this.shake - dt * 60);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.lines = Math.max(0, this.lines - dt);
    this.scorePop = Math.max(0, this.scorePop - dt * 5);
    this.dip = Math.max(0, this.dip - dt * 7);
  }

  // ───────── 描画 ─────────

  private skyF = 0;

  private sky(): Rgb {
    if (this.scene === "title") return skyAt(0);
    return skyAt(this.scene === "over" ? this.floors : this.skyF);
  }

  render(L: Layout): void {
    const ctx = this.ctx;
    const bg = this.sky();
    const ink = inkOn(bg);
    ctx.save();
    ctx.fillStyle = rgbToCss(bg);
    ctx.fillRect(0, 0, L.w, L.h);
    const spin = this.reduced ? 0 : this.clock * 0.05;
    if (this.scene !== "play") {
      const cy = this.scene === "title" ? L.h * 0.2 : L.h * 0.45;
      drawRays(ctx, L.cx, cy, ink === INK ? "#FFFFFF" : CREAM, ink === INK ? 0.28 : 0.08, spin, 22);
    }
    if (this.scene === "over") {
      this.drawSideDecor(L, ink);
      this.drawResult(L, ink);
      ctx.restore();
      return;
    }
    this.drawStars(L);
    this.drawSideDecor(L, ink);
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawWorld(L);
    ctx.restore();
    if (this.scene === "title") this.drawTitle(L);
    else this.drawHud(L, ink);
  }

  private sy(L: Layout, y: number): number {
    return L.ground - (y - this.cam) * L.s;
  }

  private drawStars(L: Layout): void {
    const night = Math.min(1, Math.max(0, (this.cam / H - 22) / 10));
    const ctx = this.ctx;
    // 雲（中くらいの高さ）
    const cloudAlpha = Math.min(1, Math.max(0, (this.cam / H - 4) / 4)) * (1 - night);
    if (cloudAlpha > 0.01) {
      ctx.globalAlpha = cloudAlpha;
      for (let k = 0; k < 14; k++) {
        const wy = 260 + k * 150;
        const y = L.ground - (wy - this.cam * 0.55) * L.s;
        if (y < -60 || y > L.h + 60) continue;
        const x = L.cx + (((k * 97) % 200) - 100) * 1.6 * L.s + Math.sin(this.clock * 0.2 + k) * 10;
        this.drawCloud(x, y, (40 + (k % 3) * 14) * L.s);
      }
      ctx.globalAlpha = 1;
    }
    if (night <= 0.01) return;
    ctx.fillStyle = CREAM;
    for (const [rx, ry, r] of this.stars) {
      const y = (((ry * L.h + this.cam * 0.12 * L.s) % L.h) + L.h) % L.h;
      ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(this.clock * 2 + rx * 30));
      ctx.fillRect(rx * L.w, y, r * 1.4, r * 1.4);
    }
    ctx.globalAlpha = 1;
  }

  private drawCloud(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const shape = (oy: number): void => {
      ctx.beginPath();
      ctx.ellipse(x - r * 0.6, y + oy, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.1, y - r * 0.18 + oy, r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.8, y + oy, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
    };
    ctx.fillStyle = CREAM;
    shape(0);
    ctx.fill();
  }

  private drawSideDecor(L: Layout, ink: string): void {
    if (L.sx < 120) return;
    const ctx = this.ctx;
    const size = Math.min(L.sx * 0.42, L.h * 0.16);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = ink;
    ctx.font = font(size, true);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(L.sx * 0.5, L.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("TAP STACK", 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = ink;
    ctx.font = font(size, true);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(L.sx + L.sw + L.sx * 0.5, L.h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("RUSH!!", 0, 0);
    ctx.restore();
    // 操作の案内（PC）
    ctx.fillStyle = ink;
    ctx.font = font(15);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("スペース・クリックで止める", 32, L.h - 36);
    ctx.fillText("M で音を消す", 32, L.h - 14);
  }

  private drawWorld(L: Layout): void {
    const ctx = this.ctx;
    const s = L.s;
    // 地面
    const gy = this.sy(L, 0);
    if (gy < L.h) {
      ctx.fillStyle = INK;
      ctx.fillRect(0, gy, L.w, L.h - gy + 20);
    }
    const dip = this.dip * 4 * s;
    // 塔
    const first = Math.max(0, Math.floor((this.cam - 40) / H) - 1);
    for (let i = first; i < this.tower.length; i++) {
      const p = this.tower[i];
      const y = this.sy(L, i * H) + (i > 0 ? dip * Math.min(1, (i / this.tower.length) * 1.2) : 0);
      if (y < -40) break;
      const squash = this.reduced ? 0 : Math.max(0, 1 - p.age / 0.14) * (i === this.tower.length - 1 ? 1 : 0);
      drawSlab(ctx, L.cx + p.x * s, y, p.w * s, H * s, p.color, s, squash);
    }
    // 光（ピッタリ）
    for (const r of this.rings) {
      if (r.life < 0) continue;
      const t = r.life / r.max;
      const grow = 1 + t * 0.9;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 5 * s * (1 - t) + 1;
      ctx.strokeStyle = CREAM;
      const w = r.w * s * grow + 24 * s * t;
      const hh = H * s * (1 + t * 2.4);
      roundRect(ctx, L.cx + r.x * s - w / 2, this.sy(L, r.y) - hh / 2, w, hh, hh / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 動くブロック
    if (this.scene === "play" && !this.ending) {
      const m = this.moving;
      const y = this.sy(L, this.tower.length * H);
      // 落ちる位置の影（重なる幅の目安）
      const top = this.tower[this.tower.length - 1];
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = INK;
      ctx.fillRect(L.cx + (top.x - top.w / 2) * s, y - 2 * s, top.w * s, 2 * s);
      ctx.globalAlpha = 1;
      drawSlab(ctx, L.cx + m.x * s, y, m.w * s, H * s, m.color, s);
    } else if (this.scene === "title") {
      const m = this.moving;
      drawSlab(ctx, L.cx + m.x * s, this.sy(L, this.tower.length * H + H * 1.2), m.w * s, H * s, m.color, s);
    }
    // 切れたかけら
    for (const c of this.chips) {
      ctx.save();
      ctx.translate(L.cx + c.x * s, this.sy(L, c.y + H / 2));
      ctx.rotate(c.rot);
      drawSlab(ctx, 0, (H * s) / 2, c.w * s, H * s, c.color, s);
      ctx.restore();
    }
    // 集中線
    if (this.lines > 0) {
      const top = this.tower[this.tower.length - 1];
      const ox = L.cx + top.x * s;
      const oy = this.sy(L, this.tower.length * H);
      ctx.globalAlpha = Math.min(1, this.lines * 4) * 0.22;
      ctx.fillStyle = INK;
      const R = Math.max(L.w, L.h);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.03;
        const r0 = 120 * s + (i % 4) * 22 * s;
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(a - 0.012) * r0, oy + Math.sin(a - 0.012) * r0);
        ctx.lineTo(ox + Math.cos(a) * R, oy + Math.sin(a) * R);
        ctx.lineTo(ox + Math.cos(a + 0.012) * r0, oy + Math.sin(a + 0.012) * r0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 粒
    for (const p of this.particles) {
      const t = p.life / p.max;
      ctx.fillStyle = p.color;
      const z = p.size * s * (1 - t * 0.6);
      ctx.save();
      ctx.translate(L.cx + p.x * s, this.sy(L, p.y));
      ctx.rotate(p.life * 6);
      ctx.fillRect(-z / 2, -z / 2, z, z);
      ctx.restore();
    }
    // 白い光
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.22;
      ctx.fillStyle = CREAM;
      ctx.fillRect(0, 0, L.w, L.h);
      ctx.globalAlpha = 1;
    }
  }

  private drawHud(L: Layout, ink: string): void {
    const ctx = this.ctx;
    const pad = 18;
    // 時間のバー
    const barX = L.sx + pad;
    const barW = L.sw - pad * 2 - 56;
    const barY = 22;
    const barH = 16;
    const rate = Math.min(1, this.timeLeft / TIME_START);
    const urgent = this.timeLeft <= 5 && !this.ending;
    ctx.fillStyle = ink === INK ? "rgba(20,20,20,0.16)" : "rgba(255,246,229,0.2)";
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
    const blink = urgent && Math.floor(this.clock * 6) % 2 === 0;
    ctx.fillStyle = blink ? "#FF3B30" : ink;
    if (rate > 0) {
      roundRect(ctx, barX, barY, Math.max(barH, barW * rate), barH, barH / 2);
      ctx.fill();
    }
    ctx.font = font(15);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const label = `${Math.ceil(this.timeLeft)}秒`;
    ctx.fillStyle = rate > 0.2 ? (ink === INK ? CREAM : INK) : ink;
    ctx.fillText(label, rate > 0.2 ? barX + 10 : barX + barW * rate + barH + 4, barY + barH / 2 + 1);

    // スコア（積み木の数字）
    const text = String(this.floors);
    const cell = Math.min(L.sw * 0.052, 24);
    const y = 58;
    drawBlockText(ctx, text, L.cx, y - this.scorePop * 6, cell, CREAM, INK, this.reduced ? 0 : this.scorePop);
    ctx.font = font(15);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.fillText(`階 ・ ${heightMeters(this.floors)}m`, L.cx, y + cell * 5 + 12);
    if (this.combo >= 2) {
      const tw = blockTextWidth(text, cell);
      ctx.save();
      ctx.translate(L.cx + tw / 2 + 34, y + cell * 1.5);
      ctx.rotate(-0.12);
      drawBurst(ctx, 0, 0, 30, "#FF8FB1", 12, this.clock);
      ctx.font = font(15);
      ctx.fillStyle = INK;
      ctx.textBaseline = "middle";
      ctx.fillText(`×${this.combo}`, 0, 1);
      ctx.restore();
    }

    // 最初の2段だけ、何をすればいいかを出す
    if (this.floors < 2 && !this.ending && !this.auto) {
      const hy = L.h * 0.33;
      const b = this.reduced ? 0 : Math.abs(Math.sin(this.clock * 5)) * 8;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = font(fitSize(ctx, "重なった瞬間にタップ！", 24, L.sw - 40));
      ctx.fillStyle = ink;
      ctx.fillText("重なった瞬間にタップ！", L.cx, hy);
      ctx.beginPath();
      ctx.moveTo(L.cx - 14, hy + 30 + b);
      ctx.lineTo(L.cx + 14, hy + 30 + b);
      ctx.lineTo(L.cx, hy + 48 + b);
      ctx.closePath();
      ctx.fill();
    }

    // 吹き出し
    for (const p of this.popups) {
      const t = p.life / p.max;
      const pop = this.reduced ? 1 : t < 0.18 ? 0.4 + (t / 0.18) * 0.8 : t < 0.3 ? 1.2 - ((t - 0.18) / 0.12) * 0.2 : 1;
      const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      const big = p.sub === "";
      const px = big ? L.cx : Math.min(L.sx + L.sw - 90, Math.max(L.sx + 90, L.cx + p.x * L.s));
      const py = big ? L.h * 0.4 : this.sy(L, p.y) - t * 30;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(px, py);
      ctx.rotate(-0.07);
      ctx.scale(pop, pop);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (big) {
        drawBurst(ctx, 0, 0, Math.min(L.sw * 0.46, 200), "#FF8FB1", 18);
        const fs = fitSize(ctx, p.text, 40, Math.min(L.sw * 0.6, 260));
        ctx.font = font(fs);
        ctx.fillStyle = INK;
        ctx.fillText(p.text, 0, 2);
      } else {
        ctx.font = font(34);
        strokeText(ctx, p.text, 0, 0, CREAM, INK, 9);
        ctx.font = font(16);
        strokeText(ctx, p.sub, 0, 30, "#FFC83D", INK, 6);
      }
      ctx.restore();
    }
  }

  private drawTitle(L: Layout): void {
    const ctx = this.ctx;
    const sw = L.sw;
    const top = L.h * 0.1;
    const slabH = Math.min(sw * 0.17, L.h * 0.085);
    const words: Array<[string, number, number, string]> = [
      ["TAP", 0.56, -16, "#FF8FB1"],
      ["STACK", 0.82, 10, CREAM],
      ["RUSH", 0.7, -4, "#7AE0FF"],
    ];
    const bob = this.reduced ? 0 : Math.sin(this.clock * 2.2) * 3;
    words.forEach(([word, wr, off, color], i) => {
      const w = sw * wr;
      const x = L.cx - w / 2 + off;
      const y = top + i * (slabH + 4) + (i === 0 ? bob : 0);
      ctx.save();
      ctx.translate(L.cx + off, y + slabH / 2);
      ctx.rotate(i === 0 ? -0.03 : i === 2 ? 0.015 : 0);
      ctx.translate(-(L.cx + off), -(y + slabH / 2));
      drawSticker(ctx, x, y, w, slabH, color, 10, 6);
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = font(fitSize(ctx, word, slabH * 0.72, w - 28, true), true);
      ctx.fillText(word, L.cx + off, y + slabH / 2 + 2);
      ctx.restore();
    });
    // 30秒勝負のバッジ
    ctx.save();
    const bx = L.cx + sw * 0.33;
    const by = top + slabH * 0.2;
    ctx.translate(bx, by);
    ctx.rotate(0.18);
    const br = Math.min(sw * 0.13, 58);
    drawBurst(ctx, 0, 0, br, "#FF6B4A", 14, this.reduced ? 0 : this.clock * 0.6);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(br * 0.34);
    ctx.fillText("30秒", 0, -br * 0.15);
    ctx.fillText("勝負！", 0, br * 0.22);
    ctx.restore();

    const below = top + 3 * (slabH + 4) + 30;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = font(fitSize(ctx, "止めて、重ねて、空まで積め。", 22, sw - 40));
    ctx.fillText("止めて、重ねて、空まで積め。", L.cx, below);
    ctx.font = font(15);
    ctx.fillText("重なった瞬間にタップ。ずれた分は切れて落ちる。", L.cx, below + 36);
    ctx.fillText("ピッタリで +1秒。", L.cx, below + 58);

    // 地面の中：スタートの案内
    const gy = this.sy(L, 0);
    const pulse = this.reduced ? 1 : 1 + Math.sin(this.clock * 5) * 0.04;
    ctx.save();
    ctx.translate(L.cx, gy + (L.h - gy) * 0.4);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = CREAM;
    ctx.textBaseline = "middle";
    ctx.font = font(26);
    ctx.fillText("タップでスタート", 0, 0);
    ctx.restore();
    ctx.fillStyle = CREAM;
    ctx.font = font(14);
    ctx.textBaseline = "middle";
    ctx.fillText(this.best > 0 ? `ベスト ${this.best}階 ・ スペースキーでも遊べます` : "スペースキーでも遊べます", L.cx, gy + (L.h - gy) * 0.74);
  }

  private drawResult(L: Layout, ink: string): void {
    const ctx = this.ctx;
    const st = this.stats;
    if (!st) return;
    const sw = L.sw;
    const t = this.overT;
    const ease = (d: number): number => {
      if (this.reduced) return 1;
      const x = Math.min(1, Math.max(0, (t - d) / 0.35));
      return 1 - (1 - x) ** 3;
    };
    ctx.textAlign = "center";

    // 終わった理由
    ctx.save();
    ctx.translate(L.cx, L.h * 0.065);
    ctx.rotate(-0.05);
    const label = st.reason === "timeup" ? "タイムアップ！" : "落っこちた！";
    ctx.font = font(16);
    const lw = ctx.measureText(label).width + 32;
    drawSticker(ctx, -lw / 2, -17, lw, 34, INK, 17, 0);
    ctx.fillStyle = CREAM;
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1);
    ctx.restore();

    // スコア
    const text = String(st.floors);
    const cell = Math.min(sw * 0.075, L.h * 0.032, (sw * 0.62) / (text.length * 3.7));
    const sy = L.h * 0.11;
    const e1 = ease(0.05);
    ctx.save();
    ctx.globalAlpha = e1;
    drawBlockText(ctx, text, L.cx, sy + (1 - e1) * 30, cell, CREAM, INK);
    ctx.restore();
    ctx.fillStyle = ink;
    ctx.textBaseline = "top";
    ctx.font = font(20);
    ctx.fillText(`階 ・ 高さ ${heightMeters(st.floors)}m`, L.cx, sy + cell * 5 + 16);
    if (this.newBest) {
      ctx.save();
      ctx.translate(Math.min(L.sx + sw - 50, L.cx + blockTextWidth(text, cell) / 2 + 34), sy + cell * 3.6);
      ctx.rotate(0.2);
      const r = 40 * ease(0.4);
      if (r > 1) {
        drawBurst(ctx, 0, 0, r, "#FFC83D", 12);
        ctx.fillStyle = INK;
        ctx.font = font(r * 0.3);
        ctx.textBaseline = "middle";
        ctx.fillText("ベスト", 0, -r * 0.14);
        ctx.fillText("更新！", 0, r * 0.2);
      }
      ctx.restore();
    }

    // 積んだ塔（その回の形）
    const boxTop = sy + cell * 5 + 52;
    const boxBottom = L.h * 0.66;
    const n = this.tower.length;
    const ts = Math.min((boxBottom - boxTop) / (n * H), (sw * 0.6) / BASE_WIDTH, L.s * 0.9);
    const groundY = boxBottom;
    ctx.fillStyle = INK;
    roundRect(ctx, L.cx - sw * 0.36, groundY, sw * 0.72, 6, 3);
    ctx.fill();
    const grow = ease(0.15);
    const shown = Math.ceil(n * grow);
    for (let i = 0; i < shown; i++) {
      const p = this.tower[i];
      drawSlab(ctx, L.cx + p.x * ts, groundY - i * H * ts, p.w * ts, H * ts, p.color, ts);
    }

    // 称号のシール
    const title = titleFor(st);
    const e2 = ease(0.35);
    const cardW = Math.min(sw - 36, 420);
    const cardH = 92;
    const cardY = L.h * 0.665;
    ctx.save();
    ctx.translate(L.cx, cardY + cardH / 2);
    ctx.rotate(-0.025);
    const sc = this.reduced ? 1 : 0.85 + 0.15 * e2;
    ctx.scale(sc, sc);
    ctx.globalAlpha = e2;
    drawSticker(ctx, -cardW / 2, -cardH / 2, cardW, cardH, CREAM, 16, 6);
    ctx.fillStyle = "#FF6B4A";
    ctx.font = font(14);
    const tagW = ctx.measureText("称号").width + 20;
    drawSticker(ctx, -cardW / 2 + 16, -cardH / 2 - 12, tagW, 26, "#FF6B4A", 13, 0);
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText("称号", -cardW / 2 + 16 + tagW / 2, -cardH / 2 + 1.5);
    ctx.font = font(fitSize(ctx, title, 30, cardW - 36));
    ctx.fillText(title, 0, -6);
    ctx.font = font(15);
    ctx.fillText(commentFor(st), 0, 26);
    ctx.restore();

    // 記録
    ctx.globalAlpha = ease(0.5);
    ctx.fillStyle = ink;
    ctx.font = font(14);
    ctx.textBaseline = "top";
    ctx.fillText(`ピタッ ${st.perfects}回 ・ 最大 ${st.maxCombo}連続 ・ ベスト ${this.best}階`, L.cx, cardY + cardH + 18);
    ctx.globalAlpha = 1;

    // 名前（スクショに残る）
    ctx.font = font(14, true);
    ctx.textBaseline = "bottom";
    ctx.fillStyle = ink;
    ctx.fillText(`TAP STACK RUSH ・ ${location.host || "tap-stack-rush"}`, L.cx, L.h - 12);
  }
}
