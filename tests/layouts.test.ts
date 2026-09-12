import { describe, it, expect } from 'vitest';
import { MACHINES, MACHINE_ORDER } from '../src/core/machine';
import { BOARD_W, BOARD_H, FIELD_LEFT, inRect, near } from '../src/core/board';

describe('machine layouts', () => {
  for (const id of MACHINE_ORDER) {
    const m = MACHINES[id];
    it(`${id}: pins are inside the field and clear of gadgets, windmills and catchers`, () => {
      expect(m.layout.pins.length).toBeGreaterThan(80);
      for (const p of m.layout.pins) {
        expect(p.x).toBeGreaterThan(FIELD_LEFT + 10); expect(p.x).toBeLessThan(BOARD_W - 10);
        expect(p.y).toBeGreaterThan(80); expect(p.y).toBeLessThan(BOARD_H - 60);
        expect(inRect(p.x, p.y, m.layout.reelRect)).toBe(false);
        expect(near(p.x, p.y, m.layout.windmills, 22)).toBe(false);
      }
      const pinKeys = new Set(m.layout.pins.map(p => `${p.x},${p.y}`));
      expect(pinKeys.size).toBe(m.layout.pins.length);
    });
    it(`${id}: has one start catcher on the bottom row, out pockets, and an attacker`, () => {
      const starts = m.layout.catchers.filter(c => c.kind === 'start' && c.y === 700);
      expect(starts.length).toBe(1);
      expect(m.layout.catchers.filter(c => c.kind === 'out').length).toBe(2);
      expect(m.layout.attacker.kind).toBe('attacker');
      expect(m.layout.attacker.payout).toBe(m.tuning.attackerPayout);
    });
  }
  it('tuning matches the spec table', () => {
    expect(MACHINES['hana-fan'].tuning).toEqual({ reachOdds: 12, jackpotSeconds: 8, jackpotBalls: 8, attackerPayout: 13, startPayout: 3 });
    expect(MACHINES['big-wave'].tuning).toEqual({ reachOdds: 8, jackpotSeconds: 10, jackpotBalls: 10, attackerPayout: 15, startPayout: 3 });
    expect(MACHINES['raijin'].tuning).toEqual({ reachOdds: 16, jackpotSeconds: 15, jackpotBalls: 15, attackerPayout: 15, startPayout: 3 });
  });
  it('tulip counts: hana-fan 4, others 2 win tulips', () => {
    const tulips = (id: keyof typeof MACHINES) => MACHINES[id].layout.catchers.filter(c => c.tulip && c.kind === 'win').length;
    expect(tulips('hana-fan')).toBe(4); expect(tulips('big-wave')).toBe(2); expect(tulips('raijin')).toBe(2);
  });
  it('big-wave attacker is on the right, others center', () => {
    expect(MACHINES['big-wave'].attackerSide).toBe('right');
    expect(MACHINES['big-wave'].layout.attacker.x).toBe(500);
    expect(MACHINES['raijin'].layout.attacker.x).toBe(320);
    expect(MACHINES['hana-fan'].layout.attacker.x).toBe(320);
  });
});
