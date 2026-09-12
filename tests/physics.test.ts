import { describe, it, expect } from 'vitest';
import { stepBall, resolveCircle, resolveSegment, catcherHit, exited, DT, GRAVITY, type Ball, type ContactEvent } from '../src/core/physics';
import { BALL_R, BOARD_H, BOARD_W, FIELD_LEFT, roofRect, type Layout, type Catcher, type Segment } from '../src/core/board';

const emptyLayout = (): Layout => ({
  pins: [], windmills: [], catchers: [],
  attacker: { id: 'atk', kind: 'attacker', x: 320, y: 610, halfWidth: 70, payout: 15 },
  reelRect: { x: 0, y: 0, w: 0, h: 0 }, launch: { x: 70, y: 50 }, solids: { circles: [], segments: [] },
});
const ball = (p: Partial<Ball> = {}): Ball => ({ id: 1, x: 300, y: 300, vx: 0, vy: 0, age: 0, px: 300, py: 300, ...p });

describe('stepBall', () => {
  it('falls under gravity', () => {
    const b = ball(); const ev: ContactEvent[] = [];
    stepBall(b, emptyLayout(), DT, ev);
    expect(b.vy).toBeCloseTo(GRAVITY * DT, 5);
    expect(b.y).toBeGreaterThan(300);
    expect(b.py).toBe(300);
  });
  it('bounces off the left wall and emits a wall event', () => {
    const b = ball({ x: FIELD_LEFT + BALL_R - 1, vx: -200 }); const ev: ContactEvent[] = [];
    stepBall(b, emptyLayout(), DT, ev);
    expect(b.x).toBeGreaterThanOrEqual(FIELD_LEFT + BALL_R);
    expect(b.vx).toBeGreaterThan(0);
    expect(ev.some(e => e.type === 'wall')).toBe(true);
  });
  it('bounces off the right wall and the top', () => {
    const b = ball({ x: BOARD_W - BALL_R + 1, y: BALL_R - 1, vx: 300, vy: -300 }); const ev: ContactEvent[] = [];
    stepBall(b, emptyLayout(), DT, ev);
    expect(b.x).toBeLessThanOrEqual(BOARD_W - BALL_R);
    expect(b.y).toBeGreaterThanOrEqual(BALL_R);
    expect(b.vx).toBeLessThan(0); expect(b.vy).toBeGreaterThan(0);
  });
  it('bounces off a pin and reports the pin index', () => {
    const L = emptyLayout(); L.pins = [{ x: 300, y: 320, r: 3.5 }];
    const b = ball({ y: 312, vy: 200 }); const ev: ContactEvent[] = [];
    stepBall(b, L, DT, ev);
    const e = ev.find(e => e.type === 'pin');
    expect(e && e.type === 'pin' ? e.index : -1).toBe(0);
    expect(b.vy).toBeLessThan(0);
  });
  it('deflects tangentially off a windmill', () => {
    const L = emptyLayout(); L.windmills = [{ x: 300, y: 330, r: 10 }];
    const b = ball({ y: 316, vy: 200 }); const ev: ContactEvent[] = [];
    stepBall(b, L, DT, ev);
    expect(ev.some(e => e.type === 'windmill')).toBe(true);
    expect(Math.abs(b.vx)).toBeGreaterThan(0); // got a sideways kick
  });
  it('applies drag', () => {
    const b = ball({ vx: 100 }); stepBall(b, emptyLayout(), DT, []);
    expect(b.vx).toBeLessThan(100); expect(b.vx).toBeGreaterThan(99);
  });
});

describe('resolveCircle', () => {
  it('pushes the ball out and reflects velocity with restitution', () => {
    const b = ball({ x: 300, y: 310, vx: 0, vy: 100 });
    const s = resolveCircle(b, 300, 316, 3.5, 0.5);
    expect(s).toBeCloseTo(100);
    expect(b.y).toBeCloseTo(316 - 3.5 - BALL_R, 3);
    expect(b.vy).toBeCloseTo(-50, 3);
  });
  it('returns 0 when not touching', () => {
    const b = ball(); expect(resolveCircle(b, 400, 400, 3.5, 0.5)).toBe(0);
  });
});

