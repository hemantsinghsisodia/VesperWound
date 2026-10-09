import { Lifetime } from '../core/lifetime';
import { QUALITY_NAMES, type QualityName } from '../performance/quality';
import type { Preferences } from '../platform/settings';
import { MEDIC, type CharacterClip } from '../world/character-definition';
import type { CameraView, PreviewClip, InspectionView, InspectionLighting, InspectionState } from '../world/presentation';
import type { WeaponPickup } from '../player/weapon-pickup';
import type { PlayerSimulation, PlayerState } from '../player/player-simulation';
import type { EncounterSimulation } from '../enemies/encounter-simulation';

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
      <main class="experience" aria-label="Vesperwound Ash Quay">
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
          <p class="entry-footnote">THE VESPER WORKS · MEDIC AT ASH QUAY · <a href="/credits.html" target="_blank" rel="noopener">Credits</a></p>
        </section>
        <section id="location" class="location" hidden><p class="eyebrow">THE VESPER WORKS / 01</p><h2>Ash Quay</h2><p>The last light at the intake.</p></section>
        <section id="showcase-controls" class="showcase-controls" aria-label="Visual showcase" hidden>
          <div class="view-buttons"><button id="view-player" aria-pressed="true">Play</button><button id="view-courtyard" aria-pressed="false">Courtyard</button><button id="view-character" aria-pressed="false">Medic</button><button id="turn-character" aria-label="Turn Medic">↻</button></div>
          <label id="animation-label" for="animation">Animation</label><select id="animation"><option value="pose">Static pose</option></select>
          <p>MEDIC · SCIFI MEDIC</p>
          <button id="inspection-toggle" hidden>Detailed inspection</button>
          <div class="encounter-controls"><button id="encounter-start">Start encounter</button><button id="encounter-restart" hidden>Restart encounter</button><button id="encounter-return" hidden>Return to training</button><span id="encounter-status" role="status"></span></div>
          <div id="inspection-controls" hidden>
            <label for="inspection-view">View</label><select id="inspection-view"><option value="full-body">Full body</option><option value="portrait">Portrait</option><option value="equipment">Equipment</option></select>
            <label for="inspection-lighting">Lighting</label><select id="inspection-lighting"><option value="neutral">Neutral</option><option value="ash-quay">Ash Quay</option></select>
            <button id="animation-pause" aria-pressed="false">Pause animation</button>
            <small>Drag to orbit · Scroll or pinch to zoom</small>
          </div>
          <span id="art-status" role="status"></span>
          <span id="inspection-status" role="status"></span>
        </section>
        <div id="controls-hint" class="controls-hint" hidden><span>W A S D <small>move the light</small></span><span>SPACE / CLICK <small>release pressure</small></span><span>ESC <small>settings</small></span></div>
        <section id="player-hud" class="player-hud" aria-label="Player status" hidden><label for="health">MEDIC <span id="health-value">100 / 100</span></label><progress id="health" max="100" value="100" aria-label="Medic health"></progress><label for="pressure">PRESSURE <span id="pressure-value">100 / 100</span></label><progress id="pressure" max="100" value="100" aria-label="Ward pressure"></progress><p id="player-message" role="status">Chain three light hits, then use heavy to break posture.</p><p id="equipped-weapon">Unarmed</p><p id="pickup-status" role="status"></p><p id="combat-score">HITS 0 · CRITICALS 0 · BLOCKS 0</p><button id="reset-targets">Reset targets</button><button id="restart-player" hidden>Return to the intake</button></section>
        <div id="touch-controls" class="touch-controls" hidden><div id="movement-stick" class="movement-stick" role="group" aria-label="Movement joystick"><span class="stick-knob"></span></div><button id="pickup" class="pickup-button" aria-label="Pick up steel baton" hidden>Pick up</button><div class="player-touch-actions"><button id="run" aria-label="Run">RUN</button><button id="dodge" aria-label="Dodge">DODGE</button><button id="heavy" aria-label="Heavy attack">HEAVY</button><button id="ward" aria-label="Ward">WARD</button></div><button id="pulse" class="pulse-button" aria-label="Release pressure"><span aria-hidden="true">◈</span><small>PRESSURE</small></button></div>
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
          <p class="settings-note"><a href="/credits.html" target="_blank" rel="noopener">Asset credits and licenses</a></p>
          <p id="storage-status" class="settings-note">Preferences are saved on this device.</p>
          <button id="resume" class="primary-button">RETURN TO THE WORKS <span aria-hidden="true">↗</span></button>
        </dialog>
      </main>`;
    this.canvas = this.get('#world'); this.stick = this.get('#movement-stick'); this.pulse = this.get('#pulse');
    this.entry = this.get('#entry'); this.start = this.get('#start'); this.status = this.get('#load-status');
    this.settings = this.get('#settings'); this.rotate = this.get('#rotate'); this.errorPanel = this.get('#error');
    this.get('#view-character').textContent = MEDIC.displayName;
    this.get('#turn-character').setAttribute('aria-label', `Turn ${MEDIC.displayName}`);
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
    camera(view: CameraView): void; animation(clip: PreviewClip): void; turn(): void;
    inspection(): void; inspectionView(view: InspectionView): void;
    inspectionLighting(lighting: InspectionLighting): void; inspectionPause(): void; restart(): void; resetTargets(): void;
    encounterStart(): void; encounterRestart(): void; encounterReturn(): void;
  }): void {
    this.lifetime.listen(this.start, 'click', () => callbacks.start());
    for (const view of ['player', 'courtyard', 'character'] as const) this.lifetime.listen(this.get(`#view-${view}`), 'click', () => {
      callbacks.camera(view);
      for (const choice of ['player', 'courtyard', 'character']) this.get(`#view-${choice}`).setAttribute('aria-pressed', String(choice === view));
    });
    this.lifetime.listen(this.get('#restart-player'), 'click', () => callbacks.restart());
    this.lifetime.listen(this.get('#reset-targets'), 'click', () => callbacks.resetTargets());
    this.lifetime.listen(this.get('#encounter-start'), 'click', () => callbacks.encounterStart());
    this.lifetime.listen(this.get('#encounter-restart'), 'click', () => callbacks.encounterRestart());
    this.lifetime.listen(this.get('#encounter-return'), 'click', () => callbacks.encounterReturn());
    this.lifetime.listen(this.get('#animation'), 'change', () => { const value = this.get<HTMLSelectElement>('#animation').value; callbacks.animation(value === 'pose' ? { kind: 'pose' } : { kind: 'clip', name: value.slice(5) }); });
    this.lifetime.listen(this.get('#turn-character'), 'click', () => callbacks.turn());
    this.lifetime.listen(this.get('#inspection-toggle'), 'click', () => callbacks.inspection());
    this.lifetime.listen(this.get('#inspection-view'), 'change', () => callbacks.inspectionView(this.get<HTMLSelectElement>('#inspection-view').value as InspectionView));
    this.lifetime.listen(this.get('#inspection-lighting'), 'change', () => callbacks.inspectionLighting(this.get<HTMLSelectElement>('#inspection-lighting').value as InspectionLighting));
    this.lifetime.listen(this.get('#animation-pause'), 'click', () => callbacks.inspectionPause());
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
    const showcase = this.root.dataset.scene === 'showcase';
    this.get('#location').hidden = false; this.get('#controls-hint').hidden = false; this.get('#touch-controls').hidden = false;
    this.get('#showcase-controls').hidden = !showcase;
    this.get('#session-status').textContent = 'PRESSURE STABLE'; this.canvas.focus(); this.root.dataset.state = 'running';
    if (showcase) this.mode('player');
  }
  scene(name: 'foundation' | 'showcase'): void { this.root.dataset.scene = name; }
  mode(view: CameraView): void {
    const playing = view === 'player'; this.root.dataset.mode = view;
    for (const choice of ['player', 'courtyard', 'character']) this.get(`#view-${choice}`).setAttribute('aria-pressed', String(choice === view));
    this.get('#player-hud').hidden = !playing; this.get('#touch-controls').hidden = !playing;
    this.get('#controls-hint').hidden = !playing;
    if (playing) {
      this.pulse.setAttribute('aria-label', 'Attack'); this.pulse.querySelector('small')!.textContent = 'ATTACK';
      this.get('#controls-hint').innerHTML = '<span>W A S D <small>walk · SHIFT run</small></span><span>CLICK / RIGHT CLICK <small>light / heavy</small></span><span>SPACE / Q <small>dodge / Ward</small></span><span>ESC <small>settings</small></span>';
    }
  }
  player(state: PlayerState): void {
    this.get<HTMLProgressElement>('#health').value = state.health;
    this.get('#health-value').textContent = `${state.health} / 100`;
    this.get<HTMLProgressElement>('#pressure').value = state.pressure;
    this.get('#pressure-value').textContent = `${Math.floor(state.pressure)} / 100`;
    this.get('#restart-player').hidden = state.action !== 'dead';
    this.get('#reset-targets').hidden = state.action === 'dead';
    this.get('#player-message').textContent = state.action === 'dead' ? 'The pressure took you. Return to try again.' : state.wardRemaining > 0 ? 'Ward active · absorbs one hit.' : state.ventWarning ? 'VENT PULSE INCOMING · dodge or use Ward.' : state.action === 'heavy' ? 'Heavy strike · committed windup.' : state.action === 'attack' ? `Light chain ${state.combo} / 3` : 'Light combo → heavy → exposed → critical heavy.';
    this.get('#combat-score').textContent = `HITS ${state.targetHits} · CRITICALS ${state.criticals} · BLOCKS ${state.blocks}`;
    this.root.dataset.playerAction = state.action;
    // Read-only state also supports production measurements without dev commands.
    this.canvas.dataset.playerPosition = `${state.position.x.toFixed(3)},${state.position.y.toFixed(3)},${state.position.z.toFixed(3)}`;
    this.canvas.dataset.playerAction = state.action;
    this.canvas.dataset.combatHits = String(state.targetHits); this.canvas.dataset.combatCriticals = String(state.criticals); this.canvas.dataset.combatStrikes = String(state.strikes); this.canvas.dataset.combatBlocks = String(state.blocks);
  }
  weapon(player:PlayerSimulation,pickup:WeaponPickup):void {
    const armed=player.state.weapon==='baton',eligible=player.canPickupBaton();
    this.get('#equipped-weapon').textContent=armed?'Steel baton':'Unarmed';
    this.get('#pickup-status').textContent=armed?'':pickup.status==='loading'||pickup.status==='ready'?'Preparing steel baton…':pickup.status==='failed'&&eligible?'Pickup failed · F to retry':eligible?'F — Pick up steel baton':'';
    const button=this.get<HTMLButtonElement>('#pickup');button.hidden=armed||!eligible;button.disabled=pickup.status==='loading'||pickup.status==='ready';button.textContent=pickup.status==='failed'?'Retry pickup':button.disabled?'Loading…':'Pick up';
    this.root.dataset.weapon=player.state.weapon;this.root.dataset.pickup=pickup.status;this.canvas.dataset.weapon=player.state.weapon;
  }
  animationChoices(clips: readonly CharacterClip[]): void {
    const select = this.get<HTMLSelectElement>('#animation');
    select.replaceChildren(new Option('Static pose', 'pose'), ...clips.map((clip) => new Option(clip.name, `clip:${clip.name}`)));
  }
  encounter(simulation: EncounterSimulation | null, loading: boolean, error = ''): void {
    const active=simulation?.mode==='encounter';
    this.get('#encounter-start').hidden=active;
    this.get('#encounter-start').textContent=loading?'Cancel encounter load':error?'Retry encounter':'Start encounter';
    this.get('#encounter-restart').hidden=!active;this.get('#encounter-return').hidden=!active;
    this.get('#encounter-status').textContent=loading?'Preparing Zombie 7…':error;
    this.get('#reset-targets').hidden=active||simulation?.player.state.action==='dead';
    if(active&&simulation?.victorious)this.get('#player-message').textContent='ENCOUNTER COMPLETE · Restart to fight again.';
    else if(active&&simulation?.player.state.action!=='dead'&&simulation?.player.state.action==='idle')this.get('#player-message').textContent='Watch the windup · step into punch range · dodge or Ward.';
    this.root.dataset.encounter=active?'active':loading?'loading':error?'failed':'training';
    this.canvas.dataset.encounter=this.root.dataset.encounter;
    this.canvas.dataset.enemyState=simulation?.enemies[0]?.action??'none';
    this.canvas.dataset.enemyHealth=String(simulation?.enemies[0]?.health??0);
    this.canvas.dataset.enemyPosition=simulation?.enemies[0]?`${simulation.enemies[0].position.x.toFixed(3)},${simulation.enemies[0].position.z.toFixed(3)}`:'';
  }
  animation(clip: PreviewClip): void { this.get<HTMLSelectElement>('#animation').value = clip.kind === 'pose' ? 'pose' : `clip:${clip.name}`; }
  artLoading(loading: boolean, message = ''): void {
    this.get('#art-status').textContent = message;
    for (const selector of ['#animation', '#turn-character', '#quality', '#encounter-start', '#encounter-restart', '#encounter-return']) this.get<HTMLButtonElement | HTMLSelectElement>(selector).disabled = loading;
  }
  inspection(state: InspectionState, eligible: boolean): void {
    const active = state.status === 'active';
    this.root.dataset.inspection = state.status;
    const button = this.get<HTMLButtonElement>('#inspection-toggle'); button.hidden = !eligible;
    button.textContent = active ? 'Return to Ash Quay' : state.status === 'loading' ? 'Cancel inspection' : state.status === 'failed' ? 'Retry detailed inspection' : 'Detailed inspection';
    this.get('#inspection-controls').hidden = !active;
    this.get('.encounter-controls').hidden=active;
    this.get('#view-courtyard').hidden = active; this.get('#view-character').hidden = active;
    this.get('#view-player').hidden = active;
    this.get('#player-hud').hidden = active || this.root.dataset.mode !== 'player';
    if (this.root.dataset.scene === 'showcase') {
      this.get('#touch-controls').hidden = active || this.root.dataset.mode !== 'player';
      this.get('#controls-hint').hidden = active || this.root.dataset.mode !== 'player';
    }
    this.get('#location').hidden = active || !['running', 'paused'].includes(this.root.dataset.state ?? '');
    this.get('#inspection-status').textContent = state.status === 'loading' ? 'Preparing detailed Medic…' : state.status === 'failed' ? state.message : '';
    if (active) {
      this.get<HTMLSelectElement>('#inspection-view').value = state.view;
      this.get<HTMLSelectElement>('#inspection-lighting').value = state.lighting;
      this.get('#animation-pause').setAttribute('aria-pressed', String(state.paused));
      this.get('#animation-pause').textContent = state.paused ? 'Resume animation' : 'Pause animation';
    }
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
