import type { Segment } from '../board';
import { buildLayout, bottomRow, tulip, attacker } from './common';

const seg = (ax: number, ay: number, bx: number, by: number): Segment => ({ ax, ay, bx, by });
const mirror = (s: Segment): Segment => seg(640 - s.ax, s.ay, 640 - s.bx, s.by); // about the frame centre x=320

/**
 * Gold frame (cel rect 178,128 284×250; roof peaked 14 px above it) with warps to the electric chucker at (320,372):
 * - top: a 14 px slot at the ridge with an 8 px chimney wall on the left side only. Balls skimming along the left roof
 *   at 0.2–0.6 are turned back by the wall instead of dropping in (a bare gap or sloped lips scooped 20–100% of them
 *   at some strengths), so the slot only takes near-vertical arrivals (~1–3%); 0.7–1.0 skimmers hop the wall and the
 *   open slot, run down the right roof and feed the right half (tulip-r 8–10% at 0.7–0.8). A 14 px wall on both sides
 *   kept every strength below 1.0 on the left, so the right half was dead.
 * - sides: a 20 px opening in each wall just above the funnel shoulder, fed by balls that have come down four pin rows
 *   beside the frame — a mixed population, which is what keeps the chucker rate smooth (1–3%) across strengths.
 * Inside, a funnel (shoulder from the wall, then 62° so the chucker's guard pins stay under it) and a 16 px channel
 * drop every warp ball onto the mouth. The floor is open under the channel: a floor 6 px below the catch line flipped
 * vy before the catch test and parked the ball. Nothing inside the frame is flat or concave-up, so no ball can rest.
 */
function warpFrame(): Segment[] {
  const l = 178, t = 128, b = 378, mx = 320, ridge = t - 14, slot = 7, chimney = 8, mouth = 8;
  const left = [
    seg(l, t, mx - slot, ridge),                                                              // roof
    seg(l, t, l, 264), seg(l, 284, l, b),                                                     // side wall around the warp opening
    seg(l, 286, 276, 300), seg(276, 300, mx - mouth, 368), seg(mx - mouth, 368, mx - mouth, b), // shoulder, steep funnel, channel
    seg(l, b, mx - mouth, b),                                                                 // floor up to the channel
  ];
  return [...left, seg(mx - slot, ridge, mx - slot, ridge - chimney), ...left.map(mirror)];  // chimney wall on the left only
}

export const BIG_WAVE_LAYOUT = buildLayout({
  skipRects: [{ x: 170, y: 100, w: 300, h: 310 }],           // gold frame (incl. its roof, so no pin wedges a ball against it) + LCD + START tulip
  windmills: [{ x: 110, y: 260, r: 10 }, { x: 530, y: 260, r: 10 }, { x: 150, y: 500, r: 10 }, { x: 490, y: 500, r: 10 }],
  catchers: [
    tulip('e-chucker', 'start', 320, 372, 3),                  // electric start tulip under the LCD, fed only by the warps
    tulip('tulip-l', 'win', 100, 420, 5, 8, 3), tulip('tulip-r', 'win', 540, 420, 5, 24, 10),
    ...bottomRow(3, 8),                                        // win 8: the chimney sends 0.4–0.8 down the left channel onto win-l
  ],
  attacker: attacker(500, 15),                                // right side → right-shoot
  reelRect: { x: 220, y: 200, w: 200, h: 90 },
  solids: { circles: [], segments: warpFrame() },
});
