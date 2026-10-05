import { Lifetime } from '../core/lifetime';
import { QUALITY_NAMES, type QualityName } from '../performance/quality';
import type { Preferences } from '../platform/settings';

export class Interface {
  canvas: HTMLCanvasElement;
  readonly stick: HTMLElement;
  readonly pulse: HTMLButtonElement;
  private readonly lifetime = new Lifetime();
  private readonly entry: HTMLElement;
  private readonly start: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly settings: HTMLDialogElement;
  private readonly rotate: HTMLElement;
  private readonly errorPanel: HTMLElement;

  constructor(readonly root: HTMLElement, preferences: Preferences) {
    root.innerHTML = `
      <main class="experience" aria-label="Vesperwound technical courtyard">
        <canvas id="world" aria-label="The Ash Quay courtyard" tabindex="0"></canvas>
        <div class="vignette" aria-hidden="true"></div>
        <header class="masthead"><a class="wordmark" href="/" aria-label="Vesperwound home"><span class="sigil">V</span> VESPERWOUND</a>
          <div class="header-actions"><button id="mute" class="icon-button" aria-label="Mute audio" aria-pressed="false">♪</button><button id="settings-open" class="icon-button" aria-label="Open settings">☰</button></div></header>
        <section id="entry" class="entry">
          <div class="entry-ornament" aria-hidden="true">✧</div>
          <p class="eyebrow">A CITY THAT FORGOT HOW TO DIE</p>
          <h1>VESPER<span>WOUND</span></h1>
          <div class="fine-rule" aria-hidden="true"></div>
          <p class="entry-description">Beneath the evening bell,<br>something is still breathing.</p>
          <button id="start" class="primary-button" disabled>OPENING THE INTAKE<span aria-hidden="true">↗</span></button>
          <p id="load-status" class="load-status" role="status">Preparing the Works…</p>
          <p class="entry-footnote">THE VESPER WORKS · TECHNICAL COURTYARD</p>
        </section>
        <section id="location" class="location" hidden><p class="eyebrow">THE VESPER WORKS / 01</p><h2>Ash Quay</h2><p>The last light at the intake.</p></section>
        <div id="controls-hint" class="controls-hint" hidden><span>W A S D <small>move the light</small></span><span>SPACE / CLICK <small>release pressure</small></span><span>ESC <small>settings</small></span></div>
        <div id="touch-controls" class="touch-controls" hidden><div id="movement-stick" class="movement-stick" role="group" aria-label="Movement joystick"><span class="stick-knob"></span></div><button id="pulse" class="pulse-button" aria-label="Release pressure"><span aria-hidden="true">◈</span><small>PRESSURE</small></button></div>
        <div class="session-tag"><span class="status-dot"></span><span id="session-status">INTAKE CLOSED</span></div>
        <section id="rotate" class="rotate-panel" hidden><span aria-hidden="true">↻</span><h2>Turn toward the Works</h2><p>Rotate your phone to landscape to continue.</p></section>
        <section id="error" class="error-panel" hidden role="alert"><p class="eyebrow">CONNECTION INTERRUPTED</p><h2>The Works are silent.</h2><p id="error-detail"></p><button id="retry" class="primary-button">TRY AGAIN <span aria-hidden="true">↗</span></button><button id="compatibility" class="text-button">Use compatibility graphics</button></section>
        <dialog id="settings" class="settings-panel"><div class="settings-heading"><p class="eyebrow">THE VESPER WORKS</p><button id="settings-close" class="icon-button" aria-label="Close settings">×</button></div><h2>Settings</h2>
          <label class="setting-row">Graphics quality<select id="quality">${QUALITY_NAMES.map((name) => `<option>${name}</option>`).join('')}</select></label>
          <label class="setting-row">Adaptive resolution<input id="adaptive" type="checkbox" /></label>
          <label class="setting-row">Audio volume<input id="volume" type="range" min="0" max="1" step="0.05" /></label>
          <label class="setting-row">Reduced motion<input id="reduced-motion" type="checkbox" /></label>
          <label class="setting-row">Interface scale<input id="ui-scale" type="range" min="0.8" max="1.4" step="0.1" /></label>
          <label class="setting-row">Left-handed controls<input id="left-handed" type="checkbox" /></label>
          <p id="storage-status" class="settings-note">Preferences are saved on this device.</p>
          <button id="resume" class="primary-button">RETURN TO THE WORKS <span aria-hidden="true">↗</span></button>
        </dialog>
      </main>`;
    this.canvas = this.get('#world'); this.stick = this.get('#movement-stick'); this.pulse = this.get('#pulse');
    this.entry = this.get('#entry'); this.start = this.get('#start'); this.status = this.get('#load-status');
    this.settings = this.get('#settings'); this.rotate = this.get('#rotate'); this.errorPanel = this.get('#error');
    this.get<HTMLSelectElement>('#quality').value = preferences.quality;
    this.get<HTMLInputElement>('#adaptive').checked = preferences.adaptive;
    this.get<HTMLInputElement>('#volume').value = String(preferences.volume);
    this.get<HTMLInputElement>('#reduced-motion').checked = preferences.reducedMotion;
    this.get<HTMLInputElement>('#ui-scale').value = String(preferences.uiScale);
    this.get<HTMLInputElement>('#left-handed').checked = preferences.leftHanded;
    this.applyPreferences(preferences);
  }
  get<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }
  bind(callbacks: {
    start(): void; pause(paused: boolean): void; retry(compatibility: boolean): void;
    preferences(values: Partial<Preferences>): void;
  }): void {
    this.lifetime.listen(this.start, 'click', () => callbacks.start());
    this.lifetime.listen(this.get('#retry'), 'click', () => callbacks.retry(false));
    this.lifetime.listen(this.get('#compatibility'), 'click', () => callbacks.retry(true));
    const open = () => { if (!this.settings.open) { callbacks.pause(true); this.settings.showModal(); } };
    const close = () => { if (this.settings.open) this.settings.close(); };
    this.lifetime.listen(this.get('#settings-open'), 'click', open);
    this.lifetime.listen(this.get('#settings-close'), 'click', close);
    this.lifetime.listen(this.get('#resume'), 'click', close);
    this.lifetime.listen(this.settings, 'close', () => callbacks.pause(false));
    this.lifetime.listen(window, 'keydown', (event) => {
      if (event.code === 'Escape' && !this.settings.open) { event.preventDefault(); open(); }
    });
    this.lifetime.listen(this.get('#quality'), 'change', () => callbacks.preferences({ quality: this.get<HTMLSelectElement>('#quality').value as QualityName }));
    this.lifetime.listen(this.get('#adaptive'), 'change', () => callbacks.preferences({ adaptive: this.get<HTMLInputElement>('#adaptive').checked }));
    this.lifetime.listen(this.get('#volume'), 'input', () => callbacks.preferences({ volume: Number(this.get<HTMLInputElement>('#volume').value) }));
    this.lifetime.listen(this.get('#reduced-motion'), 'change', () => callbacks.preferences({ reducedMotion: this.get<HTMLInputElement>('#reduced-motion').checked }));
    this.lifetime.listen(this.get('#ui-scale'), 'input', () => callbacks.preferences({ uiScale: Number(this.get<HTMLInputElement>('#ui-scale').value) }));
    this.lifetime.listen(this.get('#left-handed'), 'change', () => callbacks.preferences({ leftHanded: this.get<HTMLInputElement>('#left-handed').checked }));
    this.lifetime.listen(this.get('#mute'), 'click', () => callbacks.preferences({ muted: this.get<HTMLButtonElement>('#mute').getAttribute('aria-pressed') !== 'true' }));
  }
  loading(message: string): void { this.status.textContent = message; }
  prepare(): void {
    this.entry.hidden = false; this.errorPanel.hidden = true; this.start.disabled = true;
    this.start.innerHTML = 'OPENING THE INTAKE <span aria-hidden="true">↗</span>';
    this.root.dataset.state = 'loading';
  }
  replaceCanvas(): void {
    const fresh = this.canvas.cloneNode(false) as HTMLCanvasElement;
    this.canvas.replaceWith(fresh); this.canvas = fresh;
  }
  openSettings(): void { if (!this.settings.open) this.settings.showModal(); }
  ready(): void { this.start.disabled = false; this.start.innerHTML = 'ENTER THE WORKS <span aria-hidden="true">↗</span>'; this.status.textContent = 'The intake is open.'; this.root.dataset.state = 'ready'; }
  enter(): void {
    this.entry.hidden = true;
    this.get('#location').hidden = false; this.get('#controls-hint').hidden = false; this.get('#touch-controls').hidden = false;
    this.get('#session-status').textContent = 'PRESSURE STABLE'; this.canvas.focus(); this.root.dataset.state = 'running';
  }
  setPortrait(paused: boolean): void { this.rotate.hidden = !paused; }
  setPaused(paused: boolean): void { if (this.root.dataset.state === 'running' || this.root.dataset.state === 'paused') this.root.dataset.state = paused ? 'paused' : 'running'; }
  applyPreferences(preferences: Preferences): void {
    this.root.style.setProperty('--ui-scale', String(preferences.uiScale));
    this.root.classList.toggle('reduced-motion', preferences.reducedMotion);
    this.root.classList.toggle('left-handed', preferences.leftHanded);
    this.get<HTMLButtonElement>('#mute').setAttribute('aria-pressed', String(preferences.muted));
    this.get<HTMLButtonElement>('#mute').setAttribute('aria-label', preferences.muted ? 'Unmute audio' : 'Mute audio');
  }
  storage(persistent: boolean): void { this.get('#storage-status').textContent = persistent ? 'Preferences are saved on this device.' : 'Device storage is unavailable. Preferences last for this session.'; }
  error(reason: string): void {
    this.entry.hidden = true; this.errorPanel.hidden = false; this.get('#error-detail').textContent = reason;
    this.get('#session-status').textContent = 'INTAKE OFFLINE'; this.root.dataset.state = 'error';
  }
  clearError(): void { this.errorPanel.hidden = true; }
  dispose(): void { this.lifetime.dispose(); this.settings.close(); this.root.replaceChildren(); }
  get listenerCount(): number { return this.lifetime.cleanupCount; }
}
