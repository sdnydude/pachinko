import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const sa = Array.from({ length: 5 }, () => a.next());
    const sb = Array.from({ length: 5 }, () => b.next());
    expect(sa).toEqual(sb);
  });
  it('differs across seeds', () => {
    expect(mulberry32(1).next()).not.toBe(mulberry32(2).next());
  });
  it('next() is in [0,1) and int(n) is in [0,n)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1);
      const k = r.int(6); expect(k).toBeGreaterThanOrEqual(0); expect(k).toBeLessThan(6);
    }
  });
  it('range(a,b) is within bounds', () => {
    const r = mulberry32(3);
    for (let i = 0; i < 100; i++) { const v = r.range(-2, 2); expect(v).toBeGreaterThanOrEqual(-2); expect(v).toBeLessThan(2); }
  });
});
