import { PIN_R, roofRect } from '../board';
import { buildLayout, bottomRow, tulip, attacker } from './common';
export const RAIJIN_LAYOUT = buildLayout({
  skipRects: [{ x: 200, y: 130, w: 240, h: 300 }],           // kabuki mask + reel bezel
  windmills: [{ x: 120, y: 250, r: 10, dir: 1 }, { x: 520, y: 250, r: 10, dir: -1 }, { x: 160, y: 480, r: 10, dir: 1 }, { x: 480, y: 480, r: 10, dir: -1 }],
  catchers: [tulip('tulip-l', 'win', 110, 400, 5, 7, 4), tulip('tulip-r', 'win', 530, 400, 5, 7, 4), ...bottomRow(3, 9)],
  // splitter above the top pin row: the 0.3 stream (first contact pin (160,110)) hits it and scatters left, the 0.5
  // stream passes 30 px above; without it 0.3 and 0.5 share one path and 0.3 returned >100 %
  extraPins: [{ x: 150, y: 92, r: PIN_R }],
  attacker: attacker(320, 15),
  reelRect: { x: 240, y: 372, w: 160, h: 44 },
  solids: { circles: [{ x: 320, y: 260, r: 100 }], segments: roofRect({ x: 232, y: 364, w: 176, h: 60 }, 12) }, // kabuki mask + reel bezel
});
