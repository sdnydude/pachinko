export const BOARD_W = 600;
export const BOARD_H = 720;
export const BALL_R = 5.5;
export const PIN_R = 3.5;
export const FIELD_LEFT = 40;
export const CATCH_ROW_Y = 700;

export interface Pin { x: number; y: number; r: number }
export interface Windmill { x: number; y: number; r: number }
export type CatcherKind = 'win' | 'start' | 'out' | 'attacker';
export interface Catcher {
  id: string; kind: CatcherKind; x: number; y: number; halfWidth: number; payout: number;
  tulip?: { openHalfWidth: number; closedHalfWidth: number };
}
export interface Rect { x: number; y: number; w: number; h: number }
export interface Segment { ax: number; ay: number; bx: number; by: number }
/** Solid gadget geometry (cel art the ball bounces off): circles and thin wall segments. */
export interface Solids { circles: { x: number; y: number; r: number }[]; segments: Segment[] }
export interface Layout {
  pins: Pin[]; windmills: Windmill[]; catchers: Catcher[]; attacker: Catcher;
  reelRect: Rect; launch: { x: number; y: number }; solids: Solids;
}
export interface GridSpec { x0: number; dx: number; cols: number; y0: number; dy: number; rows: number }

export function pinGrid(spec: GridSpec, skip: (x: number, y: number) => boolean): Pin[] {
  const pins: Pin[] = [];
  for (let r = 0; r < spec.rows; r++) {
    const odd = r % 2 === 1;
    const n = odd ? spec.cols - 1 : spec.cols;
    for (let c = 0; c < n; c++) {
      const x = spec.x0 + (odd ? spec.dx / 2 : 0) + c * spec.dx;
      const y = spec.y0 + r * spec.dy;
      if (!skip(x, y)) pins.push({ x, y, r: PIN_R });
    }
  }
  return pins;
}

export function tulipPins(c: Catcher): Pin[] {
  return [{ x: c.x - 18, y: c.y - 14, r: PIN_R }, { x: c.x + 18, y: c.y - 14, r: PIN_R }];
}

export function near(x: number, y: number, pts: { x: number; y: number }[], d: number): boolean {
  return pts.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 <= d * d);
}

export function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Closed outline of a rect whose top edge is a shallow roof (peak `peak` px above the top) so balls roll off. */
export function roofRect(r: Rect, peak: number): Segment[] {
  const l = r.x, t = r.y, rt = r.x + r.w, bt = r.y + r.h, mx = r.x + r.w / 2;
  return [
    { ax: l, ay: t, bx: mx, by: t - peak }, { ax: mx, ay: t - peak, bx: rt, by: t },
    { ax: rt, ay: t, bx: rt, by: bt }, { ax: rt, ay: bt, bx: l, by: bt }, { ax: l, ay: bt, bx: l, by: t },
  ];
}
