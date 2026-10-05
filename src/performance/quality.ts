export const QUALITY_NAMES = ['Mobile', 'Low', 'Medium', 'High', 'Ultra'] as const;
export type QualityName = typeof QUALITY_NAMES[number];
export interface QualityProfile {
  name: QualityName;
  maxWidth: number;
  maxHeight: number;
  pixelRatio: number;
  shadowSize: number;
  bloom: boolean;
  decoration: number;
  targetMs: number;
}
export const QUALITY_PROFILES: Record<QualityName, QualityProfile> = {
  Mobile: { name: 'Mobile', maxWidth: 1280, maxHeight: 720, pixelRatio: 1, shadowSize: 512, bloom: false, decoration: 0.35, targetMs: 1000 / 30 },
  Low: { name: 'Low', maxWidth: 1600, maxHeight: 900, pixelRatio: 1, shadowSize: 512, bloom: false, decoration: 0.55, targetMs: 1000 / 30 },
  Medium: { name: 'Medium', maxWidth: 1920, maxHeight: 1080, pixelRatio: 1.25, shadowSize: 1024, bloom: false, decoration: 0.75, targetMs: 1000 / 60 },
  High: { name: 'High', maxWidth: 1920, maxHeight: 1080, pixelRatio: 1.5, shadowSize: 1024, bloom: true, decoration: 1, targetMs: 1000 / 60 },
  Ultra: { name: 'Ultra', maxWidth: 2560, maxHeight: 1440, pixelRatio: 2, shadowSize: 2048, bloom: true, decoration: 1, targetMs: 1000 / 60 },
};

export function isQualityName(value: unknown): value is QualityName {
  return typeof value === 'string' && QUALITY_NAMES.some((name) => name === value);
}

export function effectivePixelRatio(profile: QualityProfile, width: number, height: number, dpr: number, scale: number): number {
  return Math.max(0.1, Math.min(dpr, profile.pixelRatio, profile.maxWidth / Math.max(width, 1), profile.maxHeight / Math.max(height, 1)) * scale);
}

export class QualityManager {
  resolutionScale = 1;
  private slowSince: number | null = null;
  private fastSince: number | null = null;
  private lastChange = -Infinity;
  private averageMs = 0;
  constructor(public selected: QualityName, public adaptive: boolean) {}
  get profile(): QualityProfile { return QUALITY_PROFILES[this.selected]; }

  select(name: QualityName): void {
    this.selected = name;
    this.resolutionScale = 1;
    this.resetObservation();
  }
  resetObservation(): void { this.slowSince = null; this.fastSince = null; this.averageMs = 0; }

  observe(frameMs: number, now: number): boolean {
    if (!this.adaptive || !Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) return false;
    this.averageMs = this.averageMs === 0 ? frameMs : this.averageMs * 0.95 + frameMs * 0.05;
    const slow = this.averageMs > this.profile.targetMs * 1.15;
    const fast = this.averageMs < this.profile.targetMs * 1.05;
    this.slowSince = slow ? this.slowSince ?? now : null;
    this.fastSince = fast ? this.fastSince ?? now : null;
    if (now - this.lastChange < 5000) return false;
    if (this.slowSince !== null && now - this.slowSince >= 5000 && this.resolutionScale > 0.65) {
      this.resolutionScale = Math.max(0.65, Math.round((this.resolutionScale - 0.1) * 100) / 100);
    } else if (this.fastSince !== null && now - this.fastSince >= 20000 && this.resolutionScale < 1) {
      this.resolutionScale = Math.min(1, Math.round((this.resolutionScale + 0.1) * 100) / 100);
    } else return false;
    this.lastChange = now;
    this.slowSince = this.fastSince = null;
    return true;
  }
}
