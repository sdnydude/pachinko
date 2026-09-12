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

/**
 * Balance guard. Per strength the return rate is the mean of two seeds (one seed sat within a point of the band edge
 * and moved 5 points on a segment reorder); the best of 0.4–0.8 must be 1.5 points inside 85–95 %, and no strength —
 * including the "hold barely" 0.2/0.3 a player could farm — may return over 100 %. The table is printed for the report.
 */
describe('balance', () => {
  const STRENGTHS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const SEEDS = [5, 2026];
  for (const id of MACHINE_ORDER) {
    it(`${id}: best of 0.4–0.8 (mean of seeds ${SEEDS.join('/')}) is within 86.5–93.5 %, every strength ≤ 100 %`, () => {
      const rows = STRENGTHS.map(s => { const rates = SEEDS.map(seed => runSoak(id, { balls: 2000, strength: s, seed }).returnRate); return { s, rates, mean: rates.reduce((a, b) => a + b) / rates.length }; });
      const pct = (x: number) => (x * 100).toFixed(1);
      console.log(`${id}: ` + rows.map(r => `${r.s.toFixed(1)}=${pct(r.mean)} (${r.rates.map(pct).join('/')})`).join('  '));
      const best = Math.max(...rows.filter(r => r.s >= 0.4 && r.s <= 0.8).map(r => r.mean));
      expect(best).toBeGreaterThanOrEqual(0.865); expect(best).toBeLessThanOrEqual(0.935);
      for (const r of rows) expect(r.mean, `strength ${r.s}`).toBeLessThanOrEqual(1.0);
    });
  }
}, 120_000);
