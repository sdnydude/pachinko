import { describe, it, expect, vi, afterEach } from 'vitest';
import { Effects, MAX_PARTICLES } from '../src/render/effects';
import { THEMES } from '../src/render/themes/index';
import { MACHINES } from '../src/core/machine';
import { Game } from '../src/core/game';
import { Synth } from '../src/audio/synth';
import { SOUND_SETS } from '../src/audio/sets';

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
  it('reduced can be toggled live', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout);
    const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
    fx.reduced = true;
    fx.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }], s);
    expect(fx.particleCount).toBe(0);
    fx.reduced = false;
    fx.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }], s);
    expect(fx.particleCount).toBe(3);
  });
  it('a free-ball catch sparks but adds no payout float', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout);
    const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
    fx.onEvents([{ type: 'catch', catcherId: 'win-l', kind: 'win', payout: 5, free: true, x: 160, y: 700 }], s);
    fx.onEvents([{ type: 'attackerCatch', payout: 15, free: true, caught: 1, x: 320, y: 610 }], s);
    expect(fx.floatCount).toBe(0);
    expect(fx.particleCount).toBe(20);
    fx.onEvents([{ type: 'catch', catcherId: 'win-l', kind: 'win', payout: 5, free: false, x: 160, y: 700 }], s);
    expect(fx.floatCount).toBe(1);
  });
  it('reduced motion suppresses pin flash and lamp chase', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout, { reducedMotion: true });
    const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
    fx.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }], s);
    fx.update(0.5);
    expect(fx.lampPhase).toBe(0);
    expect(fx.flashCount).toBe(0);
  });
});

describe('Effects.update compaction', () => {
  it('keeps live particles and drops expired ones in place', () => {
    const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout);
    const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
    fx.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }, { type: 'catch', catcherId: 'win-l', kind: 'win', payout: 5, free: false, x: 160, y: 700 }], s);
    expect(fx.particleCount).toBe(11); expect(fx.floatCount).toBe(1); expect(fx.flashCount).toBe(1);
    fx.update(0.01);
    expect(fx.particleCount).toBe(11); expect(fx.floatCount).toBe(1); expect(fx.flashCount).toBe(1);
    fx.update(0.1);                       // pin flash (0.08) expires, particles (0.35) and float (0.9) survive
    expect(fx.flashCount).toBe(0); expect(fx.particleCount).toBe(11); expect(fx.floatCount).toBe(1);
    fx.update(1);
    expect(fx.particleCount).toBe(0); expect(fx.floatCount).toBe(0);
  });
});

/** Minimal AudioContext: counts oscillators; ramps and connects are no-ops. */
class FakeAudioContext {
  static created = 0;
  currentTime = 0; state = 'running'; destination = {};
  createOscillator() { FakeAudioContext.created++; return { type: 'sine', frequency: { value: 0 }, onended: null as null | (() => void), connect(n: unknown) { return n; }, disconnect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(n: unknown) { return n; }, disconnect() {} }; }
  resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
}

describe('Synth cap', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const catches = () => Array.from({ length: 50 }, () => ({ type: 'catch' as const, catcherId: 'win-l', kind: 'win' as const, payout: 5, free: false, x: 160, y: 700 }));
  it('schedules at most 12 beeps per second across 50 catch chimes (every arpeggio note counts)', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext); FakeAudioContext.created = 0;
    const synth = new Synth(SOUND_SETS.raijin); synth.resume();
    synth.onEvents(catches());
    expect(SOUND_SETS.raijin.chime.length).toBeGreaterThan(1);
    expect(FakeAudioContext.created).toBe(12);
    synth.dispose();
  });
  it('50 pin clicks in one second play exactly 12', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext); FakeAudioContext.created = 0;
    const synth = new Synth(SOUND_SETS.raijin); synth.resume();
    synth.onEvents(Array.from({ length: 50 }, (_, i) => ({ type: 'pin' as const, index: i, x: 100, y: 100, speed: 300 })));
    expect(FakeAudioContext.created).toBe(12);
    synth.dispose();
  });
  it('jackpot loop plays every tick for 2 s while clicks keep the window full', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    vi.stubGlobal('AudioContext', FakeAudioContext); vi.stubGlobal('window', globalThis); FakeAudioContext.created = 0;
    const synth = new Synth(SOUND_SETS.raijin); synth.resume();
    synth.onEvents(catches());                               // drain the window: 12 clicks stamped at t=0
    expect(FakeAudioContext.created).toBe(12);
    const arpLen = SOUND_SETS.raijin.reachChime.length + 1;  // opening arp is priority: all its notes play
    synth.onEvents([{ type: 'jackpotOpen' }]);
    expect(FakeAudioContext.created).toBe(12 + arpLen + 1);  // + the first loop tick at t=0
    const loop = (synth as unknown as { loop: { i: number } }).loop;
    expect(loop.i).toBe(1);
    expect(60000 / SOUND_SETS.raijin.jackpotLoop.bpm).toBe(500);
    let loopNotes = 1;                                       // the tick at t=0
    for (let t = 0; t < 2000; t += 250) {                    // 40 click requests/s the whole time; ticks fire inside the advance
      synth.onEvents(Array.from({ length: 10 }, (_, i) => ({ type: 'pin' as const, index: i, x: 100, y: 100, speed: 300 })));
      const before = FakeAudioContext.created;
      vi.advanceTimersByTime(250);
      loopNotes += FakeAudioContext.created - before;
    }
    expect(loop.i).toBe(5);                                  // ticks at 0/500/1000/1500/2000 ms
    expect(loopNotes).toBe(5);                               // every one of them played
    const clicks = FakeAudioContext.created - 12 - arpLen - loopNotes;
    expect(clicks).toBeLessThanOrEqual(24);                  // the cap still holds for the 80 click requests (12/s)
    synth.dispose();
  });
  it('a 4-note arp plays all four notes against a full window', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext); FakeAudioContext.created = 0;
    const synth = new Synth(SOUND_SETS.raijin); synth.resume();
    synth.onEvents(catches());
    expect(FakeAudioContext.created).toBe(12);
    expect(SOUND_SETS.raijin.close.length).toBe(4);
    synth.onEvents([{ type: 'jackpotClose', total: 30 }]);
    expect(FakeAudioContext.created).toBe(16);
    synth.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }]); // the window is still full for clicks
    expect(FakeAudioContext.created).toBe(16);
    synth.dispose();
  });
  it('disconnects oscillator and gain when a note ends', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const osc = { type: 'sine', frequency: { value: 0 }, onended: null as null | (() => void), connect(n: unknown) { return n; }, disconnect: vi.fn(), start() {}, stop() {} };
    const gain = { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(n: unknown) { return n; }, disconnect: vi.fn() };
    const synth = new Synth(SOUND_SETS.raijin); synth.resume();
    const ctx = (synth as unknown as { ctx: FakeAudioContext }).ctx;
    ctx.createOscillator = () => osc; ctx.createGain = () => gain;
    synth.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }]);
    expect(osc.onended).toBeTypeOf('function');
    osc.onended!();
    expect(osc.disconnect).toHaveBeenCalledTimes(1); expect(gain.disconnect).toHaveBeenCalledTimes(1);
    synth.dispose();
  });
});
