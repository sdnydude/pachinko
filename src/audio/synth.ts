import type { GameEvent } from '../core/game';
import type { SoundSet } from './sets';

const MAX_PER_SECOND = 12;
const TICK_MS = 100, TICK_TOTAL_MS = 1000;
export class Synth {
  muted = false;
  private ctx: AudioContext | null = null;
  private stamps: number[] = [];
  private loop: { timer: number; i: number } | null = null;
  private ticks = 0;   // interval id for the third-reel tension ticks
  constructor(private set: SoundSet) {}
  setSet(set: SoundSet) { this.set = set; this.stopLoop(); this.stopTicks(); }
  setMuted(m: boolean) { this.muted = m; if (m) this.stopLoop(); }
  /** Call from a user gesture once so the AudioContext can start. */
  resume() { if (!this.ctx) this.ctx = new AudioContext(); if (this.ctx.state === 'suspended') void this.ctx.resume(); }
  dispose(): void { this.stopLoop(); this.stopTicks(); if (this.ctx) { void this.ctx.close(); this.ctx = null; } }

  /** Third reel "ticks" through the tension second: a soft tick every TICK_MS for TICK_TOTAL_MS. */
  private startTicks() {
    this.stopTicks();
    let n = 0;
    this.ticks = window.setInterval(() => {
      if (++n > TICK_TOTAL_MS / TICK_MS) { this.stopTicks(); return; }
      const T = this.set.tick; if (this.allow()) this.beep(T.freq, T.type, T.ms, 0.03);
    }, TICK_MS);
  }
  private stopTicks() { if (this.ticks) { clearInterval(this.ticks); this.ticks = 0; } }

  private allow(): boolean {
    if (this.muted || !this.ctx) return false;
    const now = performance.now(); this.stamps = this.stamps.filter(t => now - t < 1000);
    if (this.stamps.length >= MAX_PER_SECOND) return false;
    this.stamps.push(now); return true;
  }
  private beep(freq: number, type: OscillatorType, ms: number, gain = 0.08, at = 0) {
    if (!this.ctx) return; const c = this.ctx; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0;
    g.gain.setValueAtTime(0, c.currentTime + at); g.gain.linearRampToValueAtTime(gain, c.currentTime + at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + ms / 1000);
    o.connect(g).connect(c.destination); o.start(c.currentTime + at); o.stop(c.currentTime + at + ms / 1000 + 0.02);
  }
  private arp(notes: number[], stepMs = 90, type: OscillatorType = 'triangle') { notes.forEach((n, i) => this.beep(n, type, stepMs * 1.2, 0.1, (i * stepMs) / 1000)); }
  private startLoop() {
    if (this.loop || this.muted || !this.ctx) return;
    const { notes, bpm } = this.set.jackpotLoop; const ms = 60000 / bpm;
    const tick = () => { if (!this.loop) return; this.beep(notes[this.loop.i % notes.length]!, 'triangle', ms * 0.8, 0.07); this.loop.i++; };
    this.loop = { timer: window.setInterval(tick, ms), i: 0 }; tick();
  }
  private stopLoop() { if (this.loop) { clearInterval(this.loop.timer); this.loop = null; } }

  onEvents(ev: GameEvent[]): void {
    const S = this.set;
    for (const e of ev) {
      switch (e.type) {
        case 'pin': if (this.allow()) this.beep(S.click.freq * (0.8 + Math.min(1, e.speed / 500) * 0.4), S.click.type, S.click.ms, 0.05); break;
        case 'windmill': if (this.allow()) this.beep(S.whir.freq, S.whir.type, S.whir.ms, 0.04); break;
        case 'tulip': if (this.allow()) this.beep(S.clack.freq, S.clack.type, S.clack.ms, 0.06); break;
        case 'catch': if (e.payout > 0 && this.allow()) this.arp(S.chime, 70); break;
        case 'reachStart': if (this.allow()) this.arp(S.reachChime, 110); break;
        case 'reelStop':
          if (this.allow()) this.beep(S.tick.freq, S.tick.type, S.tick.ms, 0.06);
          if (e.reel === 1 && e.tension) this.startTicks(); else if (e.reel === 2) this.stopTicks();
          break;
        case 'jackpotOpen': this.stopTicks(); if (this.allow()) { this.arp([...S.reachChime, S.reachChime[S.reachChime.length - 1]! * 2], 80); this.startLoop(); } break;
        case 'attackerCatch': if (this.allow()) this.arp(S.chime, 50, 'square'); break;
        case 'jackpotClose': this.stopLoop(); if (this.allow()) this.arp(S.close, 120); break;
      }
    }
  }
}
