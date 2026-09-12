import { Game, type GameEvent } from './core/game';
import { MACHINES, MACHINE_ORDER, type MachineId } from './core/machine';
import { Renderer } from './render/canvas';
import { THEMES } from './render/themes/index';
import { Dial } from './input/dial';
import { EMPTY_SAVE, type SaveData, type Storage } from './storage/types';
import { BOARD_W, BOARD_H } from './core/board';
import { Effects } from './render/effects';
import { Synth } from './audio/synth';
import { SOUND_SETS } from './audio/sets';

export interface AppOptions { root: HTMLElement; storage: Storage; machine?: MachineId; seed?: number }

export class App {
  game!: Game;
  private renderer!: Renderer;
  effects!: Effects;
  synth: Synth;
  private dial!: Dial;
  private canvas: HTMLCanvasElement;
  private boardEl: HTMLElement;
  private save: SaveData = structuredClone(EMPTY_SAVE);
  private raf = 0; private last = 0; private running = false;
  private saveTimer = 0;
  private ro: ResizeObserver | null = null;
  private machineId: MachineId;
  private seed: number;
  /** Subscribers get every game event each frame (effects, audio, panel). */
  readonly listeners: Array<(ev: GameEvent[], g: Game) => void> = [];
  readonly frameHooks: Array<(dt: number) => void> = [];

  constructor(private o: AppOptions) {
    this.machineId = o.machine ?? 'raijin';
    this.seed = o.seed ?? (Date.now() >>> 0);
    o.root.classList.add('pk-root');
    o.root.innerHTML = `<div class="pk-board"><canvas class="pk-canvas" aria-label="Pachinko board" role="img"></canvas></div>`;
    this.boardEl = o.root.querySelector('.pk-board')!;
    this.canvas = o.root.querySelector('.pk-canvas')!;
    this.synth = new Synth(SOUND_SETS[this.machineId]);
  }

  async start(): Promise<void> {
    this.save = (await this.o.storage.load()) ?? structuredClone(EMPTY_SAVE);
    await this.switchMachine(this.machineId);
    this.dial = new Dial(this.boardEl, { setHeld: h => this.game.setHeld(h), trim: d => this.game.trim(d) });
    this.dial.onActivity = () => this.synth.resume();
    this.synth.setMuted(this.save.mute);
    this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(this.boardEl); this.fit();
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.flushSave);
    this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false; cancelAnimationFrame(this.raf); this.dial?.destroy();
    this.synth.dispose();
    this.ro?.disconnect(); this.ro = null;
    document.removeEventListener('visibilitychange', this.onVisibility); window.removeEventListener('pagehide', this.flushSave);
    this.flushSave();
  }

  async switchMachine(id: MachineId): Promise<void> {
    if (this.game) this.persistGame();
    this.machineId = id;
    const m = MACHINES[id];
    this.game = new Game(m, this.seed ^ MACHINE_ORDER.indexOf(id), this.save.perMachine[id]);
    this.renderer = new Renderer(this.canvas, m, THEMES[id]);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.effects = new Effects(THEMES[id], m.layout, { reducedMotion: reduced });
    this.synth.setSet(SOUND_SETS[id]);
    this.o.root.dataset.machine = id;
    await this.renderer.ready;
    this.fit();
  }

  private fit(): void {
    const r = this.boardEl.getBoundingClientRect();
    const scale = Math.min(r.width / BOARD_W, r.height / BOARD_H);
    this.renderer.resize(Math.max(1, BOARD_W * scale), Math.max(1, BOARD_H * scale));
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const ev = this.game.tick(dt);
    for (const l of this.listeners) l(ev, this.game);
    for (const h of this.frameHooks) h(dt);
    this.effects.onEvents(ev, this.game.snapshot()); this.effects.update(dt); this.synth.onEvents(ev);
    this.renderer.draw(this.game.snapshot(), this.effects);
    if (ev.some(e => e.type === 'catch' || e.type === 'launch' || e.type === 'attackerCatch' || e.type === 'jackpotClose')) this.scheduleSave();
    this.raf = requestAnimationFrame(this.frame);
  };

  private onVisibility = () => {
    if (document.hidden) { this.running = false; cancelAnimationFrame(this.raf); this.flushSave(); }
    else if (!this.running) { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  };

  private persistGame(): void { this.save.perMachine[this.machineId] = this.game.save(); }
  private scheduleSave(): void { clearTimeout(this.saveTimer); this.saveTimer = window.setTimeout(this.flushSave, 500); }
  private flushSave = () => { clearTimeout(this.saveTimer); this.persistGame(); void this.o.storage.save(this.save); };
  get saveData(): SaveData { return this.save; }
  setSaveField<K extends keyof SaveData>(k: K, v: SaveData[K]): void { this.save[k] = v; this.scheduleSave(); }
}
