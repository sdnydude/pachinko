import { buildLayout, bottomRow, tulip, attacker } from './common';
export const BIG_WAVE_LAYOUT = buildLayout({
  skipRects: [{ x: 170, y: 120, w: 300, h: 290 }],           // gold frame + LCD + START tulip
  windmills: [{ x: 110, y: 260, r: 10 }, { x: 530, y: 260, r: 10 }, { x: 150, y: 500, r: 10 }, { x: 490, y: 500, r: 10 }],
  catchers: [
    tulip('e-chucker', 'start', 320, 372, 3),                  // electric start tulip under the LCD
    tulip('tulip-l', 'win', 100, 420, 5), tulip('tulip-r', 'win', 540, 420, 5),
    ...bottomRow(3),
  ],
  attacker: attacker(500, 15),                                // right side → right-shoot
  reelRect: { x: 220, y: 200, w: 200, h: 90 },
});
