# First mission polish — validation

Review branch: `codex/first-mission-polish`, based on `main` at `940377f`.
Scope approved 2026-10-14. Validation resumed 2026-10-16 after tool interruptions.
The user approved commit, merge into main and push on 2026-10-16. The technical
results and documented limitations below remain applicable to that approval.

## Review build

Run `npm run dev`, choose **Enter the Works → Start mission**. Skip the opening
with the visible button or Space. Take the baton, clear the approach, recover the
regulator in the west loading bay, clear the winch guards, install the regulator
and board after the signal turns green. Boarding now shows the ferry departure.
Replay retains session equipment and omits the introduction; page reload resets it.

The [implementation notes and first-time checklist](../../first-mission-polish.md)
cover controls, ownership and review questions. No map expansion, character redesign,
new assets, combat rebalance, inventory or checkpoint system is included.

## Source and visuals

All new machinery details, generated labels and wake shapes are original project
geometry/materials in `src/world/mission-presentation.ts`. Camera composition is
editable in `src/camera/mission-camera.ts`; mission timings and placements are in
`src/mission/first-mission.ts`. No third-party import or new attribution was needed;
existing Medic, zombie, animation and environment notices remain applicable.

Visual inspection corrected the initial opening framing, moved its desktop caption
above the scene, exposed the gauge face toward the gameplay camera, reduced the
wake brightness and removed an obsolete installation hint after installation.
The second approach guard is staged beside the loading-bay cargo; guards retain
normal detection/navigation and combat tuning. The three winch guards wait until
apron entry or a real hit.

These remain simple original ferry/machinery props using the existing environment.
The milestone improves presentation and mission flow; it does not establish a new
cinematic asset-quality standard or a traversable ferry deck.

## Before and after evidence

| View | Previous mission | Polished mission |
| --- | --- | --- |
| Opening / preparation | [Previous preparation](../first-mission/mission-webgpu-prepare.png) | [Opening](mission-webgpu-opening.png), [preparation](mission-webgpu-prepare.png) |
| Machinery | [Previous winch](../first-mission/mission-webgpu-winch.png) | [Gauge/socket/winch](mission-webgpu-winch.png) |
| Ending | [Immediate completion](../first-mission/mission-webgpu-complete.png) | [Departure](mission-webgpu-departure.png), [route restored](mission-webgpu-complete.png) |

These are gameplay comparisons, not pixel-matched benchmark images. Desktop routes
switch High to Low at the regulator; the WebGPU route switches back to High during
departure to test reconstruction. Production measurements retain High throughout.
Complete real-input recordings: [WebGPU](mission-webgpu.webm),
[WebGL2](mission-webgl2.webm), [mobile landscape](mission-mobile.webm).

## Validation history and limitations

- An early developer-browser pass was invalidated by source edits triggering HMR;
  it is not acceptance evidence. Subsequent runs used unchanged application code.
- The first held-skip assertion incorrectly required identical vertical coordinates.
  Physics settles Medic by 6 mm after control resumes. The corrected test requires
  unchanged horizontal coordinates, less than 1 cm vertical settling and idle state.
- One earlier WebGL2 scripted fight timed out. The isolated complete-route rerun
  passed; detailed driver traces were added for recurrence. Automated input is not
  a substitute for human combat/pacing review.
- Three.js retains its existing warning about concurrent KTX2 loaders during
  transactional asset loading. Resource-cycle measurements are reported below.
- Vite can log EBUSY while a QA recording is being written under the watched docs
  directory; this is a validation-artifact watcher warning, not a game page error.
- The existing large JavaScript chunk warning remains.
- Automated first-play times use a known route. The intended 5–8-minute first-play
  duration, objective clarity and enjoyment remain human playtest gates.
- Physical-phone performance remains unverified; mobile results use browser emulation.

## Functional checks

- `npm run check` passes: strict TypeScript, lint, 102 unit tests across 18 files,
  and the production build. Mission tests cover completion/skip equivalence,
  staged activation, clocks, interaction, restart and readiness lease ownership.
- Both legacy and unavailable spatial-audio regressions pass.
- Final complete mission routes pass in Chrome 155.0.8059.80: WebGPU desktop,
  WebGL2 desktop and emulated Pixel 7 landscape (915 × 412 CSS pixels,
  WebGL2, left-handed controls at 140%). All three have zero page errors and
  cover replay, retained baton and return to practice. The mobile request log
  confirms no cinematic or desktop enemy payload.
- All four production regressions pass: development diagnostics exclusion,
  deferred enemy loading, deferred armed clips/inspection retention and a
  three-zombie practice encounter completed through real controls.
- Enlarged left-handed touch pickup, simultaneous movement and pointer cancellation pass.
- Focused cinematic tests passed WebGPU, WebGL2 and mobile: Reduced Motion,
  settings/portrait freeze, quality replacement, unavailable inspection and consumed skip.
- Failed/cancelled enemy and quay loads retain practice; retry succeeds. Three
  mission entry/exit cycles return to 55 owned resources, 7 asset references,
  69 listeners, 97 renderer textures and 58,530,325 estimated renderer bytes.
  These counters are allocation estimates, not driver-level GPU memory measurements.

### Navigation observation

