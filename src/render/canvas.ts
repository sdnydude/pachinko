import { BALL_R, BOARD_H, BOARD_W, type Catcher } from '../core/board';
import type { Machine } from '../core/machine';
import type { Snapshot } from '../core/game';
import type { Theme } from './theme';
import { loadCel } from './cel';

export interface EffectsLike { draw(ctx: CanvasRenderingContext2D, t: number): void }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cel: HTMLCanvasElement | null = null;
  private dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  private scale = 1; private ox = 0; private oy = 0;
  readonly ready: Promise<void>;

  constructor(private canvas: HTMLCanvasElement, private machine: Machine, private theme: Theme) {
    this.ctx = canvas.getContext('2d')!;
    this.ready = loadCel(theme.celUrl, BOARD_W, BOARD_H, this.dpr).then(c => { this.cel = c; });
  }

  resize(cssW: number, cssH: number): void {
    this.canvas.width = Math.round(cssW * this.dpr); this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`; this.canvas.style.height = `${cssH}px`;
    this.scale = Math.min(cssW / BOARD_W, cssH / BOARD_H);
    this.ox = (cssW - BOARD_W * this.scale) / 2; this.oy = (cssH - BOARD_H * this.scale) / 2;
  }

  toBoard(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left - this.ox) / this.scale, y: (clientY - r.top - this.oy) / this.scale };
  }

  draw(s: Snapshot, effects?: EffectsLike): void {
    const { ctx, theme: T, machine: M } = this; const P = T.palette; const L = M.layout;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = P.wall; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, BOARD_W, BOARD_H); ctx.clip();

    if (this.cel) ctx.drawImage(this.cel, 0, 0, BOARD_W, BOARD_H);
    else { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, BOARD_W, BOARD_H); }

    // pins
    for (let i = 0; i < L.pins.length; i++) {
      const p = L.pins[i]!;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 0.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = i % T.jewelEvery === 2 ? P.jewel : P.pin; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 1.1, 0, Math.PI * 2); ctx.fillStyle = P.pinHi; ctx.fill();
    }
    // windmills
    L.windmills.forEach((w, i) => {
      const spin = s.windmillSpin[i] ?? 0;                      // rad/s from the game; 1/60 ≈ one frame
      this.windmillAngle[i] = (this.windmillAngle[i] ?? 0) + spin / 60;
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(this.windmillAngle[i]!);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = P.windmill[k % P.windmill.length]!; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w.r + 3, -3); ctx.lineTo(w.r + 3, 3); ctx.closePath(); ctx.fill(); ctx.rotate(Math.PI / 2); }
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = P.pinHi; ctx.fill(); ctx.restore();
    });
    // catchers
    for (const c of L.catchers) this.drawCatcher(c, s.tulipOpen[c.id] ?? false);
    // attacker
    const a = L.attacker;
    ctx.fillStyle = s.attackerOpen ? P.attackerOpen : P.attacker;
    ctx.fillRect(a.x - a.halfWidth, a.y - 4, a.halfWidth * 2, s.attackerOpen ? 14 : 8);
    if (s.attackerOpen) { ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.strokeRect(a.x - a.halfWidth, a.y - 4, a.halfWidth * 2, 14); }
    // reels
    const R = L.reelRect; const cw = R.w / 3;
    ctx.fillStyle = P.reelBg; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.font = `bold ${Math.floor(R.h * 0.8)}px ${T.fonts.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const d = s.reelDigits[i]!; const spinning = s.reelSpinning[i]!;
      ctx.fillStyle = spinning ? 'rgba(0,0,0,.45)' : (d === 7 ? P.reelHit : P.reelFg);
      ctx.fillText(String(d), R.x + cw * (i + 0.5), R.y + R.h / 2 + (spinning ? Math.sin(s.time * 40 + i) * 2 : 0));
    }
    // balls (interpolate half a step back for smoothness)
    for (const b of s.balls) {
      const x = (b.x + b.px) / 2, y = (b.y + b.py) / 2;
      ctx.beginPath(); ctx.arc(x + 1, y + 1.5, BALL_R, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, BALL_R); g.addColorStop(0, P.ballHi); g.addColorStop(1, P.ball);
      ctx.beginPath(); ctx.arc(x, y, BALL_R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    }
    effects?.draw(ctx, s.time);
    ctx.restore();
  }
  private windmillAngle: number[] = [];

  private drawCatcher(c: Catcher, open: boolean): void {
    const { ctx } = this; const P = this.theme.palette;
    if (c.tulip) {
      const hw = open ? c.tulip.openHalfWidth : c.tulip.closedHalfWidth;
      ctx.fillStyle = c.kind === 'start' ? P.pocketStart : P.tulipBody; ctx.fillRect(c.x - 8, c.y, 16, 14);
      ctx.strokeStyle = P.tulipWing; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(c.x + side * 7, c.y); ctx.quadraticCurveTo(c.x + side * (hw + 4), c.y - 10, c.x + side * hw, c.y - 20); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = `bold 9px ${this.theme.fonts.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.kind === 'start' ? 'S' : String(c.payout), c.x, c.y + 7);
      return;
    }
    const color = c.kind === 'win' ? P.pocketWin : c.kind === 'start' ? P.pocketStart : P.pocketOut;
    ctx.fillStyle = color; ctx.fillRect(c.x - c.halfWidth, c.y - 2, c.halfWidth * 2, 16);
    ctx.fillStyle = c.kind === 'out' ? P.panelFg : '#fff'; ctx.font = `bold 10px ${this.theme.fonts.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.kind === 'out' ? 'OUT' : c.kind === 'start' ? this.theme.copy.start : `+${c.payout}`, c.x, c.y + 6);
  }
}
