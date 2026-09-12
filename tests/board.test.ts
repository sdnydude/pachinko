import { describe, it, expect } from 'vitest';
import { pinGrid, tulipPins, near, inRect, PIN_R, type Catcher } from '../src/core/board';

describe('pinGrid', () => {
  it('staggers odd rows by half dx and drops one column', () => {
    const pins = pinGrid({ x0: 80, dx: 40, cols: 3, y0: 100, dy: 36, rows: 2 }, () => false);
    expect(pins.map(p => [p.x, p.y])).toEqual([[80,100],[120,100],[160,100],[100,136],[140,136]]);
    expect(pins.every(p => p.r === PIN_R)).toBe(true);
  });
  it('honors skip', () => {
    const pins = pinGrid({ x0: 0, dx: 10, cols: 4, y0: 0, dy: 10, rows: 1 }, (x) => x === 20);
    expect(pins.map(p => p.x)).toEqual([0, 10, 30]);
  });
});

describe('tulipPins', () => {
  it('returns two wing pins above and beside the mouth', () => {
    const c: Catcher = { id: 't', kind: 'win', x: 100, y: 400, halfWidth: 6, payout: 5, tulip: { openHalfWidth: 14, closedHalfWidth: 6 } };
    const wings = tulipPins(c);
    expect(wings).toEqual([{ x: 82, y: 386, r: PIN_R }, { x: 118, y: 386, r: PIN_R }]);
  });
});

describe('helpers', () => {
  it('near and inRect', () => {
    expect(near(0, 0, [{ x: 3, y: 4 }], 5.1)).toBe(true);
    expect(near(0, 0, [{ x: 3, y: 4 }], 4.9)).toBe(false);
    expect(inRect(5, 5, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(inRect(11, 5, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });
});
