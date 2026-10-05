export class Lifetime {
  private cleanups: Array<() => void> = [];
  private disposed = false;
  get cleanupCount(): number { return this.cleanups.length; }

  own(cleanup: () => void): void {
    if (this.disposed) cleanup();
    else this.cleanups.push(cleanup);
  }

  listen<K extends keyof WindowEventMap>(
    target: Window, type: K, listener: (event: WindowEventMap[K]) => void,
  ): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void,
  ): void;
  listen(target: Window | HTMLElement, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.own(() => target.removeEventListener(type, listener));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.cleanups.reverse()) cleanup();
    this.cleanups = [];
  }
}
