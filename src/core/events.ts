export class EventChannel<Events extends object> {
  private readonly target = new EventTarget();
  private readonly cleanups = new Set<() => void>();

  on<K extends keyof Events & string>(type: K, listener: (payload: Events[K]) => void): () => void {
    const handler = (event: Event) => listener((event as CustomEvent<Events[K]>).detail);
    const unsubscribe = () => {
      this.target.removeEventListener(type, handler);
      this.cleanups.delete(unsubscribe);
    };
    this.target.addEventListener(type, handler);
    this.cleanups.add(unsubscribe);
    return unsubscribe;
  }

  emit<K extends keyof Events & string>(type: K, payload: Events[K]): void {
    this.target.dispatchEvent(new CustomEvent(type, { detail: payload }));
  }

  get listenerCount(): number { return this.cleanups.size; }
  dispose(): void { for (const cleanup of this.cleanups) cleanup(); }
}
