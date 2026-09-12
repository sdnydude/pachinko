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

/** Big Wave's halves: at 0.9 both side tulips must see traffic (D5 left tulip-r at ~0.8 % — this guards the floor). */
describe('coverage', () => {
  it('big-wave @ 0.9: tulip-l and tulip-r each catch ≥ 0.4 % of fired balls (mean of seeds 5/2026)', () => {
    const runs = [5, 2026].map(seed => runSoak('big-wave', { balls: 2000, strength: 0.9, seed }));
    const share = (id: string) => runs.reduce((a, r) => a + (r.catches[id] ?? 0) / r.balls, 0) / runs.length;
    const l = share('tulip-l'), r = share('tulip-r');
    console.log(`big-wave @0.9 tulip-l ${(l * 100).toFixed(2)} % tulip-r ${(r * 100).toFixed(2)} % (${runs.map(x => `${x.catches['tulip-l'] ?? 0}/${x.catches['tulip-r'] ?? 0}`).join(', ')})`);
    expect(l).toBeGreaterThanOrEqual(0.004); expect(r).toBeGreaterThanOrEqual(0.004);
  });
}, 60_000);
