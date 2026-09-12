import type { MachineId } from '../core/machine';
export interface Theme {
  id: MachineId; name: string; shortName: string; celUrl: string;
  palette: {
    accent: string; accent2: string; pin: string; pinHi: string; jewel: string; ball: string; ballHi: string;
    reelBg: string; reelFg: string; reelHit: string; tulipWing: string; tulipBody: string; windmill: string[];
    pocketWin: string; pocketStart: string; pocketOut: string; attacker: string; attackerOpen: string;
    lamps: string[]; panelBg: string; panelFg: string; panelAccent: string; wall: string;
  };
  fonts: { display: string; body: string; googleFamilies: string[] };
  copy: { jackpot: string; reach: string; rightShoot: string; start: string; fever: string; buyIn: string };
  jewelEvery: number;
}

/**
 * Board-space pixel sizes the canvas renderer draws the fixed hardware at (pockets, tulips, attacker, reel digits).
 * Data, not theme: every machine shares the same physical parts; only colors and copy differ per Theme.
 * Kept out of canvas.ts so a size tweak is one edit here rather than a hunt through draw calls.
 */
export const RENDER_METRICS = {
  tulip: { pedestalW: 16, pedestalH: 14, wingRoot: 7, wingBulge: 4, wingLift: 10, wingLen: 20, wingWidth: 4, labelPx: 9, labelDy: 7 },
  pocket: { h: 16, lip: 2, labelPx: 10, labelDy: 6 },
  attacker: { closedH: 8, openH: 14, lip: 4 },
  reelFontRatio: 0.8,   // digit height as a fraction of the reel window height
} as const;
