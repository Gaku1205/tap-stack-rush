// 音（Web Audio API で、その場で作る）。最初のタップ・キーで unlock() を呼んでから鳴る
const PENTA = [0, 2, 4, 7, 9];

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private thud(vol: number, freq: number, dur = 0.12): void {
    const c = this.ctx;
    if (!c || !this.master || !this.noise) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private note(step: number): number {
    const oct = Math.floor(step / PENTA.length);
    const semi = PENTA[step % PENTA.length] + oct * 12;
    return 392 * 2 ** (semi / 12);
  }

  /** 普通に置いた（ずれて切れた） */
  cut(size: number): void {
    this.thud(0.5, 1800);
    this.tone(150, 0.12, "sine", 0.45, 0, 70);
    if (size > 0.3) this.thud(0.3, 600, 0.25);
  }

  /** ピッタリ。combo が増えるほど音が上がる */
  perfect(combo: number): void {
    const step = Math.min(combo - 1, 14);
    const f = this.note(step);
    this.thud(0.25, 3000, 0.06);
    this.tone(f, 0.22, "triangle", 0.35);
    this.tone(f * 2, 0.16, "sine", 0.12, 0.03);
    if (combo >= 3) this.tone(f * 1.5, 0.3, "sine", 0.1, 0.06);
  }

  miss(): void {
    this.tone(330, 0.5, "sawtooth", 0.18, 0, 80);
    this.thud(0.5, 900, 0.4);
  }

  tick(urgent: boolean): void {
    this.tone(urgent ? 1320 : 990, 0.05, "square", 0.08);
  }

  start(): void {
    this.tone(523, 0.1, "triangle", 0.3);
    this.tone(784, 0.18, "triangle", 0.3, 0.08);
  }

  end(): void {
    [784, 659, 523, 784 * 1.5].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.28, i * 0.09));
  }

  ui(): void {
    this.tone(880, 0.06, "sine", 0.15);
  }
}
