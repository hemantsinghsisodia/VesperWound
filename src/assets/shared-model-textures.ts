import { CompressedTexture, Mesh, Texture, type Object3D } from 'three/webgpu';

interface Entry { texture: Texture; references: number }
/** One asset manager owns immutable imported maps shared by its model leases. */
export class SharedModelTextures {
  private readonly entries = new Map<string, Entry>();

  async retain(root: Object3D): Promise<() => void> {
    const originals = new Set<Texture>();
    visitTextures(root, (_material, _key, texture) => originals.add(texture));
    // Hashing is asynchronous. Unsupported/non-compressed maps stay model-owned.
    const keys = await Promise.all([...originals].map(texture => fingerprint(texture).catch(() => null)));
    const replacements = new Map<Texture, Texture>(), retained: Entry[] = [], privateTextures: Texture[] = [];
    [...originals].forEach((texture, index) => {
      const key = keys[index];
      if (!key) { privateTextures.push(texture); return; }
      let entry = this.entries.get(key);
      if (!entry) { entry = { texture, references: 0 }; this.entries.set(key, entry); }
      entry.references++; retained.push(entry); replacements.set(texture, entry.texture);
    });
    visitTextures(root, (material, key, texture) => { material[key] = replacements.get(texture) ?? texture; });
    for (const [original, shared] of replacements) if (original !== shared) original.dispose();
    let released = false;
    return () => {
      if (released) return; released = true;
      for (const texture of privateTextures) destroyTexture(texture);
      for (const entry of retained) if (--entry.references === 0) {
        destroyTexture(entry.texture);
        for (const [key, candidate] of this.entries) if (candidate === entry) { this.entries.delete(key); break; }
      }
    };
  }
}

function visitTextures(root: Object3D, visit: (material: Record<string, unknown>, key: string, texture: Texture) => void): void {
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      const properties = material as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(properties)) if (value instanceof Texture) visit(properties, key, value);
    }
  });
}

async function fingerprint(texture: Texture): Promise<string | null> {
  if (!(texture instanceof CompressedTexture) || !texture.mipmaps.length) return null;
  const levels = texture.mipmaps;
  const bytes = new Uint8Array(levels.reduce((total, level) => total + level.data.byteLength, 0));
  let offset = 0;
  for (const level of levels) {
    bytes.set(new Uint8Array(level.data.buffer, level.data.byteOffset, level.data.byteLength), offset); offset += level.data.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  // The content alone is insufficient: UV transforms, colour interpretation and
  // sampling must also agree. Never merge a colour map with its linear variant.
  return JSON.stringify([
    [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''),
    levels.map(level => [level.width, level.height, level.data.byteLength]),
    texture.format, texture.type, texture.internalFormat, texture.mapping, texture.channel,
    texture.wrapS, texture.wrapT, texture.magFilter, texture.minFilter, texture.anisotropy,
    texture.colorSpace, texture.flipY, texture.generateMipmaps, texture.premultiplyAlpha, texture.unpackAlignment,
    texture.offset.toArray(), texture.repeat.toArray(), texture.center.toArray(), texture.rotation,
    texture.matrixAutoUpdate, texture.matrix.toArray(),
  ]);
}

function destroyTexture(texture: Texture): void {
  texture.dispose();
  if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) texture.source.data.close();
}
