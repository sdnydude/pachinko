import { describe, it, expect } from 'vitest';
import { Game } from '../src/core/game';
import { MACHINES } from '../src/core/machine';
import { stateHash } from '../src/core/sim';

function drive(seed: number) {
  const g = new Game(MACHINES['big-wave'], seed);
  for (let i = 0; i < 10000; i++) {
    if (i % 300 === 0) g.setHeld(true);
    if (i % 300 === 200) g.trim(0.1);
    if (i % 300 === 250) g.setHeld(false);
    g.step();
  }
  return stateHash(g);
}
describe('determinism', () => {
  it('same seed and inputs give identical state after 10k steps', () => { expect(drive(1234)).toBe(drive(1234)); });
  it('different seeds diverge', () => { expect(drive(1)).not.toBe(drive(2)); });
});
