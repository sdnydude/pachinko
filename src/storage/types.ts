import type { MachineId } from '../core/machine';
import type { GameSave } from '../core/game';

export interface SaveData {
  version: 1;
  mute: boolean;
  firstRunDone: boolean;
  perMachine: Partial<Record<MachineId, GameSave>>;
}

export interface Storage {
  load(): Promise<SaveData | null>;
  save(data: SaveData): Promise<void>;
}

export const EMPTY_SAVE: SaveData = {
  version: 1,
  mute: false,
  firstRunDone: false,
  perMachine: {},
};
