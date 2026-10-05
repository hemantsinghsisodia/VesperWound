export interface AssetHandle<T> { value: T; release(): void }
interface Entry<T> { promise: Promise<T>; refs: number; value?: T; destroyed: boolean }

/** Pending loads are shared; a late completion after disposal is destroyed exactly once. */
export class ResourceCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private disposed = false;
  constructor(private readonly load: (id: string) => Promise<T>, private readonly destroy: (value: T) => void) {}

  async acquire(id: string): Promise<AssetHandle<T>> {
    if (this.disposed) throw new Error('Asset cache has been disposed.');
    let entry = this.entries.get(id);
    if (!entry) {
      entry = { refs: 0, destroyed: false, promise: Promise.resolve().then(() => this.load(id)) };
      this.entries.set(id, entry);
    }
    const owned = entry;
    owned.refs++;
    try {
      const value = await owned.promise;
      owned.value = value;
      if (this.disposed) {
        this.destroyEntry(owned);
        throw new Error('Asset load completed after disposal.');
      }
      let released = false;
      return { value, release: () => {
        if (released) return;
        released = true;
        owned.refs--;
        if (owned.refs === 0) {
          if (this.entries.get(id) === owned) this.entries.delete(id);
          this.destroyEntry(owned);
        }
      } };
    } catch (error) {
      owned.refs--;
      if (this.entries.get(id) === owned) this.entries.delete(id);
      throw error;
    }
  }

  private destroyEntry(entry: Entry<T>): void {
    if (!entry.destroyed && entry.value !== undefined) {
      entry.destroyed = true;
      this.destroy(entry.value);
    }
  }

  get size(): number { return this.entries.size; }
  get references(): number { return [...this.entries.values()].reduce((total, entry) => total + entry.refs, 0); }
  dispose(): void {
    this.disposed = true;
    for (const entry of this.entries.values()) this.destroyEntry(entry);
    this.entries.clear();
  }
}
