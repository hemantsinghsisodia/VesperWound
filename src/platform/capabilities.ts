export type BackendMode = 'auto' | 'webgl2' | 'webgpu-required';
export interface BootOptions { backend: BackendMode; missingFixture: boolean }

export function readBootOptions(development: boolean, search: string): BootOptions {
  if (!development) return { backend: 'auto', missingFixture: false };
  const params = new URLSearchParams(search);
  const requested = params.get('backend');
  return {
    backend: requested === 'webgl2' || requested === 'webgpu-required' ? requested : 'auto',
    missingFixture: params.get('fixture') === 'missing',
  };
}

export function defaultPreferences() {
  const mobile = matchMedia('(pointer: coarse)').matches && window.innerWidth < 1100;
  return {
    version: 1 as const, quality: mobile ? 'Mobile' as const : 'High' as const,
    adaptive: true, muted: false, volume: 0.55,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    uiScale: 1, leftHanded: false,
  };
}
