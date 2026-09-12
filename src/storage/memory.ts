import type { SaveData, Storage } from './types';

export class MemoryStorage implements Storage {
  private data: SaveData | null = null;

  async load(): Promise<SaveData | null> {
    return this.data ? structuredClone(this.data) : null;
  }

  async save(d: SaveData): Promise<void> {
    this.data = structuredClone(d);
  }
}
