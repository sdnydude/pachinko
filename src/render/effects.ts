import type { GameEvent, Snapshot } from '../core/game';
import type { Layout } from '../core/board';
import { BOARD_W, BOARD_H } from '../core/board';
import type { Theme } from './theme';

export const MAX_PARTICLES = 200;
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface FloatText { x: number; y: number; text: string; life: number; color: string; size: number }
interface PinFlash { index: number; life: number }

export class Effects {
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private flashes: PinFlash[] = [];
  private whiteFlash = 0;
  private dim = 0;                 // 0..1, board dim during tension
  private slam: { text: string; t: number } | null = null;   // jackpot copy slam-in
  private jackpotTotal: { total: number; t: number } | null = null;
  lampSpeed: 'slow' | 'fast' | 'rainbow' = 'slow';
  lampPhase = 0;
  private reduced: boolean;
  constructor(private theme: Theme, private layout: Layout, opts?: { reducedMotion?: boolean }) { this.reduced = !!opts?.reducedMotion; }
  get particleCount() { return this.particles.length; }
  get flashCount() { return this.flashes.length; }

  onEvents(ev: GameEvent[], s: Snapshot): void {
    const P = this.theme.palette;
    for (const e of ev) {
      switch (e.type) {
        case 'pin': if (!this.reduced) this.flashes.push({ index: e.index, life: 0.08 }); this.spark(e.x, e.y, 3, P.accent, Math.min(1, e.speed / 400)); break;
        case 'windmill': this.spark(e.x, e.y, 4, P.accent2, 0.6); break;
        case 'catch': if (e.payout > 0) { this.floats.push({ x: e.x, y: e.y - 10, text: `+${e.payout}`, life: 0.9, color: P.accent, size: 16 }); this.spark(e.x, e.y, 8, P.accent, 1); } break;
        case 'reachStart': this.lampSpeed = 'fast'; break;
        case 'reelStop': if (e.reel === 1 && e.tension) this.dim = 0.3; break;
        case 'reachMiss': this.dim = 0; this.lampSpeed = s.phase === 'jackpot' ? 'rainbow' : 'slow'; break;
        case 'jackpotOpen': this.dim = 0; this.lampSpeed = 'rainbow'; this.whiteFlash = 0.4; this.slam = { text: this.theme.copy.jackpot, t: 0 }; break;
        case 'attackerCatch': this.floats.push({ x: e.x, y: e.y - 12, text: `+${e.payout}`, life: 1.0, color: P.accent, size: 20 }); this.spark(e.x, e.y, 12, P.accent, 1); break;
        case 'jackpotClose': this.lampSpeed = 'slow'; this.jackpotTotal = { total: e.total, t: 0 }; break;
      }
    }
  }

  private spark(x: number, y: number, n: number, color: string, power: number): void {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160 * power;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.35, max: 0.35, color, size: 1.5 + Math.random() * 1.5 });
    }
  }

  update(dt: number): void {
    const speed = this.lampSpeed === 'slow' ? 1 : this.lampSpeed === 'fast' ? 4 : 10;
    if (!this.reduced) this.lampPhase = (this.lampPhase + dt * speed) % 1000;
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floats) { f.life -= dt; f.y -= 30 * dt; }
    this.floats = this.floats.filter(f => f.life > 0);
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter(f => f.life > 0);
    if (this.whiteFlash > 0) this.whiteFlash -= dt;
    if (this.slam) { this.slam.t += dt; if (this.slam.t > 1.2) this.slam = null; }
    if (this.jackpotTotal) { this.jackpotTotal.t += dt; if (this.jackpotTotal.t > 2) this.jackpotTotal = null; }
  }

  draw(ctx: CanvasRenderingContext2D, _t: number): void {
    const P = this.theme.palette;
    if (this.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${this.dim})`; ctx.fillRect(0, 0, BOARD_W, BOARD_H); }
    for (const f of this.flashes) { const p = this.layout.pins[f.index]; if (!p) continue; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2); ctx.fillStyle = P.jewel; ctx.globalAlpha = f.life / 0.08; ctx.fill(); ctx.globalAlpha = 1; }
    for (const p of this.particles) { ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of this.floats) { ctx.globalAlpha = Math.min(1, f.life); ctx.fillStyle = f.color; ctx.font = `bold ${f.size}px ${this.theme.fonts.display}`; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1;
    if (this.slam) {
      const k = Math.min(1, this.slam.t / 0.4); const a = this.layout.attacker;
      const x = BOARD_W / 2 + (a.x - BOARD_W / 2) * k, y = BOARD_H * 0.45 + (a.y - 30 - BOARD_H * 0.45) * k;
      const size = 64 - 40 * k;
      ctx.font = `bold ${size}px ${this.theme.fonts.display}`; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(this.slam.text, x, y); ctx.fillStyle = P.accent; ctx.fillText(this.slam.text, x, y);
    }
    if (this.jackpotTotal) { ctx.font = `bold 28px ${this.theme.fonts.display}`; ctx.lineWidth = 5; ctx.strokeStyle = '#000'; const txt = `+${this.jackpotTotal.total}`; ctx.strokeText(txt, BOARD_W / 2, BOARD_H * 0.5); ctx.fillStyle = P.accent; ctx.fillText(txt, BOARD_W / 2, BOARD_H * 0.5); }
    if (this.whiteFlash > 0) {
      if (this.reduced) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, BOARD_W - 8, BOARD_H - 8); }
      else { ctx.fillStyle = `rgba(255,255,255,${this.whiteFlash / 0.4 * 0.9})`; ctx.fillRect(0, 0, BOARD_W, BOARD_H); }
    }
  }
}
