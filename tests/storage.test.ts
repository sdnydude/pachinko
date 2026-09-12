import { describe, it, expect } from 'vitest';
import { MemoryStorage } from '../src/storage/memory';
import { LocalStorage } from '../src/storage/local';
import { EMPTY_SAVE, type SaveData } from '../src/storage/types';

const sample: SaveData = { version: 1, mute: true, firstRunDone: true, perMachine: { raijin: { bank: 12, bestSession: 40, biggestJackpot: 15 } } };

describe('MemoryStorage', () => {
  it('returns null before save, then round-trips', async () => {
    const s = new MemoryStorage();
    expect(await s.load()).toBeNull();
    await s.save(sample); expect(await s.load()).toEqual(sample);
  });
});
describe('LocalStorage', () => {
  it('round-trips through a localStorage-like object and tolerates garbage', async () => {
    const store = new Map<string, string>();
    const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    const s = new LocalStorage(fake);
    expect(await s.load()).toBeNull();
    await s.save(sample); expect(await s.load()).toEqual(sample);
    store.set('pachinko.save.v1', '{not json'); expect(await s.load()).toBeNull();
    store.set('pachinko.save.v1', JSON.stringify({ version: 99 })); expect(await s.load()).toBeNull();
  });
  it('EMPTY_SAVE is a valid blank', () => { expect(EMPTY_SAVE.version).toBe(1); expect(EMPTY_SAVE.perMachine).toEqual({}); });
});
