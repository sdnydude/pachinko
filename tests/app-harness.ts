/**
 * jsdom harness for App tests: stubs what jsdom lacks (ResizeObserver, matchMedia, rAF, AudioContext, canvas 2d,
 * Image loading) and drives frames with explicit timestamps through a manual rAF queue.
 */
import { vi } from 'vitest';
import { App, type AppOptions } from '../src/app';
import { MemoryStorage } from '../src/storage/memory';
import type { SaveData } from '../src/storage/types';

/** Minimal AudioContext: every node method is a no-op; connect() chains. */
export class FakeAudioContext {
  currentTime = 0; state = 'running'; destination = {};
  createOscillator() { return { type: 'sine', frequency: { value: 0 }, onended: null as null | (() => void), connect(n: unknown) { return n; }, disconnect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(n: unknown) { return n; }, disconnect() {} }; }
  resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
}

/** Canvas 2d stand-in: every property read is a no-op method returning the proxy (so gradients chain), every write succeeds. */
const ctxProxy: unknown = new Proxy({}, { get: () => () => ctxProxy, set: () => true });

/** Manual rAF queue: `pump(now)` runs whatever is queued with that timestamp. */
export const raf = {
  queue: [] as { id: number; cb: FrameRequestCallback }[], next: 1,
  pump(now: number): void { const q = this.queue; this.queue = []; for (const { cb } of q) cb(now); },
};

/** URLs whose Image load should fail (cel tests); everything else resolves synchronously on `src` set. */
export const failingImages = new Set<string>();

export function installDom(): void {
  raf.queue = []; raf.next = 1; failingImages.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const mq = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('matchMedia', mq); window.matchMedia = mq as unknown as typeof window.matchMedia;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = raf.next++; raf.queue.push({ id, cb }); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { raf.queue = raf.queue.filter(q => q.id !== id); });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  HTMLCanvasElement.prototype.getContext = (() => ctxProxy) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null; onerror: (() => void) | null = null;
    set src(v: string) { if (failingImages.has(v)) this.onerror?.(); else this.onload?.(); }
  });
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

export interface Mounted { app: App; root: HTMLElement; storage: MemoryStorage; step(seconds: number, frameMs?: number): void; q<T extends Element>(sel: string): T }

/** Build an App on a fresh root, optionally seeding storage, start it, and hand back a frame stepper. */
export async function mount(opts?: { save?: Partial<SaveData>; app?: Partial<Omit<AppOptions, 'root' | 'storage'>> }): Promise<Mounted> {
  const root = document.createElement('div'); document.body.appendChild(root);
  const storage = new MemoryStorage();
  if (opts?.save) await storage.save({ version: 1, mute: false, firstRunDone: false, perMachine: {}, ...opts.save });
  const app = new App({ root, storage, seed: 7, ...opts?.app });
  await app.start();
  let t = performance.now();
  return {
    app, root, storage,
    step(seconds, frameMs = 50) { for (let e = 0; e < seconds * 1000 - 1e-6; e += frameMs) { t += frameMs; raf.pump(t); } },
    q<T extends Element>(sel: string) { const el = root.querySelector<T>(sel); if (!el) throw new Error(`missing ${sel}`); return el; },
  };
}

/** Settle promise chains (start/switchMachine await storage and the cel). */
export async function flush(n = 5): Promise<void> { for (let i = 0; i < n; i++) await Promise.resolve(); }

/** Pointer events for the swipe zones: jsdom may lack PointerEvent, so a MouseEvent carries pointerId. */
export function pointer(el: Element, type: string, clientX: number, pointerId = 1): void {
  const e = new MouseEvent(type, { bubbles: true, clientX, clientY: 10 });
  Object.defineProperty(e, 'pointerId', { value: pointerId });
  el.dispatchEvent(e);
}
