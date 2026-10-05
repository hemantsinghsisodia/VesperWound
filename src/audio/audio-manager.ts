export type AudioBus = 'ambience' | 'effects' | 'ui' | 'music';

interface SpatialAudioPosition {
  readonly positionX?: AudioParam;
  readonly positionY?: AudioParam;
  readonly positionZ?: AudioParam;
  setPosition?(x: number, y: number, z: number): void;
}

function setSpatialPosition(target: SpatialAudioPosition, x: number, y: number, z: number): void {
  const { positionX, positionY, positionZ } = target;
  if (positionX && positionY && positionZ) {
    positionX.value = x; positionY.value = y; positionZ.value = z;
  } else if (typeof target.setPosition === 'function') {
    // Some browsers implement only the legacy spatial positioning API.
    target.setPosition(x, y, z);
  }
  // If positioning is unavailable, retain default audio placement and keep playing.
}

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buses = new Map<AudioBus, GainNode>();
  private readonly sources = new Set<AudioScheduledSourceNode>();
  private ambienceStarted = false;
  private panner: PannerNode | null = null;
  muted = false;
  volume = 0.55;
  status: 'locked' | 'running' | 'suspended' | 'unavailable' = 'locked';

  async unlock(): Promise<void> {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        for (const name of ['ambience', 'effects', 'ui', 'music'] as const) {
          const bus = this.context.createGain();
          bus.connect(this.master);
          this.buses.set(name, bus);
        }
        this.applyVolume();
      }
      await this.context.resume();
      this.status = this.context.state === 'running' ? 'running' : 'suspended';
      if (!this.ambienceStarted) this.startAmbience();
    } catch { this.status = 'unavailable'; }
  }
  private startAmbience(): void {
    const context = this.context;
    const bus = this.buses.get('ambience');
    if (!context || !bus) return;
    this.ambienceStarted = true;
    this.panner = context.createPanner();
    this.panner.panningModel = 'equalpower';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 4;
    this.panner.maxDistance = 30;
    setSpatialPosition(this.panner, 0, 2, -3);
    this.panner.connect(bus);
    for (const frequency of [48, 72.3, 96.1]) {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      const gain = context.createGain(); gain.gain.value = 0.035;
      oscillator.connect(gain); gain.connect(this.panner);
      oscillator.start(); this.sources.add(oscillator);
    }
  }
  pulse(): void {
    const context = this.context;
    const bus = this.buses.get('effects');
    if (!context || !bus || context.state !== 'running' || this.sources.size >= 24) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(160, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(45, context.currentTime + 0.35);
    gain.gain.setValueAtTime(0.1, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    oscillator.connect(gain); gain.connect(bus);
    oscillator.onended = () => { this.sources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    this.sources.add(oscillator); oscillator.start(); oscillator.stop(context.currentTime + 0.5);
  }
  setListener(x: number, z: number): void {
    if (!this.context) return;
    setSpatialPosition(this.context.listener, x, 0, z);
  }
  setBusVolume(name: AudioBus, value: number): void {
    const bus = this.buses.get(name);
    if (bus && this.context) bus.gain.setTargetAtTime(Math.min(1, Math.max(0, value)), this.context.currentTime, 0.03);
  }
  setVolume(volume: number, muted: boolean): void {
    this.volume = Math.min(1, Math.max(0, volume)); this.muted = muted; this.applyVolume();
  }
  private applyVolume(): void {
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.03);
  }
  async suspend(): Promise<void> {
    if (this.context?.state === 'running') { await this.context.suspend(); this.status = 'suspended'; }
  }
  get voiceCount(): number { return this.sources.size; }
  async dispose(): Promise<void> {
    for (const source of this.sources) { source.onended = null; source.stop(); source.disconnect(); }
    this.sources.clear(); this.buses.clear(); this.panner?.disconnect(); this.master?.disconnect();
    await this.context?.close(); this.context = null; this.ambienceStarted = false; this.status = 'locked';
  }
}
