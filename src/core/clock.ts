export class FixedClock {
  private lastTime: number | null = null;
  private accumulator = 0;
  readonly step = 1 / 60;
  overruns = 0;

  reset(): void { this.lastTime = null; this.accumulator = 0; }

  advance(nowMs: number, update: (dt: number) => void, timeScale = 1): number {
    if (this.lastTime === null) { this.lastTime = nowMs; return 0; }
    const elapsed = Math.min(Math.max(0, (nowMs - this.lastTime) / 1000), 0.25);
    this.lastTime = nowMs;
    this.accumulator += elapsed * timeScale;
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.step && steps < 5) {
      update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    if (this.accumulator >= this.step) {
      this.overruns++;
      this.accumulator %= this.step;
    }
    return Math.max(0, this.accumulator / this.step);
  }
}
