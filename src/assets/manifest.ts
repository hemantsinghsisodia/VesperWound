export interface AssetDefinition { kind: 'model' | 'texture'; url: string; colorSpace?: 'srgb' | 'linear' }
export interface AssetManifest { version: 1; assets: Record<string, AssetDefinition> }

export function validateManifest(value: unknown): AssetManifest {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('assets' in value)) {
    throw new Error('Asset manifest must use schema version 1.');
  }
  const assets = value.assets;
  if (typeof assets !== 'object' || assets === null || Array.isArray(assets)) throw new Error('Asset manifest has no asset table.');
  const definitions: Record<string, AssetDefinition> = {};
  for (const [id, item] of Object.entries(assets)) {
    if (typeof item !== 'object' || item === null || !('kind' in item) || !('url' in item)
      || (item.kind !== 'model' && item.kind !== 'texture') || typeof item.url !== 'string'
      || !item.url || item.url.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(item.url)) {
      throw new Error(`Invalid asset definition: ${id}`);
    }
    const definition: AssetDefinition = { kind: item.kind, url: item.url };
    if ('colorSpace' in item) {
      if (item.colorSpace !== 'srgb' && item.colorSpace !== 'linear') throw new Error(`Invalid texture color space: ${id}`);
      definition.colorSpace = item.colorSpace;
    }
    definitions[id] = definition;
  }
  return { version: 1, assets: definitions };
}
