import { describe, it, expect } from 'vitest';
import { Game, DT_STEPS, MAX_BALLS, START_BANK } from '../src/core/game';
import { MACHINES } from '../src/core/machine';
import { DT } from '../src/core/physics';

const steps = (g: Game, seconds: number) => { const ev = []; for (let i = 0; i < Math.round(seconds / DT); i++) ev.push(...g.step()); return ev; };
const launches = (ev: { type: string }[]) => ev.filter(e => e.type === 'launch').length;

describe('dial and launch', () => {
  it('starts playing with 100 balls and no balls in flight', () => {
    const g = new Game(MACHINES.raijin, 1);
    const s = g.snapshot();
    expect(s.phase).toBe('playing'); expect(s.bank).toBe(START_BANK); expect(s.balls.length).toBe(0);
    expect(s.dial).toEqual({ held: false, strength: 0 });
  });
  it('ramps strength while held, fires once on release, charges one ball', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.setHeld(true);
    steps(g, 0.6);
    expect(g.snapshot().dial.strength).toBeCloseTo(0.5, 1);
    g.setHeld(false);
    const ev = g.step();
    expect(launches(ev)).toBe(1);
    expect(g.snapshot().bank).toBe(99);
    expect(g.snapshot().balls.length).toBe(1);
  });
  it('auto-fires every 0.6 s once the ramp completes, and release does not double fire', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.setHeld(true);
    const ev = steps(g, 2.45);
    expect(launches(ev)).toBe(3); // at ~1.2, ~1.8, ~2.4
    g.setHeld(false);
    expect(launches(g.step())).toBe(0);
  });
  it('trim adds to the ramping strength; auto-fire still waits for the ramp time', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.setHeld(true); g.trim(0.3);
    expect(g.snapshot().dial.strength).toBeCloseTo(0.3);
    let ev = steps(g, 0.6);
    expect(launches(ev)).toBe(0);
    expect(g.snapshot().dial.strength).toBeCloseTo(0.8, 5); // 0.3 trim + 0.5 ramp
    ev = steps(g, 0.59);                                     // t ≈ 1.19 s: still before the ramp time
    expect(launches(ev)).toBe(0);
    ev = steps(g, 0.02);                                     // t ≈ 1.21 s: first auto-fire, ramp clamped at 1
    expect(launches(ev)).toBe(1);
    expect(g.snapshot().dial.strength).toBe(1);
  });
  it('trim after the ramp sets the strength and it stays; auto-fire uses it', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.setHeld(true); steps(g, 1.5);
    g.trim(-0.5);
    expect(g.snapshot().dial.strength).toBeCloseTo(0.5);
    const ev = steps(g, 0.5);
    expect(g.snapshot().dial.strength).toBeCloseTo(0.5);
    const l = ev.find(e => e.type === 'launch');
    expect(l && l.type === 'launch' ? l.strength : -1).toBeCloseTo(0.5);
  });
  it('release at the ball cap waits and fires exactly once when a slot frees', () => {
    const g = new Game(MACHINES.raijin, 1);
    for (let i = 0; i < MAX_BALLS; i++) g.fireAt(0.8, true);
    g.setHeld(true); steps(g, 0.3); g.setHeld(false);
    expect(launches(steps(g, 0.05))).toBe(0);
    expect(g.snapshot().balls.length).toBe(MAX_BALLS); expect(g.snapshot().bank).toBe(START_BANK);
    let n = 0;
    for (let i = 0; i < 30 * 120 && n === 0; i++) n += launches(g.step());
    expect(n).toBe(1);
    expect(g.snapshot().bank).toBe(START_BANK - 1);
    expect(launches(steps(g, 2))).toBe(0); // the pending shot fires once, not per freed slot
  });
  it('trim clamps to [0.05, 1]', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.setHeld(true); g.trim(5); expect(g.snapshot().dial.strength).toBe(1);
    g.trim(-5); expect(g.snapshot().dial.strength).toBe(0.05);
  });
  it('never exceeds MAX_BALLS in flight', () => {
    const g = new Game(MACHINES.raijin, 1);
    for (let i = 0; i < 30; i++) g.fireAt(0.8, true);
    expect(g.snapshot().balls.length).toBe(MAX_BALLS);
    expect(g.snapshot().bank).toBe(START_BANK); // free shots
  });
  it('launch velocity is jittered by the seeded rng and deterministic per seed', () => {
    const a = new Game(MACHINES.raijin, 9), b = new Game(MACHINES.raijin, 9);
    a.fireAt(0.7); a.fireAt(0.7); b.fireAt(0.7); b.fireAt(0.7);
    const [a0, a1] = a.snapshot().balls; const [b0] = b.snapshot().balls;
    expect(a0!.vx).not.toBe(a1!.vx);
    expect(a0!.vx).toBe(b0!.vx);
  });
  it('with an empty bank, fire does nothing; bankEmpty fires once when no balls remain', () => {
    const g = new Game(MACHINES.raijin, 1, { bank: 0, bestSession: 0, biggestJackpot: 0 });
    expect(g.fireAt(0.5)).toBe(false);
    const ev = steps(g, 0.1);
    expect(ev.filter(e => e.type === 'bankEmpty').length).toBe(1);
    expect(g.snapshot().phase).toBe('idle'); expect(g.snapshot().needsBuyIn).toBe(true);
    g.buyIn();
    expect(g.snapshot().bank).toBe(100); expect(g.snapshot().phase).toBe('playing'); expect(g.snapshot().buyIns).toBe(1);
  });
  it('tick accumulates fixed steps and clamps long frames', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.fireAt(0.5);
    g.tick(5); // clamped to 0.1 s = 12 steps
    expect(g.snapshot().time).toBeCloseTo(12 * DT, 6);
    expect(DT_STEPS(0.1)).toBe(12);
  });
  it('balls fall, hit pins, and eventually exit the board', () => {
    const g = new Game(MACHINES.raijin, 3);
    g.fireAt(0.6);
    const ev = steps(g, 10);
    expect(ev.some(e => e.type === 'pin')).toBe(true);
    expect(g.snapshot().balls.length).toBe(0);
  });
});
