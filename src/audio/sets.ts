import type { MachineId } from '../core/machine';
export interface SoundSet {
  click: { freq: number; type: OscillatorType; ms: number };
  whir: { freq: number; type: OscillatorType; ms: number };
  clack: { freq: number; type: OscillatorType; ms: number };
  chime: number[]; reachChime: number[]; tick: { freq: number; type: OscillatorType; ms: number };
  jackpotLoop: { notes: number[]; bpm: number }; close: number[];
}
export const SOUND_SETS: Record<MachineId, SoundSet> = {
  'hana-fan': { click: { freq: 1800, type: 'square', ms: 18 }, whir: { freq: 400, type: 'triangle', ms: 120 }, clack: { freq: 900, type: 'square', ms: 40 },
    chime: [1046, 1318], reachChime: [784, 988, 1175], tick: { freq: 1200, type: 'square', ms: 15 }, jackpotLoop: { notes: [523, 659, 784, 1046], bpm: 160 }, close: [784, 1046, 1318] },
  'big-wave': { click: { freq: 1400, type: 'sine', ms: 30 }, whir: { freq: 300, type: 'sine', ms: 200 }, clack: { freq: 700, type: 'sine', ms: 60 },
    chime: [880, 1108, 1318], reachChime: [659, 784, 988, 1175], tick: { freq: 1000, type: 'sine', ms: 25 }, jackpotLoop: { notes: [440, 554, 659, 880, 659, 554], bpm: 140 }, close: [659, 880, 1108, 1318] },
  raijin: { click: { freq: 2200, type: 'square', ms: 12 }, whir: { freq: 200, type: 'sawtooth', ms: 150 }, clack: { freq: 500, type: 'square', ms: 50 },
    chime: [392, 523], reachChime: [196, 262, 330], tick: { freq: 800, type: 'square', ms: 20 }, jackpotLoop: { notes: [131, 165, 196, 262], bpm: 120 }, close: [262, 330, 392, 523] },
};
