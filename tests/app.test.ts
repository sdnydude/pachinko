// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from '../src/app';
import { MemoryStorage } from '../src/storage/memory';
import { MACHINE_ORDER } from '../src/core/machine';
import { loadCel } from '../src/render/cel';
import { installDom, mount, flush, pointer, raf, failingImages, type Mounted } from './app-harness';

const empty = { bank: 0, bestSession: 0, biggestJackpot: 0 };
let m: Mounted | null = null;

beforeEach(() => {
  installDom();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  m?.app.stop(); m?.root.remove(); m = null;
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe('App lifecycle', () => {
  it('start creates the shell, panel and canvas without console errors', async () => {
    const err = vi.spyOn(console, 'error');
    m = await mount();
    expect(m.q('.pk-shell')).toBeTruthy(); expect(m.q('.pk-panel')).toBeTruthy(); expect(m.q('canvas.pk-canvas')).toBeTruthy();
    expect(m.root.querySelectorAll('.pk-tabs button').length).toBe(MACHINE_ORDER.length);
    expect(m.root.dataset.machine).toBe('raijin');
    m.step(0.5);
    expect(m.q('[data-f=bank]').textContent).toBe('0100');
    expect(err).not.toHaveBeenCalled();
  });

  it('stop() before start() resolves does not throw and registers nothing', async () => {
    const add = vi.spyOn(window, 'addEventListener'); const save = vi.spyOn(MemoryStorage.prototype, 'save');
    const root = document.createElement('div'); document.body.appendChild(root);
    const app = new App({ root, storage: new MemoryStorage(), seed: 7 });
    const p = app.start();
    expect(() => app.stop()).not.toThrow();
    await p;
    expect(root.querySelector('.pk-panel')).toBeNull();
    expect(add).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(raf.queue.length).toBe(0);
    root.remove();
  });

  it('stop() after start removes every window/document listener it added and disposes the synth', async () => {
    const added: unknown[][] = [], removed: unknown[][] = [];
    vi.spyOn(window, 'addEventListener').mockImplementation((...a) => { added.push([a[0], a[1]]); });
    vi.spyOn(window, 'removeEventListener').mockImplementation((...a) => { removed.push([a[0], a[1]]); });
    vi.spyOn(document, 'addEventListener').mockImplementation((...a) => { added.push([a[0], a[1]]); });
    vi.spyOn(document, 'removeEventListener').mockImplementation((...a) => { removed.push([a[0], a[1]]); });
    m = await mount();
    const dispose = vi.spyOn(m.app.synth, 'dispose');
    expect(added.length).toBeGreaterThanOrEqual(4);          // keydown (app + dial), keyup (dial), pagehide, visibilitychange
    m.app.stop();
    expect(dispose).toHaveBeenCalledTimes(1);
    for (const pair of added) expect(removed).toContainEqual(pair);
    expect(raf.queue.length).toBe(0);
    m.app.stop(); m = null;                                  // idempotent
  });

  it('App.game is a read-only getter', async () => {
    m = await mount();
    const d = Object.getOwnPropertyDescriptor(App.prototype, 'game');
    expect(typeof d?.get).toBe('function'); expect(d?.set).toBeUndefined();
    expect(() => { (m!.app as unknown as { game: unknown }).game = null; }).toThrow();
  });
});

describe('App bank, overlays and saves', () => {
  it('Reset restores bank 100 and persists it', async () => {
    m = await mount();
    m.app.game.fireAt(0.5); m.step(0.1);
    expect(m.app.game.snapshot().bank).toBe(99);
    const before = m.app.game;
    m.q<HTMLButtonElement>('[data-a=reset]').click(); await flush();
    expect(m.app.game).not.toBe(before);
    expect(m.app.game.snapshot().bank).toBe(100);
    m.step(0.1); expect(m.q('[data-f=bank]').textContent).toBe('0100');
    vi.advanceTimersByTime(600);
    expect((await m.storage.load())?.perMachine.raijin?.bank).toBe(100);
  });

  it('buy-in overlay appears when the bank is empty with no balls in flight, and buyIn refills', async () => {
    m = await mount({ save: { firstRunDone: true, perMachine: { raijin: empty } } });
    m.step(0.1);
    expect(m.app.game.snapshot().needsBuyIn).toBe(true);
    const overlay = m.q('.pk-overlay.buy-in');
    expect(overlay.textContent).toContain('Out of balls');
    m.q<HTMLButtonElement>('[data-a=buyin]').click();
    expect(m.root.querySelector('.pk-overlay')).toBeNull();
    const s = m.app.game.snapshot();
    expect(s.bank).toBe(100); expect(s.buyIns).toBe(1); expect(s.needsBuyIn).toBe(false);
  });

  it('switching machines persists the previous save and loads the next', async () => {
    m = await mount({ save: { firstRunDone: true, perMachine: { 'big-wave': { ...empty, bank: 42 } } } });
    m.app.game.fireAt(0.5); m.step(0.1);
    const raijinGame = m.app.game;
    m.q<HTMLButtonElement>('.pk-tabs button[data-id=big-wave]').click(); await flush();
    expect(m.app.saveData.perMachine.raijin?.bank).toBe(99);
    expect(m.app.game).not.toBe(raijinGame);
    expect(m.app.game.snapshot().bank).toBe(42);
    expect(m.root.dataset.machine).toBe('big-wave');
    expect(m.q('.pk-tabs button[aria-selected=true]').getAttribute('data-id')).toBe('big-wave');
  });

  it('requestSwitch is a no-op for the current machine and during jackpot', async () => {
    m = await mount({ save: { firstRunDone: true } });
    const game = m.app.game;
    m.q<HTMLButtonElement>('.pk-tabs button[data-id=raijin]').click(); await flush();
    expect(m.app.game).toBe(game);
    const real = game.snapshot();
    const snap = vi.spyOn(game, 'snapshot').mockReturnValue({ ...real, phase: 'jackpot' });
    m.q<HTMLButtonElement>('.pk-tabs button[data-id=big-wave]').click();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2' }));
    await flush();
    expect(m.app.game).toBe(game); expect(m.root.dataset.machine).toBe('raijin');
    snap.mockRestore();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2' })); await flush();
    expect(m.root.dataset.machine).toBe('big-wave');
  });

  it('the first-run overlay is dismissed by the first launch and firstRunDone is saved', async () => {
    m = await mount();
    expect(m.q('.pk-overlay.first-run')).toBeTruthy();
    m.step(0.1);
    expect(m.root.querySelector('.pk-overlay.first-run')).toBeTruthy();   // idle frames do not dismiss it
    m.app.game.fireAt(0.5); m.step(0.1);
    expect(m.root.querySelector('.pk-overlay')).toBeNull();
    expect(m.app.saveData.firstRunDone).toBe(true);
    vi.advanceTimersByTime(600);
    expect((await m.storage.load())?.firstRunDone).toBe(true);
  });

  it('mute toggle persists (button and M key)', async () => {
    m = await mount({ save: { firstRunDone: true } });
    m.q<HTMLButtonElement>('[data-a=mute]').click();
    expect(m.app.synth.muted).toBe(true);
    vi.advanceTimersByTime(600);
    expect((await m.storage.load())?.mute).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM' }));
    expect(m.app.synth.muted).toBe(false);
    vi.advanceTimersByTime(600);
    expect((await m.storage.load())?.mute).toBe(false);
    m.step(0.1); expect(m.q('[data-a=mute]').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('App attract mode', () => {
  it('starts after 20 s idle, fires free balls (bank unchanged), stops on activity', async () => {
    m = await mount({ save: { firstRunDone: true } });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fire = vi.spyOn(m.app.game, 'fireAt');
    m.step(19);
    expect(fire).not.toHaveBeenCalled(); expect(m.root.querySelector('.pk-overlay')).toBeNull();
    m.step(2);
    expect(fire).toHaveBeenCalled();
    for (const call of fire.mock.calls) expect(call[1]).toBe(true);
    expect(m.app.game.snapshot().balls.length).toBeGreaterThan(0);
    expect(m.app.game.snapshot().bank).toBe(100);
    expect(m.root.querySelector('.pk-overlay.first-run')).toBeTruthy();   // attract re-shows the hint card
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' }));   // any activity
    expect(m.root.querySelector('.pk-overlay')).toBeNull();
    fire.mockClear();
    m.step(5);
    expect(fire).not.toHaveBeenCalled();
    expect(m.app.game.snapshot().bank).toBe(100);
  });
});

describe('App input', () => {
  it('swipe clamps at the ends of MACHINE_ORDER instead of wrapping', async () => {
    m = await mount({ save: { firstRunDone: true } });
    const tabs = m.q('.pk-tabs');
    const swipe = (dx: number) => { pointer(tabs, 'pointerdown', 100); pointer(tabs, 'pointermove', 100 + dx); pointer(tabs, 'pointerup', 100 + dx); };
    swipe(+80); await flush();                                // "previous" from the first machine: stays
    expect(m.root.dataset.machine).toBe('raijin');
    swipe(-80); await flush(); expect(m.root.dataset.machine).toBe('big-wave');
    swipe(-80); await flush(); expect(m.root.dataset.machine).toBe('hana-fan');
    swipe(-80); await flush();                                // "next" from the last machine: stays
    expect(m.root.dataset.machine).toBe('hana-fan');
    swipe(+80); await flush(); expect(m.root.dataset.machine).toBe('big-wave');
  });

  it('Dial restores the previous touch-action on destroy', async () => {
    const root = document.createElement('div'); document.body.appendChild(root);
    const app = new App({ root, storage: new MemoryStorage(), seed: 7 });
    const board = root.querySelector<HTMLElement>('.pk-board')!; board.style.touchAction = 'pan-y';
    await app.start();
    const dial = root.querySelector<HTMLElement>('.pk-dial')!;
    expect(dial.style.touchAction).toBe('none'); expect(board.style.touchAction).toBe('none');
    app.stop();
    expect(dial.style.touchAction).toBe(''); expect(board.style.touchAction).toBe('pan-y');
    root.remove();
  });
});

describe('loadCel', () => {
  it('does not cache a rejected promise', async () => {
    failingImages.add('data:cel-flaky');
    await expect(loadCel('data:cel-flaky', 10, 10, 1)).rejects.toThrow('cel failed');
    failingImages.delete('data:cel-flaky');
    await expect(loadCel('data:cel-flaky', 10, 10, 1)).resolves.toBeInstanceOf(HTMLCanvasElement);
  });
});
