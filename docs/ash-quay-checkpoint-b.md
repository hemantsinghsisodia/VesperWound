# Ash Quay — Checkpoint B

Approved 2026-10-12; branch `codex/ash-quay-checkpoint-b` from main `4c0e5da`.
Review approved and commit/merge requested by the user on 2026-10-13. This does
not authorize further district expansion; recorded performance limitations remain.

Deliver two connected spaces: the retained Pressure Court and Arrival Quay,
joined by Pump Alley. The existing spawn, baton and training/encounter modes
stay in Pressure Court. Follow the south lane to an open waterfront, covered
loading bay, crane landmark and mooring overlook. Return along
the same route. The larger district loop remains a later review checkpoint.

The shared district definition describes ground and solid bounds in runtime
metres. Blender authoring consumes the same bounds. CPU collision stays
resident, with a seam barrier while the optional visual section is unavailable.
Navigation spans the authored ground, excludes water/gaps and retains enemy
leashes and existing attack rules. No new physics or rendering dependency.

The initial courtyard remains resident. Approaching its exit requests only the
selected quay tier; returning well inside the court releases it. Requests have
generation ownership: cancellation or disposal releases late results. Loading
failure keeps the seam blocked and exposes an explicit retry. Quality swaps
prepare the currently occupied section before replacing presentation. Simulation
and equipment outlive the visual sections; inspection does not move the player.

The editable checkpoint master is separate from the accepted A source. Normal
builds export saved models without saving them. Reuse the acquired CC0 architecture
and textures, with original quay machinery and dressing. Target incremental quay
payloads of at most 12 MiB desktop and 6 MiB mobile; retain all initial limits.

Validate actual WebGPU/WebGL2 views, desktop and landscape touch traversal,
collision boundaries, failed/cancelled loads, re-entry, inspection/quality changes,
bounded ownership and preserved combat. Run five-minute uncapped 1440×900 High
production measurements with adaptive resolution disabled. Targets remain
p95 ≤18.5 ms active play and ≤35 ms inspection. Physical-phone testing and visual
approval remain separate gates. Stop servers at handoff; keep the review branch.

## Authoring and review

`art/source/ash-quay-district.blend` is the editable, packed B master. The accepted
`ash-quay-master.blend` remains the A baseline. `npm run assets:environment` exports
the saved B master without modifying it. `npm run assets:district:author` explicitly
recreates B from A and the shared layout; do not run it over manual B edits. The
existing A authoring command is separate. Exports stage complete files before
replacing them to avoid partially published GLB/KTX2 artifacts.

Ground joints, projected UVs, slabs, crane, canopy and quay furniture are original
work. Concrete Floor Worn 02 by Dimitrios Savva is acquired from Poly Haven under
CC0, with supplied MD5 validation and recorded SHA256. Native facade UVs are retained;
new wall solids use metre-scaled masonry UVs. No added runtime light or dependency.

Walk from spawn toward the ARRIVAL QUAY sign at the south opening, through Pump
Alley and onto the waterfront. The loading canopy cuts away when over Medic or
between the camera and his head. Existing training and encounters stay in the court.
The optional section loads after z=5.5 m, blocks entry until ready and releases on
return below z=1.5 m. This intentional hysteresis avoids repeated requests at the gate.
Cancellation invalidates ownership and disposes late results; it does not abort the
shared AssetManager request while another lease could use it. GPU preparation runs
off-scene, yields between meshes and uses the actual scene lighting; the gate opens
only after preparation completes. AssetManager retains preparing model leases until
the work ends, including when its owner has been disposed.

Run `npx playwright test -c playwright.district.config.ts` for both desktop backends
and landscape touch checks. `powershell -File tools/run-performance.ps1` runs three
serial five-minute production measurements: group combat, inspection and repeated
two-area traversal. Build production first. Read `docs/qa/ash-quay-checkpoint-b/` for
captures, measurements and the validation report. Emulation is not a phone benchmark.
