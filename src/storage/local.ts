import type { SaveData, Storage } from './types';

const KEY = 'pachinko.save.v1';

type Backend = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
};

export class LocalStorage implements Storage {
  constructor(private backend: Backend = globalThis.localStorage) {}

  async load(): Promise<SaveData | null> {
    try {
      const raw = this.backend.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as Partial<SaveData>;
      if (d.version !== 1 || typeof d.perMachine !== 'object') return null;
      return {
        version: 1,
        mute: !!d.mute,
        firstRunDone: !!d.firstRunDone,
        perMachine: d.perMachine ?? {},
      };
    } catch {
      return null;
    }
  }

  async save(d: SaveData): Promise<void> {
    try {
      this.backend.setItem(KEY, JSON.stringify(d));
    } catch {
      /* quota or private mode: ignore */
    }
  }
}
