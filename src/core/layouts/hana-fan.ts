import { PIN_R, roofRect } from '../board';
import { buildLayout, bottomRow, tulip, attacker } from './common';
export const HANA_FAN_LAYOUT = buildLayout({
  skipRects: [{ x: 214, y: 134, w: 212, h: 260 }],           // spinning flower + reel bezel
  // right windmill sits in the 0.9 stream's descent (x≈430 after it rolls off the flower): at (520,240) 0.9 returned ~100 %
  windmills: [{ x: 120, y: 240, r: 10, dir: 1 }, { x: 495, y: 245, r: 10, dir: -1 }, { x: 320, y: 460, r: 10, dir: 1 }],
  catchers: [
    tulip('tulip-1', 'win', 110, 380, 5, 6, 4), tulip('tulip-2', 'win', 530, 380, 5, 10, 4),
    tulip('tulip-3', 'win', 200, 520, 5, 10, 4), tulip('tulip-4', 'win', 440, 520, 5, 12, 4),
    ...bottomRow(3, 9),
  ],
  extraPins: [{ x: 155, y: 95, r: PIN_R }],                    // splitter for the 0.3 stream (see raijin), 0.5 passes above it
  attacker: attacker(320, 13),
  reelRect: { x: 250, y: 340, w: 140, h: 40 },
  solids: { circles: [{ x: 320, y: 240, r: 84 }], segments: roofRect({ x: 244, y: 334, w: 152, h: 52 }, 12) }, // flower + reel bezel
});