A returning guard was observed stopped near the crane corner during a scripted
fight. It remained targetable and damageable. This AI edge case is retained for
review; it has not been represented as fixed. See
[navigation observation](navigation-observation.json). The earlier test driver
waited indefinitely for that guard to attack; the driver now also attacks returning
guards. A separate direct walk into the solid crane plinth was corrected with a
route around it. Both changes affect test input only, not collision or combat rules.

## Delivery limits

| Payload | Measured bytes | Ceiling |
| --- | ---: | ---: |
| Compressed bootstrap | 2,587,034 | 5 MiB |
| Desktop initial art | 18,999,728 | 20 MiB |
| Mobile initial art | 10,470,363 | 10 MiB |
| Additional inspection | 6,768,730 | 40 MiB |
| Desktop enemy | 2,982,204 | 8 MiB |
| Mobile enemy | 2,939,728 | 4 MiB |
| Armed animation pack | 437,932 | 512 KiB |
| Desktop optional quay | 7,938,508 | 12 MiB |
| Mobile optional quay | 2,270,968 | 6 MiB |

Production size checks pass. Art figures are raw delivered payload totals;
bootstrap is gzip. Mobile initial art has only 15,397 bytes of spare capacity.
The selected mobile route did not request cinematic or desktop enemy assets.

The automated active-play times were 1m 30s (WebGPU), 1m 27s (WebGL2) and
1m 57s (mobile). These are knowledgeable scripted routes, not first-time pacing
evidence; they do not establish the proposed 5–8-minute experience.

## Production performance

Measured on the local Windows laptop, Intel Core i7-13620H, with Intel UHD and
RTX 4050 Laptop adapters installed. Chrome 155.0.8059.80's default WebGPU adapter
query reported Intel `gen-12lp`. The renderer requests `high-performance`, so that
default query alone does not establish which physical GPU rendered these runs.
A separate opening run observed the renderer's real adapter request without
changing its options or return value: `high-performance` also selected Intel
`gen-12lp`. Thus the observed rendering adapter is Intel UHD; these are not
claimed as RTX 4050 measurements. See [adapter evidence](opening-performance.json).

The [mission measurement](mission-performance.json) spans 300.207 seconds and
31,021 frames: **13.6 ms p95**, **14.3 ms combat-only p95** (16,980 combat frames),
against the 18.5 ms limit. There were 12 frames over 50 ms, none over 100 ms,
and a maximum of 96.6 ms. Three missions completed within the sampling window;
the fourth finished afterward before teardown. There were no driver failures or
page errors. Renderer allocation samples ranged from 59,938,594 to 59,939,634
bytes with 106 textures; this is bounded sampled allocation, not proof about
all browser/driver memory.

Initial mission readiness took 2.834 seconds, with loading-frame p95 46.1 ms,
maximum 125.8 ms and 11 frames over 50 ms. Loading hitches remain visible and
are excluded from the steady-state acceptance figure. During measured departures,
p95 was 9.4 ms, maximum 60.7 ms, with one frame over 50 ms. The passage fight
accounted for nine of the full run's long frames; detailed phase counts are in JSON.

The [inspection measurement](inspection-performance.json) spans 300.171 seconds
and 121,463 frames: **3.9 ms p95** against the 35 ms limit, maximum 15.7 ms,
and no frames over 50 ms. Allocation samples stayed at 75,437,109 bytes and
116 textures. There were no page errors. The CPU mission remains in `quay`
while inspection is active; that label in the sample JSON is expected.

The [cold opening measurement](opening-performance.json) records introduction
p95 11.7 ms, maximum 34.2 ms and no frames over 50 ms. The first second after
restoring player control had p95 11.5 ms and maximum 16.1 ms. Its preceding
loading phase reached 201.2 ms; across these independent loading samples,
worst observed loading frames ranged from 125.8 to 201.2 ms. This remains
a responsiveness limitation despite passing steady-state performance.

Both five-minute scenarios and the separate opening check passed. The counters
and full timing distributions above are limited to this laptop and browser.
No physical-phone or first-time human playtest acceptance is claimed.

## Reproduction

```powershell
npm run check
npm run size
npx playwright test --config playwright.mission.config.ts
npm run test:browser -- foundation.spec.ts --project desktop -g 'spatial audio'
$env:VESPER_WEAPON_QA='docs/qa/first-mission-polish/weapon-regression'
npm run test:browser -- weapon.spec.ts --project hardware-player-mobile -g 'touch pickup'
npm run test:production
$env:VESPER_PERFORMANCE='1'
npx playwright test --config playwright.performance.config.ts mission.spec.ts
```

Run performance tests without other browser suites or builds. The harness uses
production preview, 1440 × 900, High quality, adaptive resolution off, Chrome
`--disable-frame-rate-limit --disable-gpu-vsync`, a 30-second warm-up and at least
300 seconds of measurement per scenario. External requestAnimationFrame intervals
include browser scheduling and CPU work; they are not isolated GPU timestamps.
Mission routes use real keyboard/mouse input and read-only state observations.

Final TypeScript and lint checks also passed after adding the separate opening
measurement. Validation servers have exited; no listener remained on 5173,
5182 or 4173 at review handoff. Implementation was completed on
`codex/first-mission-polish`; the user subsequently authorized commit, merge into
main and push on 2026-10-16. First-time human pacing and physical-phone validation
remain outstanding, along with the documented navigation and loading limitations.
