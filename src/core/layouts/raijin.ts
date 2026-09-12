import { roofRect } from '../board';
import { buildLayout, bottomRow, tulip, attacker } from './common';
export const RAIJIN_LAYOUT = buildLayout({
  skipRects: [{ x: 200, y: 130, w: 240, h: 300 }],           // kabuki mask + reel bezel
  windmills: [{ x: 120, y: 250, r: 10 }, { x: 520, y: 250, r: 10 }, { x: 160, y: 480, r: 10 }, { x: 480, y: 480, r: 10 }],
  catchers: [tulip('tulip-l', 'win', 110, 400, 5, 9, 4), tulip('tulip-r', 'win', 530, 400, 5, 9, 4), ...bottomRow(3, 10)],
  attacker: attacker(320, 15),
  reelRect: { x: 240, y: 372, w: 160, h: 44 },
  solids: { circles: [{ x: 320, y: 260, r: 100 }], segments: roofRect({ x: 232, y: 364, w: 176, h: 60 }, 12) }, // kabuki mask + reel bezel
});
