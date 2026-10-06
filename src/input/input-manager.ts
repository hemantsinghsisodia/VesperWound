import { Lifetime } from '../core/lifetime';
import type { InputAction, InputFrame } from '../core/input-frame';

const ACTION_KEYS: Record<string, InputAction> = { Space: 'pulse', KeyF: 'interact' };
const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export class InputManager {
  private readonly lifetime = new Lifetime();
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<InputAction>();
  private readonly pointers = new Map<number, InputAction>();
  private aim = { x: 0, y: 0 };
  private aimActive = false;
  private stick = { x: 0, y: 0 };
  private stickPointer: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private readonly bindings = new Map<string, InputAction>(Object.entries(ACTION_KEYS));
  private readonly stickElement: HTMLElement;

  constructor(canvas: HTMLCanvasElement, stick: HTMLElement, pulse: HTMLButtonElement, playerButtons?: { dodge: HTMLButtonElement; run: HTMLButtonElement }) {
    this.stickElement = stick;
    if (playerButtons) { this.bindings.set('Space', 'dodge'); this.bindings.set('ShiftLeft', 'run'); this.bindings.set('ShiftRight', 'run'); }
    const primary: InputAction = playerButtons ? 'attack' : 'pulse';
    this.lifetime.listen(window, 'keydown', (event) => {
      if (this.isEditing(event.target)) return;
      if (MOVEMENT_KEYS.has(event.code) || this.bindings.has(event.code)) event.preventDefault();
      if (!this.keys.has(event.code)) {
        const action = this.bindings.get(event.code);
        if (action) this.pressed.add(action);
      }
      this.keys.add(event.code);
    });
    this.lifetime.listen(window, 'keyup', (event) => { this.keys.delete(event.code); });
    this.lifetime.listen(window, 'blur', () => this.clear());
    const visibility = () => { if (document.hidden) this.clear(); };
    document.addEventListener('visibilitychange', visibility);
    this.lifetime.own(() => document.removeEventListener('visibilitychange', visibility));
    this.lifetime.listen(canvas, 'pointermove', (event) => {
      const bounds = canvas.getBoundingClientRect();
      this.aim = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: 1 - (event.clientY - bounds.top) / bounds.height * 2 };
      this.aimActive = event.pointerType !== 'touch';
    });
    this.lifetime.listen(canvas, 'pointerdown', (event) => {
      if (event.button !== 0) return;
      const bounds = canvas.getBoundingClientRect();
      this.aim = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: 1 - (event.clientY - bounds.top) / bounds.height * 2 }; this.aimActive = event.pointerType !== 'touch';
      this.pointers.set(event.pointerId, primary);
      this.pressed.add(primary);
      canvas.setPointerCapture(event.pointerId);
    });
    for (const [button, action] of [[pulse, primary], ...(playerButtons ? [[playerButtons.dodge, 'dodge'], [playerButtons.run, 'run']] as const : [])] as ReadonlyArray<readonly [HTMLButtonElement, InputAction]>) {
      this.lifetime.listen(button, 'pointerdown', (event) => {
        event.preventDefault(); this.aimActive = false;
        this.pointers.set(event.pointerId, action); this.pressed.add(action); button.setPointerCapture(event.pointerId);
      });
    }
    this.lifetime.listen(stick, 'pointerdown', (event) => {
      if (this.stickPointer !== null) return;
      event.preventDefault();
      this.stickPointer = event.pointerId;
      const bounds = stick.getBoundingClientRect();
      this.stickOrigin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      stick.setPointerCapture(event.pointerId);
      this.updateStick(event, stick);
    });
    this.lifetime.listen(stick, 'pointermove', (event) => { if (event.pointerId === this.stickPointer) this.updateStick(event, stick); });
    const release = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      if (event.pointerId === this.stickPointer) {
        this.stickPointer = null;
        this.stick = { x: 0, y: 0 };
        stick.style.setProperty('--stick-x', '0px');
        stick.style.setProperty('--stick-y', '0px');
      }
    };
    this.lifetime.listen(window, 'pointerup', release);
    this.lifetime.listen(window, 'pointercancel', release);
    this.lifetime.listen(stick, 'lostpointercapture', release);
    this.lifetime.listen(pulse, 'lostpointercapture', release);
    this.lifetime.listen(canvas, 'lostpointercapture', release);
    if (playerButtons) for (const button of [playerButtons.dodge, playerButtons.run]) this.lifetime.listen(button, 'lostpointercapture', release);
    this.lifetime.listen(window, 'orientationchange', () => this.clear());
  }

  private updateStick(event: PointerEvent, element: HTMLElement): void {
    const radius = element.getBoundingClientRect().width * 0.3;
    let x = (event.clientX - this.stickOrigin.x) / radius;
    let y = (event.clientY - this.stickOrigin.y) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    this.stick = { x, y };
    const knobRadius = element.clientWidth * 0.3;
    element.style.setProperty('--stick-x', `${x * knobRadius}px`);
    element.style.setProperty('--stick-y', `${y * knobRadius}px`);
  }
  private isEditing(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || target.isContentEditable);
  }
  sample(): InputFrame {
    let x = this.stick.x + Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let y = this.stick.y + Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    const held = new Set(this.pointers.values());
    for (const [key, action] of this.bindings) if (this.keys.has(key)) held.add(action);
    const pressed = new Set(this.pressed);
    this.pressed.clear();
    return { movement: { x, y }, aim: { ...this.aim }, aimActive: this.aimActive, pressed, held };
  }
  clear(): void {
    this.keys.clear(); this.pointers.clear(); this.pressed.clear(); this.aimActive = false;
    this.stick = { x: 0, y: 0 }; this.stickPointer = null;
    this.stickElement.style.setProperty('--stick-x', '0px');
    this.stickElement.style.setProperty('--stick-y', '0px');
  }
  get listenerCount(): number { return this.lifetime.cleanupCount; }
  dispose(): void { this.clear(); this.lifetime.dispose(); }
}
