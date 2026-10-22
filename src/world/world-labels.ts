import { Object3D, Vector3, type Camera, type Scene } from 'three/webgpu';

type LabelTone = 'normal' | 'amber' | 'mint';

/** A non-renderable scene anchor with screen-resolution, non-interactive text. */
export class WorldLabel extends Object3D {
  readonly element = document.createElement('div');
  private readonly title = document.createElement('strong');
  private readonly health = document.createElement('i');
  private readonly posture = document.createElement('i');
  private readonly details = document.createElement('span');
  private readonly meters = document.createElement('div');
  private key = '';
  private disposed = false;
  constructor(kind: 'enemy' | 'training' | 'mission' | 'defense', private readonly release: () => void) {
    super();
    this.element.className = 'world-label'; this.element.dataset.kind = kind;
    this.element.hidden = true; this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-live', 'off');
    this.title.className = 'world-label-title'; this.details.className = 'world-label-detail';
    this.meters.className = 'world-label-meters'; this.meters.setAttribute('aria-hidden', 'true');
    for (const [bar, name] of [[this.health, 'health'], [this.posture, 'posture']] as const) {
      const track = document.createElement('div'); track.className = `world-label-${name}`;
      track.append(bar); this.meters.append(track);
    }
    this.element.append(this.title, this.meters, this.details);
  }
  text(title: string, tone: LabelTone = 'normal'): void {
    const key = `${title}/${tone}`; if (this.key === key) return; this.key = key;
    this.title.textContent = title; this.element.dataset.tone = tone;
    this.meters.hidden = true; this.details.hidden = true;
  }
  combat(title: string, health: number, maximum: number, posture: number, tone: LabelTone = 'normal'): void {
    const key = `${title}/${health}/${maximum}/${posture}/${tone}`; if (this.key === key) return; this.key = key;
    this.title.textContent = title; this.element.dataset.tone = tone;
    this.meters.hidden = false; this.details.hidden = false;
    this.health.style.width = `${Math.max(0, Math.min(1, health / maximum)) * 100}%`;
    this.posture.style.width = `${Math.max(0, Math.min(1, posture / 100)) * 100}%`;
    this.details.textContent = `HP ${health}/${maximum} · POSTURE ${posture}`;
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.element.remove(); this.removeFromParent(); this.release();
  }
}

/** Scene-owned bounded labels; no listeners, canvas textures or extra GPU pass. */
export class WorldLabels {
  private readonly root = document.createElement('div');
  private readonly entries = new Set<WorldLabel>();
  private readonly point = new Vector3();
  private disposed = false;
  constructor() { this.root.className = 'world-label-layer'; }
  create(kind: 'enemy' | 'training' | 'mission' | 'defense'): WorldLabel {
    if (this.disposed) throw new Error('Label layer is disposed');
    const label = new WorldLabel(kind, () => this.entries.delete(label));
    this.entries.add(label); this.root.append(label.element); return label;
  }
  render(host: HTMLElement, camera: Camera, scene: Scene, enabled: boolean, width: number, height: number): void {
    if (this.disposed) return;
    if (this.root.parentElement !== host) host.append(this.root);
    if (this.root.hidden === enabled) this.root.hidden = !enabled;
    if (!enabled) return;
    for (const label of this.entries) {
      let ancestor: Object3D | null = label;
      while (ancestor && ancestor.visible && ancestor !== scene) ancestor = ancestor.parent;
      let visible = ancestor === scene && scene.visible;
      if (visible) {
        label.getWorldPosition(this.point); this.point.applyMatrix4(camera.matrixWorldInverse);
        visible = this.point.z < 0;
        this.point.applyMatrix4(camera.projectionMatrix);
        visible &&= Math.abs(this.point.x) <= 1 && Math.abs(this.point.y) <= 1 && this.point.z >= -1 && this.point.z <= 1;
      }
      if (label.element.hidden === visible) label.element.hidden = !visible;
      if (!visible) continue;
      // Integer CSS pixels and no scale transform keep glyph rasterization crisp.
      const x = Math.round((this.point.x + 1) * width / 2);
      const y = Math.round((1 - this.point.y) * height / 2);
      // Translation moves the label without invalidating layout on every frame.
      const transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      if (label.element.style.transform !== transform) label.element.style.transform = transform;
    }
  }
  get count(): number { return this.entries.size; }
  dispose(): void { if (this.disposed) return; this.disposed = true; for (const label of this.entries) label.dispose(); this.root.remove(); }
}
