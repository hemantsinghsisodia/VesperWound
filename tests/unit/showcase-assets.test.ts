import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { read } from 'ktx-parse';

describe('optimized visual milestone assets', () => {
  for (const variant of ['desktop', 'mobile', 'cinematic']) it(`${variant} preserves the rig, attachments, in-place clips, texture and triangle budgets`, async () => {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const hero = await io.read(`public/assets/showcase/${variant}/iona.glb`);
    const root = hero.getRoot();
    expect(root.listSkins().length).toBeGreaterThan(0);
    for (const skin of root.listSkins()) expect(skin.listJoints()).toHaveLength(63);
    expect(new Set(root.listSkins().flatMap((skin) => skin.listJoints())).size).toBe(63);
    const boneNames = root.listSkins()[0]!.listJoints().map((node) => node.getName());
    for (const name of ['hips', 'clavicle.L', 'upper_arm_twist.R', 'finger5_3.L', 'eye.R', 'coat_back_tip.L']) expect(boneNames).toContain(name);
    expect(root.listAnimations().map((clip) => clip.getName()).sort()).toEqual(['attack', 'dodge', 'idle', 'run', 'walk']);
    const nodes = root.listNodes();
    for (const material of root.listMaterials()) {
      if (material.getName() === 'Iona.Hair') expect(material.getAlphaMode()).toBe('BLEND');
      const normal = material.getNormalTexture();
      if (normal) {
        const container = read(normal.getImage()!);
        expect(container.supercompressionScheme).toBe(2); // KTX_SS_ZSTD
        expect(container.dataFormatDescriptor[0]?.colorModel).toBe(166); // UASTC
      }
      if (variant === 'cinematic' && material.getName() === 'Iona.Hair') {
        const container = read(material.getBaseColorTexture()!.getImage()!);
        expect(container.supercompressionScheme).toBe(2); expect(container.dataFormatDescriptor[0]?.colorModel).toBe(166);
      }
      for (const texture of [material.getBaseColorTexture(), normal, material.getMetallicRoughnessTexture()]) if (texture && variant === 'cinematic' && !['Iona.Skin', 'Iona.Waxcloth'].includes(material.getName())) expect(read(texture.getImage()!).pixelWidth).toBeLessThanOrEqual(2048);
    }
    for (const name of ['socket_lantern', 'socket_wake_hook']) expect(nodes.some((node) => node.getName() === name && node.getParentNode()?.getName().startsWith('hand.'))).toBe(true);
    const count = root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((total, primitive) => total + (primitive.getIndices()?.getCount() ?? 0) / 3, 0), 0);
    expect(count).toBeGreaterThanOrEqual(variant === 'cinematic' ? 50000 : variant === 'desktop' ? 35000 : 12000);
    expect(count).toBeLessThanOrEqual(variant === 'cinematic' ? 180000 : variant === 'desktop' ? 50000 : 20000);
    for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
      const weightAccessor = primitive.getAttribute('WEIGHTS_0');
      const weights = weightAccessor?.getArray();
      const joints = primitive.getAttribute('JOINTS_0')?.getArray();
      if (!weights || !joints) throw new Error('Every character component must use the shared deformation rig.');
      let maxError = 0; let maxJoint = 0; const element: number[] = [];
      for (let i = 0; i < weightAccessor!.getCount(); i++) {
        weightAccessor!.getElement(i, element);
        maxError = Math.max(maxError, Math.abs(element.reduce((sum, value) => sum + value, 0) - 1));
        for (let j = 0; j < 4; j++) maxJoint = Math.max(maxJoint, joints[i*4+j]!);
      }
      expect(maxError).toBeLessThan(0.005); expect(maxJoint).toBeLessThan(63);
    }
    for (const name of ['walk', 'run']) {
      const clip = root.listAnimations().find((value) => value.getName() === name);
      for (const channel of clip?.listChannels() ?? []) if (channel.getTargetNode()?.getName() === 'hips' && channel.getTargetPath() === 'translation') {
        const data = channel.getSampler()?.getOutput()?.getArray(); if (!data) throw new Error('Root motion data missing.');
        for (let i = 3; i < data.length; i += 3) { expect(data[i]).toBeCloseTo(data[0]!); expect(data[i + 2]).toBeCloseTo(data[2]!); }
      }
    }
    const court = variant === 'cinematic' ? null : await io.read(`public/assets/showcase/${variant}/ash-quay.glb`);
    if (court) expect(court.getRoot().listMeshes().some((mesh) => mesh.listPrimitives().some((primitive) => primitive.getAttribute('COLOR_0')))).toBe(true);
    for (const doc of court ? [hero, court] : [hero]) {
      const extensions = doc.getRoot().listExtensionsRequired().map((extension) => extension.extensionName);
      expect(extensions).toContain('KHR_texture_basisu'); expect(extensions).toContain('EXT_meshopt_compression');
      for (const texture of doc.getRoot().listTextures()) {
        expect(texture.getMimeType()).toBe('image/ktx2');
        const container = read(texture.getImage()!);
        expect(container.pixelWidth).toBeLessThanOrEqual(variant === 'cinematic' ? 4096 : variant === 'desktop' ? 2048 : 1024);
        expect(container.levels.length).toBeGreaterThan(1);
      }
    }
  });
});
