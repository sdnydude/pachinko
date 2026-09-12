import type { Layout } from './board';
import { RAIJIN_LAYOUT } from './layouts/raijin';
import { BIG_WAVE_LAYOUT } from './layouts/big-wave';
import { HANA_FAN_LAYOUT } from './layouts/hana-fan';

export type MachineId = 'raijin' | 'big-wave' | 'hana-fan';
export interface Tuning { reachOdds: number; jackpotSeconds: number; jackpotBalls: number; attackerPayout: number; startPayout: number }
export interface Machine { id: MachineId; name: string; layout: Layout; tuning: Tuning; attackerSide: 'center' | 'right' }

export const MACHINES: Record<MachineId, Machine> = {
  raijin:     { id: 'raijin',   name: '雷神 RAIJIN',   layout: RAIJIN_LAYOUT,   attackerSide: 'center', tuning: { reachOdds: 16, jackpotSeconds: 15, jackpotBalls: 15, attackerPayout: 15, startPayout: 3 } },
  'big-wave': { id: 'big-wave', name: '大海 BIG WAVE', layout: BIG_WAVE_LAYOUT, attackerSide: 'right',  tuning: { reachOdds: 8,  jackpotSeconds: 10, jackpotBalls: 10, attackerPayout: 15, startPayout: 3 } },
  'hana-fan': { id: 'hana-fan', name: '花扇 HANA FAN', layout: HANA_FAN_LAYOUT, attackerSide: 'center', tuning: { reachOdds: 12, jackpotSeconds: 8,  jackpotBalls: 8,  attackerPayout: 13, startPayout: 3 } },
};
export const MACHINE_ORDER: MachineId[] = ['raijin', 'big-wave', 'hana-fan'];
