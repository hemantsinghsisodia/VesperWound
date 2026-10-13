import type { Mesh } from 'three/webgpu';

/** Opaque ground detail fills depth before the continuous grout foundation. */
export function configureEnvironmentMesh(mesh: Mesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const paving = materials.every(material => material.name.startsWith('District / weathered concrete') || material.name.startsWith('District / dock limestone'));
  mesh.castShadow = !paving; mesh.receiveShadow = true;
  if (paving) mesh.renderOrder = -1;
}
