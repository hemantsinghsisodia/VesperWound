import type { PlayerState } from '../player/player-simulation';
import type { CombatantState } from '../player/combat-definitions';
export interface FrameStatistics {
  backend: string; quality: string; resolution: string; frameMs: number; cpuMs: number;
  fps: number; p95: number; draws: number; triangles: number; textures: number;
  estimatedGpuBytes: number; resources: number; references: number; voices: number;
  overruns: number; fixtureLoads: number;
  markerX: number; markerZ: number; listeners: number; audioState: string;
  scene: string; variant: string; animation: string; camera: string; artLoading: boolean;
  characterTier: string; inspection: string; inspectionPaused: boolean;
  rig?: { feet: number[][]; gripDistances: number[] };
  player?: PlayerState;
  targets?: CombatantState[];
}
export class FrameMetrics {
  private readonly frames: number[] = [];
  private readonly recent: number[] = [];
  private last: number | null = null;
  frameMs = 0;
  cpuMs = 0;
  framesMeasured = 0;
  record(now: number, cpuMs: number): void {
    this.cpuMs = cpuMs;
    if (this.last !== null) {
      this.frameMs = now - this.last;
      if (this.frameMs > 0) {
        this.frames.push(this.frameMs);
        if (this.frames.length > 180000) this.frames.shift();
        this.recent.push(this.frameMs);
        if (this.recent.length > 120) this.recent.shift();
        this.framesMeasured++;
      }
    }
    this.last = now;
  }
  resetTiming(): void { this.last = null; this.recent.length = 0; }
  resetMeasurements(): void { this.resetTiming(); this.frames.length = 0; this.framesMeasured = 0; }
  get fps(): number { return this.recent.length ? 1000 / (this.recent.reduce((a, b) => a + b, 0) / this.recent.length) : 0; }
  get p95(): number { return this.percentile(this.recent); }
  private percentile(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length * 0.95)] ?? 0; }
  export(): object {
    const total = this.frames.reduce((sum, value) => sum + value, 0);
    return { framesMeasured: this.framesMeasured, samplesRetained: this.frames.length, meanFps: total ? this.frames.length * 1000 / total : 0, p95FrameMs: this.percentile(this.frames), maxFrameMs: this.frames.reduce((max, value) => Math.max(max, value), 0), framesAbove100ms: this.frames.filter((value) => value > 100).length };
  }
}
