import { Game } from './game';
import { MACHINES, type MachineId } from './machine';
import { BOARD_H, BOARD_W } from './board';
import { DT } from './physics';

export interface SoakResult {
  machine: MachineId; strength: number; balls: number; spent: number; returned: number; returnRate: number;
  maxInFlight: number; maxAge: number; nan: boolean; oob: boolean; jackpots: number;
  /** `catch` events per catcher id (jackpot attacker catches are not included). */
  catches: Record<string, number>;
}

export function stateHash(g: Game): string {
  const s = g.snapshot();
  const balls = s.balls.map(b => `${b.id}:${b.x.toFixed(6)},${b.y.toFixed(6)},${b.vx.toFixed(6)},${b.vy.toFixed(6)}`).join('|');
  return [s.phase, s.bank, s.sessionWon, s.time.toFixed(6), s.reachQueue, JSON.stringify(s.reach), JSON.stringify(s.jackpot), balls].join('#');
}

/** Fire `balls` free shots at fixed strength (one every 0.15 s), run until the board is empty, and report. */
export function runSoak(machineId: MachineId, opts: { balls: number; strength: number; seed: number; countJackpot?: boolean }): SoakResult {
  const g = new Game(MACHINES[machineId], opts.seed); // default bank; shots are free so it never empties and reaches can run
  let fired = 0, maxInFlight = 0, maxAge = 0, nan = false, oob = false, jackpots = 0, returned = 0;
  let fireClock = 0;
  const catches: Record<string, number> = {};
  const FIRE_EVERY = 0.15;
  const guard = Math.ceil((opts.balls * 2 + 60) / DT); // every ball exits within 30 s and at most 15 fly at once, so 2 s per ball bounds a healthy run
  for (let i = 0; i < guard; i++) {
    fireClock += DT;
    if (fired < opts.balls && fireClock >= FIRE_EVERY) { if (g.fireAt(opts.strength, true)) { fired++; fireClock = 0; } }
    const ev = g.step();
    for (const e of ev) {
      if (e.type === 'catch') { returned += e.payout; catches[e.catcherId] = (catches[e.catcherId] ?? 0) + 1; }
      if (e.type === 'attackerCatch' && opts.countJackpot) returned += e.payout;
      if (e.type === 'jackpotOpen') jackpots++;
    }
    const s = g.snapshot();
    if (s.balls.length > maxInFlight) maxInFlight = s.balls.length;
    for (const b of s.balls) {
      if (b.age > maxAge) maxAge = b.age;
      if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy)) nan = true;
      if (b.x < -10 || b.x > BOARD_W + 10 || b.y < -10 || b.y > BOARD_H + 40) oob = true;
    }
    if (fired >= opts.balls && s.balls.length === 0 && s.phase !== 'jackpot') break;
  }
  return { machine: machineId, strength: opts.strength, balls: fired, spent: fired, returned, returnRate: returned / Math.max(1, fired), maxInFlight, maxAge, nan, oob, jackpots, catches };
}
