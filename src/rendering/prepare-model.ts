import { Mesh, Texture, type Object3D, type WebGPURenderer, type Scene, type Camera } from 'three/webgpu';

/** Prepare a leased, off-scene model in small batches while play continues. */
export async function prepareModel(root: Object3D, renderer: WebGPURenderer, camera: Camera, scene: Scene, cancelled: () => boolean): Promise<void> {
  const meshes: Mesh[] = [], textures = new Set<Texture>();
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    meshes.push(object);
    for (const material of Array.isArray(object.material) ? object.material : [object.material])
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
  });
  for (const texture of textures) {
    await preparationTurn();
    if (cancelled()) return;
    renderer.initTexture(texture);
  }
  for (const mesh of meshes) {
    await preparationTurn();
    if (cancelled()) return;
    const culled = mesh.frustumCulled; mesh.frustumCulled = false;
    try { await renderer.compileAsync(mesh, camera, scene); }
    finally { mesh.frustumCulled = culled; }
  }
}

async function preparationTurn(): Promise<void> {
  await new Promise<void>(resolve => {
    const finish = () => { clearTimeout(timer); cancelAnimationFrame(frame); resolve(); };
    const frame = requestAnimationFrame(finish), timer = setTimeout(finish, 100);
  });
}
