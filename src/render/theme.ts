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
