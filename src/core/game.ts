import { mulberry32, type Rng } from './rng';
import type { Machine } from './machine';
import { stepBall, catcherHit, exited, DT, type Ball, type ContactEvent } from './physics';
import type { Catcher, CatcherKind } from './board';

export const MAX_BALLS = 15;
export const START_BANK = 100;
export const RAMP_SECONDS = 1.2;
export const AUTOFIRE_SECONDS = 0.6;
export const REACH_QUEUE_MAX = 4;
export const REEL_STOP: [number, number, number] = [2.0, 2.4, 2.8];
export const REEL_TENSION = 1.0;
export const MISS_HOLD = 0.5;
export const MAX_FRAME = 0.1;
export const DT_STEPS = (seconds: number) => Math.floor(seconds / DT + 1e-9);

export type Phase = 'idle' | 'playing' | 'reach' | 'jackpot';
export interface ReachState { t: number; digits: [number, number, number]; win: boolean; tension: boolean; stopAt: [number, number, number]; stopped: [boolean, boolean, boolean] }
export interface JackpotState { t: number; caught: number; total: number }
export interface GameSave { bank: number; bestSession: number; biggestJackpot: number }
export interface Snapshot {
  phase: Phase; bank: number; sessionWon: number; bestSession: number; biggestJackpot: number; seed: number; time: number;
  balls: readonly Ball[]; tulipOpen: Readonly<Record<string, boolean>>; windmillSpin: readonly number[];
  dial: { held: boolean; strength: number }; reach: ReachState | null; jackpot: JackpotState | null; reachQueue: number;
  attackerOpen: boolean; rightShoot: boolean; reelDigits: [number, number, number]; reelSpinning: [boolean, boolean, boolean];
  needsBuyIn: boolean; buyIns: number;
}
export type GameEvent =
  | { type: 'launch'; strength: number }
  | { type: 'pin'; index: number; x: number; y: number; speed: number }
  | { type: 'windmill'; index: number; x: number; y: number }
  | { type: 'wall'; x: number; y: number; speed: number }
  | { type: 'catch'; catcherId: string; kind: CatcherKind; payout: number; x: number; y: number }
  | { type: 'tulip'; catcherId: string; open: boolean }
  | { type: 'reachStart' } | { type: 'reelStop'; reel: 0 | 1 | 2; digit: number; tension: boolean } | { type: 'reachMiss' }
  | { type: 'jackpotOpen' } | { type: 'attackerCatch'; payout: number; caught: number; x: number; y: number } | { type: 'jackpotClose'; total: number }
  | { type: 'bankEmpty' };

export class Game {
  readonly machine: Machine;
  readonly seed: number;
  private rng: Rng;
  private phase: Phase = 'playing';
  private bank: number;
  private sessionWon = 0;
  private bestSession: number;
  private biggestJackpot: number;
  private buyIns = 0;
  private time = 0;
  private acc = 0;
  private balls: Ball[] = [];
  private nextBallId = 1;
  private tulipOpen: Record<string, boolean> = {};
  private windmillSpin: number[];
  private held = false;
  private strength = 0;
  private trimmed = false;
  private fireTimer = 0;
  private holdFired = 0;
  private reach: ReachState | null = null;
  private reachQueue = 0;
  private jackpot: JackpotState | null = null;
  private contacts: ContactEvent[] = [];

  constructor(machine: Machine, seed: number, save?: GameSave, opts?: { rng?: Rng }) {
    this.machine = machine; this.seed = seed;
    this.rng = opts?.rng ?? mulberry32(seed);
    this.bank = save?.bank ?? START_BANK;
    this.bestSession = save?.bestSession ?? 0;
    this.biggestJackpot = save?.biggestJackpot ?? 0;
    this.windmillSpin = machine.layout.windmills.map(() => 0);
    for (const c of machine.layout.catchers) if (c.tulip) this.tulipOpen[c.id] = false;
  }

  // ---- input ----
  setHeld(held: boolean): void {
    if (held === this.held) return;
    this.held = held;
    if (held) { this.strength = 0; this.trimmed = false; this.fireTimer = AUTOFIRE_SECONDS; this.holdFired = 0; }
    else if (this.holdFired === 0) { this.fireAt(this.strength); }
  }
  trim(delta: number): void {
    this.strength = Math.min(1, Math.max(0.05, this.strength + delta));
    this.trimmed = true;
  }
  buyIn(): void { this.bank += START_BANK; this.buyIns++; if (this.phase === 'idle') this.phase = 'playing'; }

