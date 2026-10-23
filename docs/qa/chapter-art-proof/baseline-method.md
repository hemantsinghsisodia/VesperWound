# Production measurement reproduction

All runs are sequential on the same powered Windows laptop. Do not run authoring, builds or other browser tests concurrently with measurements. Both versions use Chrome hardware rendering, 1440 × 900, High quality, adaptive resolution off, `--disable-frame-rate-limit` and `--disable-gpu-vsync`. The harness warms up for 30 seconds, then records 300 seconds of external animation-frame intervals.

The accepted baseline was extracted from Git without changing the active review branch:

```powershell
git archive --format=zip --output=.cache/chapter-main.zip 311d88b src public index.html vite.config.ts tsconfig.json package.json
Expand-Archive -LiteralPath .cache/chapter-main.zip -DestinationPath .cache/chapter-main
node node_modules/vite/bin/vite.js build .cache/chapter-main
```

The temporary baseline Playwright config resides in `.cache/chapter-main.performance.config.ts`. Its test directory is `../tests/performance`, viewport 1440 × 900, channel `chrome`, workers 1, timeout 720000, expectation timeout 30000, launch flags as above. Its web-server command, relative to `.cache`, is `node ../node_modules/vite/bin/vite.js preview chapter-main --host 127.0.0.1 --port 4174`, with base URL `http://127.0.0.1:4174`.

```powershell
$env:VESPER_PERFORMANCE='1'
$env:VESPER_PERFORMANCE_QA='docs/qa/chapter-art-proof/performance/main'
npx playwright test --config .cache/chapter-main.performance.config.ts tests/performance/desktop.spec.ts -g 'armed traversal'

$env:VESPER_PERFORMANCE_QA='docs/qa/chapter-art-proof/performance/proof'
npx playwright test --config playwright.performance.config.ts tests/performance/desktop.spec.ts -g 'armed (traversal|cinematic)'

$env:VESPER_MISSION_QA='docs/qa/chapter-art-proof/performance/proof'
npx playwright test --config playwright.performance.config.ts tests/performance/mission.spec.ts -g 'production mission$'
```

Baseline startup required correcting the relative CLI path and explicitly binding IPv4; those attempts failed before measurement. A subsequent run stopped after 150 seconds and is not counted as a completed measurement. The final full run is retained in `performance/main/traversal-performance.json`, including its failed p95 assertion and unusually slow first minute. Proof measurements ran before this baseline. This variance prevents a reliable relative-performance conclusion; no performance improvement is claimed. Exact times, browser/backend/adapter, sample variation and long frames are in the JSON results. No limiter or reduced render resolution is used to make the target pass. Renderer allocation estimates exclude other processes and browser/driver overhead.

The retained mission is measured as an environment/combat regression. The future chapter's sentry, mixed encounters and guardian do not exist in Milestone A and are not claimed as validated here.
