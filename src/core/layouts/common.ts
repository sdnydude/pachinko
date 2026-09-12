import { CATCH_ROW_Y, pinGrid, tulipPins, near, inRect, type Catcher, type Layout, type Pin, type Rect, type Windmill } from '../board';

export const GRID = { x0: 80, dx: 40, cols: 13, y0: 110, dy: 36, rows: 14 };

export function bottomRow(startPayout: number, winHalfWidth = 14): Catcher[] {
  return [
    { id: 'out-l', kind: 'out', x: 70, y: CATCH_ROW_Y, halfWidth: 20, payout: 0 },
    { id: 'win-l', kind: 'win', x: 160, y: CATCH_ROW_Y, halfWidth: winHalfWidth, payout: 5 },
    { id: 'start', kind: 'start', x: 320, y: CATCH_ROW_Y, halfWidth: 30, payout: startPayout },
    { id: 'win-r', kind: 'win', x: 440, y: CATCH_ROW_Y, halfWidth: winHalfWidth, payout: 5 },
    { id: 'out-r', kind: 'out', x: 530, y: CATCH_ROW_Y, halfWidth: 20, payout: 0 },
  ];
}

export function tulip(id: string, kind: 'win' | 'start', x: number, y: number, payout: number, openHalfWidth = 14, closedHalfWidth = 6): Catcher {
  return { id, kind, x, y, halfWidth: closedHalfWidth, payout, tulip: { openHalfWidth, closedHalfWidth } };
}

export function attacker(x: number, payout: number): Catcher {
  return { id: 'attacker', kind: 'attacker', x, y: 610, halfWidth: 70, payout };
}

export interface BuildOpts { skipRects: Rect[]; windmills: Windmill[]; catchers: Catcher[]; attacker: Catcher; reelRect: Rect }

export function buildLayout(o: BuildOpts): Layout {
  const tulips = o.catchers.filter(c => c.tulip);
  const skip = (x: number, y: number) =>
    o.skipRects.some(r => inRect(x, y, r)) ||
    near(x, y, o.windmills, 26) ||
    near(x, y, tulips, 36) ||
    near(x, y, [o.attacker], 90) ||
    y > 600; // bottom funnel is open
  const pins: Pin[] = [...pinGrid(GRID, skip), ...tulips.flatMap(tulipPins)];
  return { pins, windmills: o.windmills, catchers: o.catchers, attacker: o.attacker, reelRect: o.reelRect, launch: { x: 70, y: 50 } };
}
