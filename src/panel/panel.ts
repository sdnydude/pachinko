import type { Snapshot } from '../core/game';
import { MACHINES, MACHINE_ORDER, type MachineId } from '../core/machine';
import type { Theme } from '../render/theme';

export interface PanelCallbacks { onSwitch(id: MachineId): void; onMute(m: boolean): void; onBuyIn(): void; onReset(): void }

const LAMPS = 40;
export class Panel {
  readonly dialEl: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private theme!: Theme;
  private lastAnnounce = '';
  private lastBank = -1;
  constructor(private root: HTMLElement, private cb: PanelCallbacks) {
    root.insertAdjacentHTML('afterbegin', `<div class="pk-marquee" aria-hidden="true">${'<span class="lamp"></span>'.repeat(LAMPS)}</div>`);
    root.insertAdjacentHTML('beforeend', `
      <div class="pk-panel">
        <div class="pk-tabs" role="tablist" aria-label="Machine">${MACHINE_ORDER.map(id => `<button role="tab" data-id="${id}" aria-pressed="false">${MACHINES[id].name}</button>`).join('')}</div>
        <div class="pk-reels" aria-hidden="true"><span class="reel">7</span><span class="reel">7</span><span class="reel">7</span></div>
        <div class="pk-bank"><div class="pk-label">Bank</div><div class="pk-num" data-f="bank">0</div></div>
        <div class="pk-best"><div class="pk-label">Best</div><div class="pk-num" data-f="best">0</div></div>
        <div class="pk-status" data-f="status"></div>
        <div class="pk-dial" role="slider" aria-label="Launch dial" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0" style="--strength:0"><div class="arc"></div><div class="knob"></div><div class="hint">HOLD TO SHOOT</div></div>
        <div class="pk-tools"><button data-a="mute" aria-pressed="false">Sound</button><button data-a="reset">Reset</button></div>
      </div>
      <div class="pk-live" aria-live="polite" data-f="live"></div>`);
    this.dialEl = root.querySelector('.pk-dial')!;
    for (const b of root.querySelectorAll<HTMLButtonElement>('.pk-tabs button')) b.onclick = () => cb.onSwitch(b.dataset.id as MachineId);
    root.querySelector<HTMLButtonElement>('[data-a=mute]')!.onclick = (e) => { const b = e.currentTarget as HTMLButtonElement; const m = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(m)); cb.onMute(m); };
    root.querySelector<HTMLButtonElement>('[data-a=reset]')!.onclick = () => cb.onReset();
    for (const e of root.querySelectorAll<HTMLElement>('[data-f]')) this.el[e.dataset.f!] = e;
    this.el.reels = root.querySelector('.pk-reels')!;
    this.el.marquee = root.querySelector('.pk-marquee')!;
  }

  setTheme(theme: Theme, id: MachineId): void {
    this.theme = theme; const P = theme.palette; const s = this.root.style;
    s.setProperty('--pk-accent', P.panelAccent); s.setProperty('--pk-panel-bg', P.panelBg); s.setProperty('--pk-panel-fg', P.panelFg);
    s.setProperty('--pk-wall', P.wall); s.setProperty('--pk-display', theme.fonts.display); s.setProperty('--pk-body', theme.fonts.body);
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('.pk-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    this.el.marquee!.querySelectorAll<HTMLElement>('.lamp').forEach((l, i) => l.style.setProperty('--lamp', P.lamps[i % P.lamps.length]!));
  }

  update(s: Snapshot, lampPhase: number, lampSpeed: string, muted: boolean): void {
    const reels = this.el.reels!.children;
    for (let i = 0; i < 3; i++) { const r = reels[i] as HTMLElement; r.textContent = String(s.reelDigits[i]); r.className = `reel${s.reelSpinning[i] ? ' spin' : ''}${!s.reelSpinning[i] && s.reelDigits[i] === 7 ? ' hit' : ''}`; }
    this.el.bank!.textContent = String(s.bank).padStart(4, '0');
    this.el.best!.textContent = String(s.bestSession).padStart(4, '0');
    let status = '';
    if (s.phase === 'reach') status = `<span class="hot">${this.theme.copy.reach}</span>${s.reach?.tension ? ' !!' : ''}`;
    else if (s.phase === 'jackpot' && s.jackpot) { const T = MACHINES[this.theme.id].tuning; status = `<span class="hot">${this.theme.copy.jackpot}</span><br>${Math.max(0, T.jackpotSeconds - s.jackpot.t).toFixed(0)}s · ${s.jackpot.caught}/${T.jackpotBalls}${s.rightShoot ? `<br><span class="hot">${this.theme.copy.rightShoot}</span>` : ''}`; }
    else status = `Ready`;
    if (s.reachQueue > 0) status += `<br>REACH ×${s.reachQueue} queued`;
    if (this.el.status!.innerHTML !== status) this.el.status!.innerHTML = status;
    this.dialEl.style.setProperty('--strength', s.dial.strength.toFixed(3));
    this.dialEl.setAttribute('aria-valuenow', String(Math.round(s.dial.strength * 100)));
    this.root.querySelector('[data-a=mute]')!.setAttribute('aria-pressed', String(muted));
    // lamps
    const lamps = this.el.marquee!.children; const step = lampSpeed === 'rainbow' ? 1 : 4;
    const on = Math.floor(lampPhase * 8);
    for (let i = 0; i < lamps.length; i++) (lamps[i] as HTMLElement).classList.toggle('on', lampSpeed === 'rainbow' ? ((i + on) % 3 === 0) : ((i + on) % step === 0));
    // live region
    let msg = '';
    if (s.phase === 'jackpot' && this.lastAnnounce !== 'jackpot') msg = 'Jackpot. Attacker open.';
    else if (s.phase === 'reach' && this.lastAnnounce !== 'reach') msg = 'Reach. Reels spinning.';
    else if (s.phase === 'playing' && this.lastAnnounce === 'jackpot') msg = `Jackpot closed. Bank ${s.bank}.`;
    else if (s.bank !== this.lastBank && this.lastBank >= 0 && Math.abs(s.bank - this.lastBank) >= 5 && s.phase === 'playing') msg = `Bank ${s.bank}.`;
    if (msg) { this.el.live!.textContent = msg; this.lastBank = s.bank; }
    if (this.lastBank < 0) this.lastBank = s.bank;
    this.lastAnnounce = s.phase;
  }
}
