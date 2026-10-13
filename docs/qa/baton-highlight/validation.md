# Steel baton pickup visibility

Review branch: `codex/baton-pickup-highlight`, based on main `d1b0c26`.

The ground baton now has a warm emissive highlight, a one-metre amber ring
above the paving and a small raised diamond. The cues are static, including with
Reduced Motion, and do not need bloom or additional lights. Depth testing remains
enabled. Picking up the baton hides the entire marker group. The held baton keeps
its original materials; only ground-copy materials are cloned. The owner disposes
those clones and both marker geometries, and reports their resource counts.

No interaction range, weapon balance, simulation or downloaded asset changed.

## Validation

- `npm run check`: TypeScript, lint, 92 unit tests and production build passed.
- `npm run size`: all payload limits passed. Initial art is unchanged; bootstrap
  gzip is 2,579,383 bytes against the 5 MiB ceiling.
- Installed Chrome 154.0.8037.98 on Windows; actual WebGPU and WebGL2 desktop
  renders inspected at 1440 × 900. Existing weapon preview, pickup, encounter
  retention and quality-change cases passed on both backends.
- Pixel 7 emulation at 915 × 412 passed touch pickup, enlarged left-handed
  controls, simultaneous movement, pointer cancellation and portrait suspension.
  Its WebGL2 pickup capture was inspected; no desktop/inspection assets loaded.
- Three scene/inspection cycles retained exactly 41 owned resources, six asset
  references and 63 listeners. The first combined lifecycle run reached its
  90-second overall deadline during the final cold page reload, after all resource
  assertions passed. Its overall allowance is now 150 seconds; per-step assertions
  and deadlines are unchanged. The targeted rerun passed in 2.1 minutes, including
  the final page-reset check. Overall: three cases passed in the initial run,
  one passed on targeted rerun, and four project-inapplicable cases were skipped.
- The new ring adds 96 triangles versus the previous 32-triangle circle;
  the raised octahedron adds eight triangles. No new textures or lights are used.
- These are functional/visual checks, not a new sustained performance measurement.
  Physical-phone performance remains unverified.

## Captures

- [WebGPU pickup](browser/webgpu-required-pickup.png)
- [WebGL2 pickup](browser/webgl2-pickup.png)
- [Held steel finish](browser/webgpu-required-grip.png)
- [Mobile pickup](browser/mobile-pickup.png)

User review complete; committing, merging into main and pushing were explicitly approved on 2026-10-14.
The temporary validation server on port 5181 was stopped after testing.
