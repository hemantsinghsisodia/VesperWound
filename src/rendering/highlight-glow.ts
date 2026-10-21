import type { TextureNode } from 'three/webgpu';
import { Fn, luminance, rtt, smoothstep, textureSize, type uvec2, uv, vec2, vec3, vec4 } from 'three/tsl';

/** Restrained High-quality glow: threshold and tent filter in one quarter-size pass. */
export function highlightGlow(input: TextureNode): ReturnType<typeof rtt> {
  const filtered = Fn(() => {
    const sum = vec3(0).toVar();
    // Three's runtime returns uvec2; the pinned declarations omit its node type.
    const texel = vec2(1).div(vec2(textureSize(input) as unknown as ReturnType<typeof uvec2>));
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
      const color = input.sample(uv().add(texel.mul(vec2(x, y)).mul(6)));
      const weight = (x === 0 ? 2 : 1) * (y === 0 ? 2 : 1) / 16;
      sum.addAssign(color.rgb.mul(smoothstep(1.1, 1.2, luminance(color.rgb))).mul(weight));
    }
    return vec4(sum, 1);
  })();
  return rtt(filtered, null, null, { resolutionScale: .25, depthBuffer: false });
}
