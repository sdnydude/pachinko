import { roofRect } from '../board';
import { buildLayout, bottomRow, tulip, attacker } from './common';
export const HANA_FAN_LAYOUT = buildLayout({
  skipRects: [{ x: 214, y: 134, w: 212, h: 260 }],           // spinning flower + reel bezel
  windmills: [{ x: 120, y: 240, r: 10 }, { x: 520, y: 240, r: 10 }, { x: 320, y: 460, r: 10 }],
  catchers: [
    tulip('tulip-1', 'win', 110, 380, 5, 10, 3), tulip('tulip-2', 'win', 530, 380, 5, 14, 3),
    tulip('tulip-3', 'win', 200, 520, 5, 12, 3), tulip('tulip-4', 'win', 440, 520, 5, 14, 3),
    ...bottomRow(3, 11),
  ],
  attacker: attacker(320, 13),
  reelRect: { x: 250, y: 340, w: 140, h: 40 },
  solids: { circles: [{ x: 320, y: 240, r: 84 }], segments: roofRect({ x: 244, y: 334, w: 152, h: 52 }, 12) }, // flower + reel bezel
});
