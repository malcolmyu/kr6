# Tower render completion phase

The full Vue/TypeScript/Three.js reconstruction through 3-2 remains incomplete.

## Corrected normal gameplay

`main_script` is system 7 and `render` is system 22. The tower coroutine reads the `runs` value written by the **previous tick's render**. Computing `animation_db.fni` at the current tick inside the coroutine resumes animation waits one frame early. `nativeLogicAnimationFrame` now makes the previous render timestamp explicit; wizard, catapult and culverine tower controllers use it. Freshly inserted catapult parts retain initial `runs=0` until their first actual update. Rendering itself still uses the current timestamp.

Earlier standalone tower exporters incorrectly computed render completion before resuming the same tick's coroutine. The wizard/basic/firebook/empower, catapult/basic/A/B/C and culverine exporters have been corrected to supply the preceding render result. Original coroutine/helper execution is retained. Opening exporters were refreshed as well. Projectile/power animation wait consumers have not all been audited yet.

## Independent coupled evidence

`export_native_level_runtime.lua` runs the shipped systems in a fresh VM with the smoke GUI inputs, actual paths/waves, animation metadata and constant-half RNG. CPU resource placeholders and sound metadata are used; this does not verify native GPU rendering, audio playback or real GUI input. Transparent diagnostic wrappers preserve original helper results and nil returns.

With no native actor states or order injected into GameSession:

- Both retry wizard acquisition at ticks454/464/474 and acquire at484.
- First six wizard bolt creation ticks now match508,513,569,574,630,635. Previously the first shot was507 versus native508.
- First catapult emission tick531 and origin617,349 match.
- Actor snapshots match through tick561; first HP difference is562, enemy4/native92: web40 versus native26.
- First gold difference is now691 (web80/native75); the earlier timing had diverged at584.

`verify_native_tower_phase.mjs` guards this limited independent prefix and is included in npm test. It does not claim complete health/targeting/RNG equivalence.

## Remaining cause found, not patched with a constant offset

At tick531, the original catapult75/holder7 reads enemy89 at position808.3870069603198,245.82849675455964, node63. This equals the original end-of-tick530 snapshot exactly. At the end of531 both native and web have position807.0539523053465,245.85575596642855, node64. The web tower currently queries after enemy movement, so it predicts755,247 instead of native763,247. The eight-pixel landing difference explains the first splash inclusion discrepancy. This is an entity main-script ordering issue, distinct from the corrected render-completion issue. A global one-tick target rewind would be wrong for towers inserted after enemies and is not implemented. The shared registry/SSO primitives still need integration into normal main-script scheduling and all entity allocation.

## Current verification and full-scope result

Fresh `export_web.lua` completed; full npm test and production build passed (`render-phase-full-{export,test}.log`, `render-phase-build.log`). The known bundle-size warning remains. Browser tower verification is recorded separately after completion.

Fresh normal-action policy probe (`render-phase-playthrough.json`): 1-1 victory20/266.6s, 1-2 victory1/149.5s, 2-1 victory20/431.9s, 2-2 defeat124.2333s, 3-1 victory12/672.0667s, 3-2 defeat89.7667s. Four wins/two losses remain; a later loss time is not a fidelity metric.

Fresh video opening replay (`observed-opening-replay.json`), video-bar-mid/seed104/scene13.5/middle windows, first gold mismatch media76:75 versus70; holder11 purchase at82.5 is rejected with95 gold. This is still only a diagnostic through media120. The video profile, random stream and some rally inputs remain uncertain; full video correspondence, startup/audio, unfinished skills and all six level flows remain unverified.

Browser verification38647 finished successfully: normal wizard building/upgrading at all four ranks, original animation transition/paired projectile/trail/damage checks; normal catapult building/upgrading and all four direction/attack/reload sequences with40FPS parts/30FPS balls, actual hits and audio-trigger checks, no page/asset errors. Screenshots web-native-wizard-level4.png and web-catapult-lvl4-reload.png inspected. These controlled targets do not verify video fidelity or audible native playback. Logs render-phase-browser-{wizard,catapult}.log. All export/test/probe/browser handles listed for this milestone are terminal.
