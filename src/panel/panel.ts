import type { Snapshot } from '../core/game';
import { MACHINES, MACHINE_ORDER, type MachineId } from '../core/machine';
import type { Theme } from '../render/theme';
import { THEMES } from '../render/themes/index';

export interface PanelCallbacks { onSwitch(id: MachineId): void; onSwipe(dir: -1 | 1): void; onMute(m: boolean): void; onBuyIn(): void; onReset(): void }

const LAMPS = 40;
const SWIPE_PX = 40;
/** Tiny cabinet silhouette for a machine tab: rounded cabinet in the theme wall color, lighter board rect in its panel accent. */
const cabinet = (t: Theme) => `<svg class="cab" viewBox="0 0 18 24" width="18" height="24" aria-hidden="true"><rect x="1" y="1" width="16" height="22" rx="3" fill="${t.palette.wall}" stroke="${t.palette.panelAccent}" stroke-width="1.5"/><rect x="4" y="4" width="10" height="12" rx="1.5" fill="${t.palette.panelAccent}"/><rect x="5" y="19" width="8" height="2" rx="1" fill="${t.palette.panelAccent}" opacity=".7"/></svg>`;

export class Panel {
  readonly dialEl: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private tabs: HTMLButtonElement[];
  private theme!: Theme;
  private lastAnnounce = '';
  private lastBank = -1;
  constructor(private root: HTMLElement, private cb: PanelCallbacks) {
    root.insertAdjacentHTML('afterbegin', `<div class="pk-marquee" aria-hidden="true">${'<span class="lamp"></span>'.repeat(LAMPS)}</div>`);
    root.insertAdjacentHTML('beforeend', `
      <div class="pk-panel">
        <div class="pk-tabs" role="tablist" aria-label="Machine">${MACHINE_ORDER.map(id => `<button role="tab" data-id="${id}" aria-selected="false" title="${MACHINES[id].name}">${cabinet(THEMES[id])}<span>${THEMES[id].shortName}</span></button>`).join('')}</div>
        <div class="pk-strip">
          <div class="pk-reels" aria-hidden="true"><span class="reel">7</span><span class="reel">7</span><span class="reel">7</span></div>
          <div class="pk-bank"><div class="pk-label">Bank</div><div class="pk-num" data-f="bank">0</div></div>
          <div class="pk-best"><div class="pk-label">Best</div><div class="pk-num" data-f="best">0</div></div>
        </div>
        <div class="pk-status" data-f="status"></div>
        <div class="pk-dial" role="slider" aria-label="Launch dial" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0" style="--strength:0"><div class="arc"></div><div class="knob"></div><div class="hint">HOLD TO SHOOT</div></div>
        <div class="pk-tools"><button data-a="mute" aria-pressed="false">Sound</button><button data-a="reset">Reset</button></div>
      </div>
      <div class="pk-live" aria-live="polite" data-f="live"></div>`);
    this.dialEl = root.querySelector('.pk-dial')!;
    this.tabs = [...root.querySelectorAll<HTMLButtonElement>('.pk-tabs button')];
    for (const b of this.tabs) b.onclick = () => { if (b.getAttribute('aria-disabled') !== 'true') cb.onSwitch(b.dataset.id as MachineId); };
    this.el.mute = root.querySelector('[data-a=mute]')!;
    this.el.mute.onclick = (e) => { const b = e.currentTarget as HTMLButtonElement; const m = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(m)); cb.onMute(m); };
    root.querySelector<HTMLButtonElement>('[data-a=reset]')!.onclick = () => cb.onReset();
    for (const e of root.querySelectorAll<HTMLElement>('[data-f]')) this.el[e.dataset.f!] = e;
    this.el.reels = root.querySelector('.pk-reels')!;
    this.el.marquee = root.querySelector('.pk-marquee')!;
    this.el.tabs = root.querySelector('.pk-tabs')!;
    this.el.strip = root.querySelector('.pk-strip')!;
    this.swipe(this.el.tabs); this.swipe(this.el.strip);
  }

  /** Horizontal drag of SWIPE_PX or more on a row switches machine; capturing the pointer keeps the tab underneath from also clicking. */
  private swipe(zone: HTMLElement): void {
    let id: number | null = null, x0 = 0;
    zone.addEventListener('pointerdown', e => { id = e.pointerId; x0 = e.clientX; });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) < SWIPE_PX) return;
      id = null; zone.setPointerCapture(e.pointerId);
      if (this.el.tabs!.firstElementChild?.getAttribute('aria-disabled') !== 'true') this.cb.onSwipe(dx < 0 ? 1 : -1);
    });
    const end = (e: PointerEvent) => { if (e.pointerId === id) id = null; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  }

  setTheme(theme: Theme, id: MachineId): void {
    this.theme = theme; const P = theme.palette;
    // Vars go on .pk-root (this.root's parent, the shell's host), not the shell itself: .pk-root's
    // own background/color rule reads them, and overlays appended into the shell still inherit.
    const s = (this.root.parentElement ?? this.root).style;
    s.setProperty('--pk-accent', P.panelAccent); s.setProperty('--pk-panel-bg', P.panelBg); s.setProperty('--pk-panel-fg', P.panelFg);
    s.setProperty('--pk-wall', P.wall); s.setProperty('--pk-display', theme.fonts.display); s.setProperty('--pk-body', theme.fonts.body);
    for (const b of this.tabs) b.setAttribute('aria-selected', String(b.dataset.id === id));
    this.el.marquee!.querySelectorAll<HTMLElement>('.lamp').forEach((l, i) => l.style.setProperty('--lamp', P.lamps[i % P.lamps.length]!));
  }

  update(s: Snapshot, lampPhase: number, lampSpeed: string, muted: boolean): void {
    const reels = this.el.reels!.children;
    for (let i = 0; i < 3; i++) { const r = reels[i] as HTMLElement; r.textContent = String(s.reelDigits[i]); r.className = `reel${s.reelSpinning[i] ? ' spin' : ''}${!s.reelSpinning[i] && s.reelDigits[i] === 7 ? ' hit' : ''}`; }
    this.el.reels!.classList.toggle('reach', s.phase === 'reach');
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
    this.el.mute!.setAttribute('aria-pressed', String(muted));
    const locked = String(s.phase === 'jackpot');
    for (const b of this.tabs) if (b.getAttribute('aria-disabled') !== locked) b.setAttribute('aria-disabled', locked);
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
