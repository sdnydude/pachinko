import { describe, it, expect } from 'vitest';
import { Effects, MAX_PARTICLES } from '../src/render/effects';
import { THEMES } from '../src/render/themes/index';
import { MACHINES } from '../src/core/machine';
import { Game } from '../src/core/game';

describe('Effects', () => {
  it('never exceeds the particle cap', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout);
    const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
    const ev = Array.from({ length: 500 }, (_, i) => ({ type: 'pin' as const, index: 0, x: 100 + i, y: 100, speed: 300 }));
    fx.onEvents(ev, s);
    expect(fx.particleCount).toBeLessThanOrEqual(MAX_PARTICLES);
    expect(fx.particleCount).toBe(MAX_PARTICLES);
  });
  it('lamp speed follows reach and jackpot', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout);
    const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
    expect(fx.lampSpeed).toBe('slow');
    fx.onEvents([{ type: 'reachStart' }], s); expect(fx.lampSpeed).toBe('fast');
    fx.onEvents([{ type: 'jackpotOpen' }], s); expect(fx.lampSpeed).toBe('rainbow');
    fx.onEvents([{ type: 'jackpotClose', total: 30 }], s); expect(fx.lampSpeed).toBe('slow');
  });
  it('reduced motion emits no particles', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout, { reducedMotion: true });
    const g = new Game(MACHINES.raijin, 1);
    fx.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }], g.snapshot());
    expect(fx.particleCount).toBe(0);
  });
});
