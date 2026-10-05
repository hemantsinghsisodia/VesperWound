import { WebGPURenderer, RenderPipeline, ACESFilmicToneMapping, SRGBColorSpace, type Scene, type Camera } from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import type { BackendMode } from '../platform/capabilities';
import { effectivePixelRatio, type QualityProfile } from '../performance/quality';

export class RendererAdapter {
  readonly renderer: WebGPURenderer;
  backend: 'WebGPU' | 'WebGL2' = 'WebGL2';
  private pipeline: RenderPipeline | null = null;
  private scenePass: ReturnType<typeof pass> | null = null;
  private bloomPass: ReturnType<typeof bloom> | null = null;
  private width = 1;
  private height = 1;
  constructor(canvas: HTMLCanvasElement, mode: BackendMode) {
    this.renderer = new WebGPURenderer({ canvas, antialias: false, alpha: false, forceWebGL: mode === 'webgl2', powerPreference: 'high-performance' });
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.info.autoReset = false;
  }
  async init(mode: BackendMode, onLost: (reason: string) => void): Promise<void> {
    await this.renderer.init();
    this.backend = 'isWebGPUBackend' in this.renderer.backend && this.renderer.backend.isWebGPUBackend === true ? 'WebGPU' : 'WebGL2';
    if (mode === 'webgpu-required' && this.backend !== 'WebGPU') throw new Error('WebGPU was required, but no usable WebGPU backend was available.');
    this.renderer.onDeviceLost = (info) => onLost(`Graphics device lost: ${info.message || info.reason}`);
  }
  configure(scene: Scene, camera: Camera, profile: QualityProfile): void {
    this.disposePasses();
    this.scenePass = pass(scene, camera);
    const output = this.scenePass.getTextureNode('output');
    this.bloomPass = profile.bloom ? bloom(output, 0.18, 0.35, 1.1) : null;
    this.pipeline = new RenderPipeline(this.renderer);
    this.pipeline.outputNode = this.bloomPass ? output.add(this.bloomPass) : output;
    this.renderer.shadowMap.enabled = true;
  }
  resize(width: number, height: number, profile: QualityProfile, scale: number): void {
    this.width = Math.max(1, width); this.height = Math.max(1, height);
    this.renderer.setPixelRatio(effectivePixelRatio(profile, this.width, this.height, window.devicePixelRatio, scale));
    this.renderer.setSize(this.width, this.height, false);
  }
  async compile(scene: Scene, camera: Camera): Promise<void> { await this.renderer.compileAsync(scene, camera); }
  render(): void { this.renderer.info.reset(); this.pipeline?.render(); }
  get resolution(): string { const ratio = this.renderer.getPixelRatio(); return `${Math.round(this.width * ratio)} × ${Math.round(this.height * ratio)}`; }
  private disposePasses(): void {
    this.pipeline?.dispose(); this.bloomPass?.dispose(); this.scenePass?.dispose();
    this.pipeline = null; this.bloomPass = null; this.scenePass = null;
  }
  dispose(): void { this.renderer.setAnimationLoop(null); this.disposePasses(); this.renderer.dispose(); }
}