  /** Spawn a ball at the rail exit. Returns false if at cap or (when not free) bank is empty. */
  fireAt(strength: number, free = false): boolean {
    if (this.balls.length >= MAX_BALLS) return false;
    if (!free) { if (this.bank <= 0) return false; this.bank--; }
    const j = 1 + this.rng.range(-0.02, 0.02);
    const { x, y } = this.machine.layout.launch;
    this.balls.push({ id: this.nextBallId++, x, y, px: x, py: y, vx: (120 + strength * 520) * j, vy: -(60 + strength * 80) * j, age: 0 });
    this.pending.push({ type: 'launch', strength });
    return true;
  }
  private pending: GameEvent[] = [];

  // ---- time ----
  tick(dtSeconds: number): GameEvent[] {
    this.acc += Math.min(dtSeconds, MAX_FRAME);
    const out: GameEvent[] = [];
    while (this.acc >= DT - 1e-9) { out.push(...this.step()); this.acc -= DT; }
    return out;
  }

  step(): GameEvent[] {
    const ev: GameEvent[] = this.pending; this.pending = [];
    this.time += DT;
    this.stepDial(ev);
    this.stepBalls(ev);
    this.stepPhase(ev);
    this.checkBankEmpty(ev);
    return ev;
  }

  private stepDial(ev: GameEvent[]): void {
    if (!this.held) return;
    if (!this.trimmed && this.strength < 1) this.strength = Math.min(1, this.strength + DT / RAMP_SECONDS);
    if (this.strength >= 1 || this.trimmed) {
      this.fireTimer += DT;
      if (this.fireTimer >= AUTOFIRE_SECONDS - 1e-9) {
        if (this.fireAt(this.strength)) { this.holdFired++; this.fireTimer = 0; ev.push(...this.pending); this.pending = []; }
      }
    }
  }

  private stepBalls(ev: GameEvent[]): void {
    const L = this.machine.layout;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i]!;
      this.contacts.length = 0;
      stepBall(b, L, DT, this.contacts);
      for (const c of this.contacts) {
        if (c.type === 'pin') ev.push({ type: 'pin', index: c.index, x: c.x, y: c.y, speed: c.speed });
        else if (c.type === 'windmill') { this.windmillSpin[c.index] = b.vx >= 0 ? 12 : -12; ev.push({ type: 'windmill', index: c.index, x: c.x, y: c.y }); }
        else ev.push({ type: 'wall', x: c.x, y: c.y, speed: c.speed });
      }
      if (this.tryCatch(b, ev) || exited(b)) this.balls.splice(i, 1);
    }
    for (let i = 0; i < this.windmillSpin.length; i++) this.windmillSpin[i]! *= 1 - 1.5 * DT;
  }

  // Filled in Task 6. For now: no catchers, no phase changes.
  private tryCatch(_b: Ball, _ev: GameEvent[]): boolean { return false; }
  private stepPhase(_ev: GameEvent[]): void {}

  private checkBankEmpty(ev: GameEvent[]): void {
    if (this.phase === 'playing' && this.bank <= 0 && this.balls.length === 0 && this.reachQueue === 0) {
      this.phase = 'idle'; ev.push({ type: 'bankEmpty' });
    }
  }

  // ---- read ----
  snapshot(): Snapshot {
    const spinning: [boolean, boolean, boolean] = this.reach ? [!this.reach.stopped[0], !this.reach.stopped[1], !this.reach.stopped[2]] : [false, false, false];
    const spinDigit = (i: number) => Math.floor(this.time * 20 + i * 3) % 10;
    const digits: [number, number, number] = [0, 1, 2].map(i => this.reach ? (this.reach.stopped[i] ? this.reach.digits[i] : spinDigit(i)) : (this.lastDigits[i] ?? 7)) as [number, number, number];
    return {
      phase: this.phase, bank: this.bank, sessionWon: this.sessionWon, bestSession: this.bestSession, biggestJackpot: this.biggestJackpot,
      seed: this.seed, time: this.time, balls: this.balls, tulipOpen: this.tulipOpen, windmillSpin: this.windmillSpin,
      dial: { held: this.held, strength: this.strength }, reach: this.reach, jackpot: this.jackpot, reachQueue: this.reachQueue,
      attackerOpen: this.phase === 'jackpot', rightShoot: this.phase === 'jackpot' && this.machine.attackerSide === 'right',
      reelDigits: digits, reelSpinning: spinning, needsBuyIn: this.phase === 'idle', buyIns: this.buyIns,
    };
  }
  private lastDigits: [number, number, number] = [7, 7, 7];

  save(): GameSave { return { bank: this.bank, bestSession: this.bestSession, biggestJackpot: this.biggestJackpot }; }
}
