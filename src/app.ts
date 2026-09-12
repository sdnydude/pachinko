import { Game } from './core/game';
import { MACHINES, MACHINE_ORDER, type MachineId } from './core/machine';
import { Renderer } from './render/canvas';
import { THEMES } from './render/themes/index';
import { Dial, ignoreKey } from './input/dial';
import { EMPTY_SAVE, type SaveData, type Storage } from './storage/types';
import { BOARD_W, BOARD_H } from './core/board';
import { Effects } from './render/effects';
import { Synth } from './audio/synth';
import { SOUND_SETS } from './audio/sets';
import { Panel } from './panel/panel';
import { ensureFonts } from './panel/fonts';
import './panel/panel.css';

export type { MachineId } from './core/machine';

export interface AppOptions { root: HTMLElement; storage: Storage; machine?: MachineId; seed?: number }

export class App {
  private _game!: Game;
  /** Read-only from outside: the app owns the Game's lifetime (switch/reset replace it). */
  get game(): Game { return this._game; }
  private renderer!: Renderer;
  effects!: Effects;
  synth: Synth;
  private dial!: Dial;
  private boardDial!: Dial;
  private canvas: HTMLCanvasElement;
  private boardEl: HTMLElement;
  private shellEl: HTMLElement;
  private save: SaveData = structuredClone(EMPTY_SAVE);
  private raf = 0; private last = 0; private running = false;
  private stopped = false;
  private saveTimer = 0;
  private ro: ResizeObserver | null = null;
  private machineId: MachineId;
  private seed: number;
  private panel!: Panel;
  private idleFor = 0; private attract = false;
  private overlay: HTMLElement | null = null;
  private debugEl: HTMLElement | null = null; private debugOn = false;
  private fps = 0; private fpsAcc = 0; private fpsN = 0;
  private reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private o: AppOptions) {
    this.machineId = o.machine ?? 'raijin';
    this.seed = o.seed ?? (Date.now() >>> 0);
    o.root.classList.add('pk-root');
    o.root.innerHTML = `<div class="pk-shell"><div class="pk-board"><canvas class="pk-canvas" aria-label="Pachinko board" role="img"></canvas></div></div>`;
    this.shellEl = o.root.querySelector('.pk-shell')!;
    this.boardEl = o.root.querySelector('.pk-board')!;
    this.canvas = o.root.querySelector('.pk-canvas')!;
    this.synth = new Synth(SOUND_SETS[this.machineId]);
  }

  async start(): Promise<void> {
    this.save = (await this.o.storage.load()) ?? structuredClone(EMPTY_SAVE);
    if (this.stopped) return;
    this.panel = new Panel(this.shellEl, {
      onSwitch: id => this.requestSwitch(id),
      onSwipe: dir => { const next = MACHINE_ORDER[MACHINE_ORDER.indexOf(this.machineId) + dir]; if (next) this.requestSwitch(next); },   // clamps at the ends, no wrap
      onMute: m => { this.synth.setMuted(m); this.setSaveField('mute', m); },
      onBuyIn: () => { this.game.buyIn(); this.closeOverlay(); },
      onReset: () => { this.save.perMachine[this.machineId] = undefined; void this.switchMachine(this.machineId, { reset: true }); this.scheduleSave(); },
    });
    await this.switchMachine(this.machineId);
    if (this.stopped) return;
    this.dial = new Dial(this.panel.dialEl, { setHeld: h => this.game.setHeld(h), trim: d => this.game.trim(d) });
    this.dial.onActivity = () => this.activity();
    this.boardDial = new Dial(this.boardEl, { setHeld: h => this.game.setHeld(h), trim: d => this.game.trim(d) }, { keyboard: false });
    this.boardDial.onActivity = () => this.activity();
    this.synth.setMuted(this.save.mute);
    this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(this.boardEl); this.fit();
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.flushSave);
    window.addEventListener('keydown', this.keys);
    this.reducedMq.addEventListener('change', this.onReducedMotion);
    if (!this.save.firstRunDone) this.showFirstRun();
    this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.stopped = true;
    this.running = false; cancelAnimationFrame(this.raf); this.dial?.destroy(); this.boardDial?.destroy();
    this.synth.dispose();
    this.ro?.disconnect(); this.ro = null;
    document.removeEventListener('visibilitychange', this.onVisibility); window.removeEventListener('pagehide', this.flushSave);
    window.removeEventListener('keydown', this.keys);
    this.reducedMq.removeEventListener('change', this.onReducedMotion);
    if (this.game) this.flushSave();
  }

  /**
   * Tabs, number keys and swipes all come through here; switching is ignored while the attacker is open and when the
   * machine is already selected (Space on a focused tab re-clicks it). Reset calls switchMachine directly.
   */
  private requestSwitch(id: MachineId): void {
    if (id === this.machineId || this.game.snapshot().phase === 'jackpot') return;
    void this.switchMachine(id);
  }

  async switchMachine(id: MachineId, opts?: { reset?: boolean }): Promise<void> {
    if (this.game && !opts?.reset) this.persistGame();
    this.machineId = id;
    const m = MACHINES[id];
    this._game = new Game(m, this.seed ^ MACHINE_ORDER.indexOf(id), this.save.perMachine[id]);
    this.renderer = new Renderer(this.canvas, m, THEMES[id]);
    this.effects = new Effects(THEMES[id], m.layout, { reducedMotion: this.reducedMq.matches });
    this.panel?.setTheme(THEMES[id], id); ensureFonts(THEMES[id]);
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
    const s = this.game.snapshot();
    this.effects.onEvents(ev, s); this.effects.update(dt); this.synth.onEvents(ev);
    this.renderer.draw(s, this.effects);
    this.panel.update(s, this.effects.lampPhase, this.effects.lampSpeed, this.synth.muted);
    this.idleFor += dt;
    if (!this.attract && this.idleFor > 20 && s.phase !== 'idle') this.startAttract();
    if (this.attract && s.phase !== 'idle' && Math.random() < dt * 1.6) this.game.fireAt(0.35 + Math.random() * 0.6, true);
    if (s.needsBuyIn && !this.overlay) this.showBuyIn(s.buyIns, s.sessionWon);
    if (ev.some(e => e.type === 'launch') && !this.attract && this.overlay?.classList.contains('first-run')) { this.closeOverlay(); this.setSaveField('firstRunDone', true); }
    if (this.debugOn) this.drawDebug(dt, s.balls.length, s.phase);
    if (ev.some(e => e.type === 'catch' || e.type === 'launch' || e.type === 'attackerCatch' || e.type === 'jackpotClose')) this.scheduleSave();
    this.raf = requestAnimationFrame(this.frame);
  };

  private keys = (e: KeyboardEvent) => {
    if (ignoreKey(e)) return;
    const idx = Number(e.key) - 1;
    if (Number.isInteger(idx) && MACHINE_ORDER[idx]) this.requestSwitch(MACHINE_ORDER[idx]);
    if (e.code === 'KeyM') { const m = !this.synth.muted; this.synth.setMuted(m); this.setSaveField('mute', m); }
    if (e.code === 'Backquote') { this.debugOn = !this.debugOn; this.debugEl?.remove(); this.debugEl = null; }
    this.activity();
  };
  private onReducedMotion = () => { this.effects.reduced = this.reducedMq.matches; };

  private activity(): void { this.idleFor = 0; this.synth.resume(); if (this.attract) { this.attract = false; if (this.overlay?.classList.contains('first-run') && this.save.firstRunDone) this.closeOverlay(); } }
  private startAttract(): void { if (this.overlay?.classList.contains('buy-in')) return; this.attract = true; if (!this.overlay) this.showFirstRun(); }
  private showFirstRun(): void {
    this.openOverlay('first-run', `<h2>${THEMES[this.machineId].name}</h2><p>Hold to shoot.<br>Drag up or down to aim.<br>Land the center pocket.</p>`);
  }
  private showBuyIn(buyIns: number, sessionWon: number): void {
    this.attract = false;
    const T = THEMES[this.machineId];
    this.openOverlay('buy-in', `<h2>Out of balls</h2><p>Session ${buyIns + 1} · Won ${sessionWon}</p><button data-a="buyin">${T.copy.buyIn}</button>`);
    this.overlay!.querySelector<HTMLButtonElement>('[data-a=buyin]')!.onclick = () => { this.game.buyIn(); this.closeOverlay(); this.activity(); };
  }
  private openOverlay(kind: string, html: string): void { this.closeOverlay(); const d = document.createElement('div'); d.className = `pk-overlay ${kind}`; d.innerHTML = `<div class="card">${html}</div>`; this.shellEl.appendChild(d); this.overlay = d; }
  private closeOverlay(): void { this.overlay?.remove(); this.overlay = null; }
  private drawDebug(dt: number, balls: number, phase: string): void {
    this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc >= 0.5) { this.fps = Math.round(this.fpsN / this.fpsAcc); this.fpsAcc = 0; this.fpsN = 0; }
    if (!this.debugEl) { this.debugEl = document.createElement('div'); this.debugEl.className = 'pk-debug'; this.shellEl.appendChild(this.debugEl); this.debugEl.onclick = () => void navigator.clipboard?.writeText(`${location.origin}${location.pathname}?seed=${this.seed}&m=${this.machineId}`).catch(() => {}); }
    this.debugEl.textContent = `fps ${this.fps}\nballs ${balls}\nphase ${phase}\nparticles ${this.effects.particleCount}\nseed ${this.seed} (click to copy link)`;
  }

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
