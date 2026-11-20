// DOM-free clock. Time source is injectable; UI decides when to pause.
export const MAX_ELAPSED = 365 * 24 * 60 * 60 * 1000;
export class Clock {
  private carried: number;
  private started: number | null = null;
  constructor(elapsedMs = 0, private readonly now: () => number = () => performance.now()) { this.carried = elapsedMs; }
  resume(): void { if (this.started === null) this.started = this.now(); }
  pause(): void { this.carried = this.elapsed(); this.started = null; }
  elapsed(): number { return Math.min(MAX_ELAPSED, this.carried + (this.started === null ? 0 : Math.max(0, this.now() - this.started))); }
  reset(elapsedMs = 0): void { this.carried = elapsedMs; this.started = null; }
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
