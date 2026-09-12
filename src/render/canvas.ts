import { BALL_R, BOARD_H, BOARD_W, type Catcher } from '../core/board';
import type { Machine } from '../core/machine';
import type { Snapshot } from '../core/game';
import { RENDER_METRICS as RM, type Theme } from './theme';
import { loadCel } from './cel';

export interface EffectsLike { draw(ctx: CanvasRenderingContext2D, t: number): void }

const TULIP_MS = 150;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private cel: HTMLCanvasElement | null = null;
  private dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  private scale = 1; private ox = 0; private oy = 0;
  readonly ready: Promise<void>;
  private lastTime = -1;

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

  draw(s: Snapshot, effects?: EffectsLike): void {
    const { ctx, theme: T, machine: M } = this; const P = T.palette; const L = M.layout;
    const dt = this.lastTime < 0 ? 0 : Math.max(0, s.time - this.lastTime); this.lastTime = s.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = P.wall; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, BOARD_W, BOARD_H); ctx.clip();

    if (this.cel) ctx.drawImage(this.cel, 0, 0, BOARD_W, BOARD_H);
    else { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, BOARD_W, BOARD_H); }

    // solids (bezel outlines, warp walls and funnel): faint lines over the cel so a bounce off them reads as a surface
    ctx.lineCap = 'round';
    for (const g of L.solids.segments) {
      ctx.globalAlpha = 0.45; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.ax + 1, g.ay + 1); ctx.lineTo(g.bx + 1, g.by + 1); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = P.panelAccent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.bx, g.by); ctx.stroke();
    }
    ctx.globalAlpha = 0.35; ctx.strokeStyle = P.panelAccent; ctx.lineWidth = 1.5;
    for (const c of L.solids.circles) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // pins
    for (let i = 0; i < L.pins.length; i++) {
      const p = L.pins[i]!;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 0.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = i % T.jewelEvery === 0 ? P.jewel : P.pin; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 1.1, 0, Math.PI * 2); ctx.fillStyle = P.pinHi; ctx.fill();
    }
    // windmills
    L.windmills.forEach((w, i) => {
      const spin = s.windmillSpin[i] ?? 0;                      // rad/s from the game; integrated by elapsed sim time
      this.windmillAngle[i] = (this.windmillAngle[i] ?? 0) + spin * dt;
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(this.windmillAngle[i]!);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = P.windmill[k % P.windmill.length]!; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w.r + 3, -3); ctx.lineTo(w.r + 3, 3); ctx.closePath(); ctx.fill(); ctx.rotate(Math.PI / 2); }
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fillStyle = P.pinHi; ctx.fill(); ctx.restore();
    });
    // catchers
    for (const c of L.catchers) this.drawCatcher(c, this.tulipSpread(c.id, s.tulipOpen[c.id] ?? false, dt));
    // attacker
    const a = L.attacker;
    ctx.fillStyle = s.attackerOpen ? P.attackerOpen : P.attacker;
    ctx.fillRect(a.x - a.halfWidth, a.y - RM.attacker.lip, a.halfWidth * 2, s.attackerOpen ? RM.attacker.openH : RM.attacker.closedH);
    if (s.attackerOpen) { ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.strokeRect(a.x - a.halfWidth, a.y - RM.attacker.lip, a.halfWidth * 2, RM.attacker.openH); }
    // reels
    const R = L.reelRect; const cw = R.w / 3;
    ctx.fillStyle = P.reelBg; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.font = `bold ${Math.floor(R.h * RM.reelFontRatio)}px ${T.fonts.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
  private tulipAnim: Record<string, number> = {};   // 0 closed .. 1 open, eased toward the snapshot state

  /** Wings animate over TULIP_MS; the first frame snaps so a reload does not replay the open. */
  private tulipSpread(id: string, open: boolean, dt: number): number {
    const target = open ? 1 : 0; const cur = this.tulipAnim[id];
    if (cur === undefined) return (this.tulipAnim[id] = target);
    const step = dt * 1000 / TULIP_MS;
    return (this.tulipAnim[id] = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step));
  }

  private drawCatcher(c: Catcher, spread: number): void {
    const { ctx } = this; const P = this.theme.palette;
    if (c.tulip) {
      const hw = c.tulip.closedHalfWidth + (c.tulip.openHalfWidth - c.tulip.closedHalfWidth) * spread;
      const M = RM.tulip;
      ctx.fillStyle = c.kind === 'start' ? P.pocketStart : P.tulipBody; ctx.fillRect(c.x - M.pedestalW / 2, c.y, M.pedestalW, M.pedestalH);
      ctx.strokeStyle = P.tulipWing; ctx.lineWidth = M.wingWidth; ctx.lineCap = 'round';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(c.x + side * M.wingRoot, c.y); ctx.quadraticCurveTo(c.x + side * (hw + M.wingBulge), c.y - M.wingLift, c.x + side * hw, c.y - M.wingLen); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = `bold ${M.labelPx}px ${this.theme.fonts.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.kind === 'start' ? 'S' : String(c.payout), c.x, c.y + M.labelDy);
      return;
    }
    const color = c.kind === 'win' ? P.pocketWin : c.kind === 'start' ? P.pocketStart : P.pocketOut;
    const M = RM.pocket;
    ctx.fillStyle = color; ctx.fillRect(c.x - c.halfWidth, c.y - M.lip, c.halfWidth * 2, M.h);
    ctx.fillStyle = c.kind === 'out' ? P.panelFg : '#fff'; ctx.font = `bold ${M.labelPx}px ${this.theme.fonts.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.kind === 'out' ? 'OUT' : c.kind === 'start' ? this.theme.copy.start : `+${c.payout}`, c.x, c.y + M.labelDy);
  }
}
