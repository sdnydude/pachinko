import { describe, it, expect } from 'vitest';
import { THEMES } from '../src/render/themes/index';
import { MACHINE_ORDER } from '../src/core/machine';

describe('themes', () => {
  it('every machine has a theme with a cel url, lamps, fonts and copy', () => {
    for (const id of MACHINE_ORDER) {
      const t = THEMES[id];
      expect(t.id).toBe(id);
      expect(t.celUrl.startsWith('data:image/svg+xml')).toBe(true);
      expect(t.palette.lamps.length).toBeGreaterThanOrEqual(3);
      expect(t.fonts.googleFamilies.length).toBeGreaterThan(0);
      expect(t.copy.jackpot.length).toBeGreaterThan(0);
      expect(t.jewelEvery).toBeGreaterThan(1);
      const text = JSON.stringify(t.copy).toLowerCase();
      for (const banned of ['coin', 'credit', 'cash', '$']) expect(text.includes(banned)).toBe(false);
    }
  });
});
