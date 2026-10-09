import { Lifetime } from '../core/lifetime';
import type { FrameStatistics } from '../performance/metrics';

export interface DebugActions {
  snapshot(): FrameStatistics;
  reloadFixture(): Promise<void>;
  exportMetrics(): object;
  resetMetrics(): void;
  timeScale(value: number): void;
  encounter(count: number): void;
}
export interface DevelopmentApi {
  snapshot(): FrameStatistics;
  reloadFixture(): Promise<void>;
  exportMetrics(): object;
  resetMetrics(): void;
  encounter(count: number): void;
}
declare global { interface Window { __VESPER_DEBUG__?: DevelopmentApi } }

export function mountDebug(root: HTMLElement, actions: DebugActions): { update(stats: FrameStatistics): void; dispose(): void } {
  const lifetime = new Lifetime();
  const toggle = document.createElement('button'); toggle.className = 'debug-toggle'; toggle.textContent = 'DIAGNOSTICS · F3';
  const panel = document.createElement('aside'); panel.className = 'debug-panel'; panel.hidden = true;
  panel.innerHTML = '<h3>PHASE 4A / DEVELOPMENT</h3><pre></pre><button data-action="reload">Reload fixture</button><button data-action="export">Export metrics</button><label>Time scale<select><option value="1">1×</option><option value="0.5">0.5×</option><option value="0">Pause</option><option value="2">2×</option></select></label><p>Player capsule / static collision: Rapier. Enemy AI: shared ground navigation and pooled discs. Streaming awaits later phases. GPU time: unavailable unless measured externally.</p>';
  root.append(toggle, panel);
  const show = () => { panel.hidden = !panel.hidden; };
  lifetime.listen(toggle, 'click', show);
  lifetime.listen(window, 'keydown', (event) => { if (event.code === 'F3') { event.preventDefault(); show(); } });
  const reload = panel.querySelector<HTMLButtonElement>('[data-action=reload]');
  if (reload) lifetime.listen(reload, 'click', () => { reload.disabled = true; void actions.reloadFixture().finally(() => { reload.disabled = false; }); });
  const exportButton = panel.querySelector<HTMLButtonElement>('[data-action=export]');
  if (exportButton) lifetime.listen(exportButton, 'click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(actions.exportMetrics(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'vesperwound-metrics.json'; link.click(); URL.revokeObjectURL(url);
  });
  const select = panel.querySelector('select');
  if (select) lifetime.listen(select, 'change', () => actions.timeScale(Number(select.value)));
  window.__VESPER_DEBUG__ = actions;
  const text = panel.querySelector('pre');
  return {
    update(stats) {
      if (panel.hidden || !text) return;
      text.textContent = `${stats.backend} · ${stats.quality}\n${stats.resolution}\nFPS ${stats.fps.toFixed(1)} / p95 ${stats.p95.toFixed(1)} ms\nFrame ${stats.frameMs.toFixed(1)} / CPU ${stats.cpuMs.toFixed(2)} ms\nDraws ${stats.draws} / triangles ${stats.triangles}\nTextures ${stats.textures}\nGPU estimate ${(stats.estimatedGpuBytes / 1048576).toFixed(1)} MiB\nOwned resources ${stats.resources}\nAsset references ${stats.references}\nAudio voices ${stats.voices}\nCatch-up overruns ${stats.overruns}\nFixture loads ${stats.fixtureLoads}`;
    },
    dispose() { lifetime.dispose(); toggle.remove(); panel.remove(); delete window.__VESPER_DEBUG__; },
  };
}