describe('resolveSegment', () => {
  const H: Segment = { ax: 200, ay: 400, bx: 400, by: 400 };
  it('pushes the ball out of a horizontal segment and reflects the normal velocity with restitution', () => {
    const b = ball({ x: 300, y: 398, px: 300, py: 390, vx: 50, vy: 100 });
    expect(resolveSegment(b, H, 0.35)).toBeCloseTo(100);
    expect(b.x).toBe(300); expect(b.y).toBeCloseTo(400 - BALL_R, 6);
    expect(b.vx).toBe(50); expect(b.vy).toBeCloseTo(-35, 6);
  });
  it('pushes toward the side the ball came from, so it cannot tunnel through', () => {
    const b = ball({ x: 300, y: 402, px: 300, py: 396, vx: 0, vy: 100 });
    expect(resolveSegment(b, H, 0.35)).toBeGreaterThan(0);
    expect(b.y).toBeCloseTo(400 - BALL_R, 6); expect(b.vy).toBeLessThan(0);
  });
  it('reflects off a slanted segment along its normal', () => {
    const S: Segment = { ax: 0, ay: 0, bx: 100, by: 100 };
    const b = ball({ x: 52, y: 50, px: 52, py: 40, vx: 0, vy: 100 }); // falling onto the 45° wall from above-right
    expect(resolveSegment(b, S, 0.5)).toBeCloseTo(100 / Math.SQRT2, 6);
    expect(b.x).toBeCloseTo(51 + BALL_R / Math.SQRT2, 6); expect(b.y).toBeCloseTo(51 - BALL_R / Math.SQRT2, 6);
    expect(b.vx).toBeCloseTo(75, 6); expect(b.vy).toBeCloseTo(25, 6);
  });
  it('no contact when far, beyond the end points, or already separating', () => {
    const far = ball({ x: 300, y: 380, vy: 100 }); expect(resolveSegment(far, H, 0.35)).toBe(0); expect(far.y).toBe(380);
    const past = ball({ x: 410, y: 400, vy: 100 }); expect(resolveSegment(past, H, 0.35)).toBe(0);
    const up = ball({ x: 300, y: 398, px: 300, py: 390, vy: -100 }); expect(resolveSegment(up, H, 0.35)).toBe(0);
  });
});

describe('stepBall solids', () => {
  it('bounces off a solid circle and emits a wall contact', () => {
    const L = emptyLayout(); L.solids.circles = [{ x: 300, y: 330, r: 20 }];
    const b = ball({ y: 306, vy: 200 }); const ev: ContactEvent[] = [];
    stepBall(b, L, DT, ev);
    expect(ev.some(e => e.type === 'wall')).toBe(true); expect(b.vy).toBeLessThan(0);
  });
  it('a ball landing dead-center on a roof peak is nudged sideways instead of resting', () => {
    const L = emptyLayout(); L.solids.segments = roofRect({ x: 200, y: 400, w: 200, h: 50 }, 12); // peak (300, 388)
    const b = ball({ x: 300, y: 384, vx: 0, vy: 100 }); const ev: ContactEvent[] = [];
    stepBall(b, L, DT, ev);
    expect(ev.some(e => e.type === 'wall')).toBe(true);
    expect(b.vx).not.toBe(0); expect(b.y).toBeLessThan(388 - BALL_R + 0.01);
  });
});

describe('catcherHit', () => {
  const c: Catcher = { id: 'w', kind: 'win', x: 160, y: 700, halfWidth: 20, payout: 5 };
  it('hits when crossing the mouth downward within halfWidth', () => {
    expect(catcherHit(ball({ x: 165, y: 702, py: 698, vy: 50 }), c, 20)).toBe(true);
  });
  it('misses outside halfWidth, or moving up, or not crossing', () => {
    expect(catcherHit(ball({ x: 190, y: 702, py: 698, vy: 50 }), c, 20)).toBe(false);
    expect(catcherHit(ball({ x: 165, y: 698, py: 702, vy: -50 }), c, 20)).toBe(false);
    expect(catcherHit(ball({ x: 165, y: 690, py: 686, vy: 50 }), c, 20)).toBe(false);
  });
});

describe('exited', () => {
  it('is true only below the floor', () => {
    expect(exited(ball({ y: BOARD_H + BALL_R + 1 }))).toBe(true);
    expect(exited(ball({ y: BOARD_H - 1 }))).toBe(false);
  });
});
