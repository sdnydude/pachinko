import { describe, it, expect } from 'vitest';
import { Game, REEL_STOP, REEL_TENSION, MISS_HOLD, REACH_QUEUE_MAX, type GameEvent } from '../src/core/game';
import { MACHINES } from '../src/core/machine';
import { DT, type Ball } from '../src/core/physics';
import type { Rng } from '../src/core/rng';

/** rng that returns a scripted list of values for next(), then 0.5 forever. */
const scripted = (vals: number[]): Rng => {
  let i = 0; const next = () => (i < vals.length ? vals[i++]! : 0.5);
  return { next, int: (n) => Math.floor(next() * n), range: (a, b) => a + next() * (b - a) };
};
const steps = (g: Game, seconds: number) => { const ev: GameEvent[] = []; for (let i = 0; i < Math.round(seconds / DT); i++) ev.push(...g.step()); return ev; };
/** Drop a ball just above a catcher mouth, falling straight down. */
const dropInto = (g: Game, x: number, y: number) => {
  const b: Ball = { id: 999, x, y: y - 3, px: x, py: y - 3, vx: 0, vy: 400, age: 0 };
  (g as unknown as { balls: Ball[] }).balls.push(b);
};
const types = (ev: GameEvent[]) => ev.map(e => e.type);

describe('catchers and payouts', () => {
  it('win pocket pays 5 and emits catch', () => {
    const g = new Game(MACHINES.raijin, 1);
    dropInto(g, 160, 700);
    const ev = steps(g, 0.05);
    const c = ev.find(e => e.type === 'catch');
    expect(c && c.type === 'catch' ? c.payout : 0).toBe(5);
    expect(g.snapshot().bank).toBe(105); expect(g.snapshot().sessionWon).toBe(5); expect(g.snapshot().bestSession).toBe(5);
    expect(g.snapshot().balls.length).toBe(0);
  });
  it('out pocket pays 0', () => {
    const g = new Game(MACHINES.raijin, 1);
    dropInto(g, 70, 700); steps(g, 0.05);
    expect(g.snapshot().bank).toBe(100);
  });
});

describe('tulip mechanics', () => {
  it('closed tulip catches within its closed width, then opens and catches within its open width', () => {
    const g = new Game(MACHINES.raijin, 1);
    const t = MACHINES.raijin.layout.catchers.find(c => c.id === 'tulip-l')!.tulip!;
    expect(t.openHalfWidth).toBeGreaterThan(t.closedHalfWidth + 2);
    dropInto(g, 110 + t.closedHalfWidth - 1, 400);
    let ev = steps(g, 0.05);
    expect(types(ev)).toContain('tulip');
    expect(g.snapshot().tulipOpen['tulip-l']).toBe(true);
    dropInto(g, 110 + t.openHalfWidth - 1, 400);
    ev = steps(g, 0.05);
    expect(ev.filter(e => e.type === 'catch').length).toBe(1);
    expect(g.snapshot().tulipOpen['tulip-l']).toBe(false);
  });
});

describe('reach', () => {
  it('start pocket pays 3 and starts a reach; reels stop at 2.0/2.4/2.8 on a plain miss', () => {
    // rng: launch jitter not used; reach roll 0.9 (miss at 1/16), tension roll 0.9 (no tension), digits 0.1,0.5,0.3
    const g = new Game(MACHINES.raijin, 1, undefined, { rng: scripted([0.9, 0.9, 0.1, 0.5, 0.3]) });
    dropInto(g, 320, 700);
    let ev = steps(g, 0.05);
    expect(types(ev)).toContain('reachStart');
    expect(g.snapshot().bank).toBe(103); expect(g.snapshot().phase).toBe('reach');
    ev = steps(g, REEL_STOP[2] + 0.02);
    const stops = ev.filter(e => e.type === 'reelStop');
    expect(stops.length).toBe(3);
    expect(g.snapshot().phase).toBe('reach');
    ev = steps(g, MISS_HOLD);
    expect(types(ev)).toContain('reachMiss'); expect(g.snapshot().phase).toBe('playing');
  });
  it('tension miss: first two reels match, third stops 1 s late', () => {
    const g = new Game(MACHINES.raijin, 1, undefined, { rng: scripted([0.9, 0.1, 0.7, 0.2]) }); // miss, tension, d=7, e offset
    dropInto(g, 320, 700); steps(g, 0.05);
    const r = g.snapshot().reach!;
    expect(r.win).toBe(false); expect(r.tension).toBe(true);
    expect(r.digits[0]).toBe(r.digits[1]); expect(r.digits[2]).not.toBe(r.digits[0]);
    expect(r.stopAt).toEqual([2.0, 2.4, 2.8 + REEL_TENSION]);
  });
  it('win: all three digits match, jackpot opens after the last reel', () => {
    const g = new Game(MACHINES.raijin, 1, undefined, { rng: scripted([0.01, 0.7]) }); // win at 1/16, digit 7
    dropInto(g, 320, 700); steps(g, 0.05);
    const r = g.snapshot().reach!;
    expect(r.win).toBe(true); expect(r.digits).toEqual([7, 7, 7]); expect(r.stopAt[2]).toBe(2.8 + REEL_TENSION);
    const ev = steps(g, 2.8 + REEL_TENSION + 0.02);
    expect(types(ev)).toContain('jackpotOpen');
    expect(g.snapshot().phase).toBe('jackpot'); expect(g.snapshot().attackerOpen).toBe(true);
  });
  it('queues up to 4 reaches and runs them back to back', () => {
    const g = new Game(MACHINES.raijin, 1, undefined, { rng: scripted(Array(40).fill(0.9)) });
    for (let i = 0; i < 6; i++) dropInto(g, 320, 700);
    steps(g, 0.05);
    expect(g.snapshot().phase).toBe('reach');
    expect(g.snapshot().reachQueue).toBe(REACH_QUEUE_MAX); // 1 running + 4 queued, 1 dropped
    expect(g.snapshot().bank).toBe(100 + 6 * 3);           // every hit still pays
    steps(g, 2.8 + MISS_HOLD + 0.05);
    expect(g.snapshot().phase).toBe('reach'); expect(g.snapshot().reachQueue).toBe(3);
  });
});

