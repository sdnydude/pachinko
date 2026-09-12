export interface DialTarget { setHeld(held: boolean): void; trim(delta: number): void }

export class Dial {
  onActivity?: () => void;
  private pointerId: number | null = null;
  private lastY = 0;
  private trimPerPixel: number;
  private keyboard: boolean;
  private keyHeld = false;
  constructor(private zone: HTMLElement, private target: DialTarget, opts?: { trimPerPixel?: number; keyboard?: boolean }) {
    this.trimPerPixel = opts?.trimPerPixel ?? 1 / 150;
    this.keyboard = opts?.keyboard ?? true;
    zone.style.touchAction = 'none';
    zone.addEventListener('pointerdown', this.down);
    zone.addEventListener('pointermove', this.move);
    zone.addEventListener('pointerup', this.up); zone.addEventListener('pointercancel', this.up);
    if (this.keyboard) { window.addEventListener('keydown', this.key); window.addEventListener('keyup', this.key); }
  }
  private down = (e: PointerEvent) => { if (this.pointerId !== null) return; this.pointerId = e.pointerId; this.lastY = e.clientY; this.zone.setPointerCapture(e.pointerId); this.target.setHeld(true); this.onActivity?.(); };
  private move = (e: PointerEvent) => { if (e.pointerId !== this.pointerId) return; const dy = this.lastY - e.clientY; if (Math.abs(dy) >= 3) { this.target.trim(dy * this.trimPerPixel); this.lastY = e.clientY; } };
  private up = (e: PointerEvent) => { if (e.pointerId !== this.pointerId) return; this.pointerId = null; this.target.setHeld(false); };
  private key = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); const down = e.type === 'keydown'; if (down !== this.keyHeld) { this.keyHeld = down; this.target.setHeld(down); this.onActivity?.(); } }
    if (e.type === 'keydown' && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) { e.preventDefault(); this.target.trim(e.code === 'ArrowUp' ? 0.05 : -0.05); this.onActivity?.(); }
  };
  destroy() {
    this.zone.removeEventListener('pointerdown', this.down); this.zone.removeEventListener('pointermove', this.move);
    this.zone.removeEventListener('pointerup', this.up); this.zone.removeEventListener('pointercancel', this.up);
    if (this.keyboard) { window.removeEventListener('keydown', this.key); window.removeEventListener('keyup', this.key); }
  }
}
