import { describe, it, expect } from 'vitest';
import { runSoak } from '../src/core/sim';
import { MACHINE_ORDER } from '../src/core/machine';

describe('soak', () => {
  for (const id of MACHINE_ORDER) {
    for (const strength of [0.2, 0.4, 0.6, 0.8, 1.0]) {
      it(`${id} @ ${strength}: every ball exits within 30 s, no NaN, no OOB, ≤15 in flight`, () => {
        const r = runSoak(id, { balls: 2000, strength, seed: 77 }); // 5 strengths × 2000 = 10k per machine
        expect(r.nan).toBe(false); expect(r.oob).toBe(false);
        expect(r.maxAge).toBeLessThanOrEqual(30);
        expect(r.maxInFlight).toBeLessThanOrEqual(15);
        expect(r.balls).toBe(2000);
      });
    }
  }
}, 120_000);

describe('balance', () => {
  for (const id of MACHINE_ORDER) {
    it(`${id}: best-strength return rate is within 85–95%`, () => {
      const best = Math.max(...[0.4, 0.5, 0.6, 0.7, 0.8].map(s => runSoak(id, { balls: 2000, strength: s, seed: 5 }).returnRate));
      expect(best).toBeGreaterThanOrEqual(0.85); expect(best).toBeLessThanOrEqual(0.95);
    });
  }
}, 120_000);