describe('jackpot', () => {
  const winning = () => new Game(MACHINES.raijin, 1, undefined, { rng: scripted([0.01, 0.7, ...Array(50).fill(0.9)]) });
  const openJackpot = (g: Game) => { dropInto(g, 320, 700); steps(g, 0.05 + 2.8 + REEL_TENSION + 0.02); expect(g.snapshot().phase).toBe('jackpot'); };
  it('attacker pays per ball and closes at the ball cap', () => {
    const g = winning(); openJackpot(g);
    const bank0 = g.snapshot().bank;
    for (let i = 0; i < 15; i++) { dropInto(g, 320, 610); steps(g, 0.05); }
    expect(g.snapshot().phase).toBe('playing');
    expect(g.snapshot().bank).toBe(bank0 + 15 * 15);
    expect(g.snapshot().biggestJackpot).toBe(225);
  });
  it('closes on the time cap and reports total', () => {
    const g = winning(); openJackpot(g);
    dropInto(g, 320, 610); steps(g, 0.05);
    const ev = steps(g, 15);
    const close = ev.find(e => e.type === 'jackpotClose');
    expect(close && close.type === 'jackpotClose' ? close.total : -1).toBe(15);
    expect(g.snapshot().phase).toBe('playing');
  });
  it('attacker does nothing when closed', () => {
    const g = new Game(MACHINES.raijin, 1);
    dropInto(g, 320, 610); steps(g, 0.05);
    expect(g.snapshot().bank).toBe(100); expect(g.snapshot().balls.length).toBe(1);
  });
  it('right-shoot flag is set only on big-wave during jackpot', () => {
    const g = new Game(MACHINES['big-wave'], 1, undefined, { rng: scripted([0.01, 0.7, ...Array(50).fill(0.9)]) });
    expect(g.snapshot().rightShoot).toBe(false);
    dropInto(g, 320, 700); steps(g, 0.05 + 2.8 + REEL_TENSION + 0.02);
    expect(g.snapshot().phase).toBe('jackpot'); expect(g.snapshot().rightShoot).toBe(true);
    const h = winning(); openJackpot(h); expect(h.snapshot().rightShoot).toBe(false);
  });
  it('big-wave electric tulip is a start chucker', () => {
    const g = new Game(MACHINES['big-wave'], 1, undefined, { rng: scripted([0.9, 0.9, 0.1, 0.5, 0.3]) });
    dropInto(g, 320, 372);
    const ev = steps(g, 0.05);
    expect(types(ev)).toContain('reachStart');
  });
});

describe('free balls', () => {
  const dropFree = (g: Game, x: number, y: number) => {
    const b: Ball = { id: 999, x, y: y - 3, px: x, py: y - 3, vx: 0, vy: 400, age: 0, free: true };
    (g as unknown as { balls: Ball[] }).balls.push(b);
  };
  it('trigger catch, tulip, reach and attacker events but never pay or count toward the jackpot', () => {
    const g = new Game(MACHINES.raijin, 1, undefined, { rng: scripted([0.01, 0.7, ...Array(50).fill(0.9)]) });
    for (let i = 0; i < 7; i++) dropFree(g, 160, 700);   // win pocket
    for (let i = 0; i < 3; i++) dropFree(g, 110, 400);   // tulip: closed → open → closed → open
    for (let i = 0; i < 5; i++) dropFree(g, 320, 700);   // start: one reach (a win) + 4 queued
    let ev = steps(g, 0.05);
    expect(ev.filter(e => e.type === 'catch').length).toBe(15);
    expect(ev.filter(e => e.type === 'catch' && e.payout === 5).length).toBe(10);
    expect(ev.filter(e => e.type === 'tulip').length).toBe(3);
    expect(g.snapshot().tulipOpen['tulip-l']).toBe(true);
    expect(types(ev)).toContain('reachStart'); expect(g.snapshot().reachQueue).toBe(REACH_QUEUE_MAX);
    ev = steps(g, 2.8 + REEL_TENSION + 0.02);
    expect(types(ev)).toContain('jackpotOpen'); expect(g.snapshot().phase).toBe('jackpot');
    for (let i = 0; i < 5; i++) { dropFree(g, 320, 610); ev = steps(g, 0.05); expect(ev.filter(e => e.type === 'attackerCatch' && e.payout === 15).length).toBe(1); }
    expect(g.snapshot().jackpot).toEqual({ t: expect.any(Number), caught: 0, total: 0 });
    expect(g.snapshot().balls.length).toBe(0);
    const s = g.snapshot();
    expect([s.bank, s.sessionWon, s.bestSession, s.biggestJackpot]).toEqual([100, 0, 0, 0]);
  });
  it('fireAt(strength, true) marks the ball free', () => {
    const g = new Game(MACHINES.raijin, 1);
    g.fireAt(0.5, true); g.fireAt(0.5);
    expect(g.snapshot().balls.map(b => b.free)).toEqual([true, undefined]);
  });
});

describe('save', () => {
  it('round-trips bank, bestSession, biggestJackpot', () => {
    const g = new Game(MACHINES.raijin, 1, { bank: 42, bestSession: 300, biggestJackpot: 90 });
    expect(g.save()).toEqual({ bank: 42, bestSession: 300, biggestJackpot: 90 });
  });
});
