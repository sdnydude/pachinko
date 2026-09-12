import { BALL_R, BOARD_H, BOARD_W, FIELD_LEFT, type Catcher, type Layout } from './board';

export const DT = 1 / 120;
export const GRAVITY = 1400;
export const REST_PIN = 0.55;
export const REST_WALL = 0.35;
export const DRAG = 0.9995;
const WINDMILL_KICK = 140; // tangential speed added on windmill contact

export interface Ball { id: number; x: number; y: number; vx: number; vy: number; age: number; px: number; py: number }

export type ContactEvent =
  | { type: 'pin'; index: number; speed: number; x: number; y: number }
  | { type: 'windmill'; index: number; speed: number; x: number; y: number }
  | { type: 'wall'; speed: number; x: number; y: number };

/** Push ball out of a circle and reflect the normal velocity. Returns impact speed (0 if no contact). */
export function resolveCircle(b: Ball, cx: number, cy: number, cr: number, rest: number): number {
  let dx = b.x - cx; const dy = b.y - cy;
  if (Math.abs(dx) < 0.01) dx = 0.01 * (b.id % 2 === 0 ? 1 : -1); // never balance dead-center on a pin
  const minD = cr + BALL_R;
  const d2 = dx * dx + dy * dy;
  if (d2 >= minD * minD) return 0;
  const d = Math.sqrt(d2) || 1e-6;
  const nx = dx / d, ny = dy / d;
  b.x = cx + nx * minD; b.y = cy + ny * minD;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 0; // already separating
  b.vx -= (1 + rest) * vn * nx;
  b.vy -= (1 + rest) * vn * ny;
  return -vn;
}

export function stepBall(b: Ball, layout: Layout, dt: number, out: ContactEvent[]): void {
  b.px = b.x; b.py = b.y;
  b.vx *= DRAG; b.vy *= DRAG;
  b.vy += GRAVITY * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  b.age += dt;

  for (let i = 0; i < layout.pins.length; i++) {
    const p = layout.pins[i]!;
    if (Math.abs(p.x - b.x) > 12 || Math.abs(p.y - b.y) > 12) continue;
    const s = resolveCircle(b, p.x, p.y, p.r, REST_PIN);
    if (s > 0) out.push({ type: 'pin', index: i, speed: s, x: b.x, y: b.y });
  }
  for (let i = 0; i < layout.windmills.length; i++) {
    const w = layout.windmills[i]!;
    if (Math.abs(w.x - b.x) > w.r + 8 || Math.abs(w.y - b.y) > w.r + 8) continue;
    const s = resolveCircle(b, w.x, w.y, w.r, REST_PIN);
    if (s > 0) {
      const nx = (b.x - w.x), ny = (b.y - w.y), n = Math.hypot(nx, ny) || 1;
      // tangent, clockwise; side chosen by which half the ball hit so it flings outward
      const sign = b.x < w.x ? -1 : 1;
      b.vx += sign * (-ny / n) * WINDMILL_KICK;
      b.vy += sign * (nx / n) * WINDMILL_KICK;
      out.push({ type: 'windmill', index: i, speed: s, x: b.x, y: b.y });
    }
  }
  // walls: left field wall, right wall, top
  if (b.x < FIELD_LEFT + BALL_R) { const s = -b.vx; b.x = FIELD_LEFT + BALL_R; if (b.vx < 0) { b.vx = -b.vx * REST_WALL; out.push({ type: 'wall', speed: s, x: b.x, y: b.y }); } }
  if (b.x > BOARD_W - BALL_R) { const s = b.vx; b.x = BOARD_W - BALL_R; if (b.vx > 0) { b.vx = -b.vx * REST_WALL; out.push({ type: 'wall', speed: s, x: b.x, y: b.y }); } }
  if (b.y < BALL_R) { const s = -b.vy; b.y = BALL_R; if (b.vy < 0) { b.vy = -b.vy * REST_WALL; out.push({ type: 'wall', speed: s, x: b.x, y: b.y }); } }
}

/** True if the ball crossed y = c.y downward this step within the mouth. */
export function catcherHit(b: Ball, c: Catcher, halfWidth: number): boolean {
  if (b.vy <= 0) return false;
  if (!(b.py < c.y && b.y >= c.y)) return false;
  return Math.abs(b.x - c.x) <= halfWidth;
}

export function exited(b: Ball): boolean {
  return b.y > BOARD_H + BALL_R;
}
