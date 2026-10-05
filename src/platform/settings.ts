import { isQualityName, type QualityName } from '../performance/quality';

export interface Preferences {
  version: 1;
  quality: QualityName;
  adaptive: boolean;
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  uiScale: number;
  leftHanded: boolean;
}
export interface PreferenceStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const STORAGE_KEY = 'vesperwound.preferences.v1';
const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function parsePreferences(raw: string | null, defaults: Preferences): Preferences {
  if (!raw) return { ...defaults };
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1) return { ...defaults };
    const record = value as Record<string, unknown>;
    return {
      version: 1,
      quality: isQualityName(record.quality) ? record.quality : defaults.quality,
      adaptive: typeof record.adaptive === 'boolean' ? record.adaptive : defaults.adaptive,
      muted: typeof record.muted === 'boolean' ? record.muted : defaults.muted,
      volume: bounded(record.volume, defaults.volume, 0, 1),
      reducedMotion: typeof record.reducedMotion === 'boolean' ? record.reducedMotion : defaults.reducedMotion,
      uiScale: bounded(record.uiScale, defaults.uiScale, 0.8, 1.4),
      leftHanded: typeof record.leftHanded === 'boolean' ? record.leftHanded : defaults.leftHanded,
    };
  } catch { return { ...defaults }; }
}

export class SettingsStore {
  readonly values: Preferences;
  persistent = true;
  constructor(private readonly storage: PreferenceStorage | null, defaults: Preferences) {
    let raw: string | null = null;
    try { raw = storage?.getItem(STORAGE_KEY) ?? null; }
    catch { this.persistent = false; }
    this.values = parsePreferences(raw, defaults);
    if (!storage) this.persistent = false;
  }
  update(values: Partial<Omit<Preferences, 'version'>>): void {
    Object.assign(this.values, values);
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.values));
      this.persistent = true;
    } catch { this.persistent = false; }
  }
}
