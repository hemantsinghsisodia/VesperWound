import type { AssetHandle } from './resource-cache';
export type SectionStatus = 'closed' | 'loading' | 'ready' | 'failed';
export interface SectionLease { readonly ready: Promise<void>; release(): void }

/** One optional section lease, with hysteresis and ownership of late results. */
export class SectionStream<T> {
  status: SectionStatus = 'closed';
  error = '';
  private generation = 0;
  private handle: AssetHandle<T> | null = null;
  private warm: AssetHandle<T> | null = null;
  private pending: Promise<void> | null = null;
  private disposed = false;
  private pins = 0;
  private lastZ = 0;
  get value(): T | null { return this.handle?.value ?? null; }
  constructor(private readonly load: () => Promise<AssetHandle<T>>, private readonly attach: (value: T) => void, private readonly detach: (value: T) => void, private readonly retainWarm = false) {}
  update(z: number): void {
    this.lastZ = z;
    if (this.disposed) return;
    if (z < 1.5 && this.pins === 0) this.release();
    else if (z > 5.5 && this.status === 'closed') void this.prepare().catch(() => { /* Explicit retry keeps errors visible. */ });
  }
  /** A mission owns readiness independently of the player's streaming position. */
  acquire(): SectionLease {
    this.pins++;
    let released = false;
    return { ready: this.prepare(), release: () => {
      if (released) return;
      released = true; this.pins--;
      if (!this.disposed && this.pins === 0 && this.lastZ < 5.5) this.release();
    } };
  }
  async prepare(): Promise<void> {
    if (this.disposed) throw new Error('Section disposed');
    if (this.status === 'ready') return;
    if (this.pending) return this.pending;
    if (this.warm) {
      const handle = this.warm; this.warm = null;
      try { this.attach(handle.value); this.handle = handle; this.status = 'ready'; return; }
      catch (error) { this.detach(handle.value); handle.release(); this.status = 'failed'; this.error = error instanceof Error ? error.message : String(error); throw error; }
    }
    const generation = ++this.generation;
    this.status = 'loading'; this.error = '';
    const pending = this.load().then(handle => {
      if (this.disposed || this.generation !== generation) { handle.release(); return; }
      try { this.attach(handle.value); this.handle = handle; this.status = 'ready'; }
      catch (error) { this.detach(handle.value); handle.release(); throw error; }
    }).catch((error: unknown) => {
      if (!this.disposed && this.generation === generation) { this.status = 'failed'; this.error = error instanceof Error ? error.message : String(error); }
      throw error;
    }).finally(() => { if (this.generation === generation) this.pending = null; });
    this.pending = pending;
    return pending;
  }
  retry(): void { if (this.status === 'failed') void this.prepare().catch(() => {}); }
  private release(): void {
    if (this.status === 'closed') return;
    this.generation++; this.pending = null;
    if (this.handle) {
      this.detach(this.handle.value);
      if (this.retainWarm && !this.disposed) this.warm = this.handle; else this.handle.release();
      this.handle = null;
    }
    this.status = 'closed'; this.error = '';
  }
  dispose(): void { this.disposed = true; this.release(); this.warm?.release(); this.warm = null; }
}
