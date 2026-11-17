# Culverine native base attack chain

This ports the four base tower ranks, their real ray/payload/decal entities and renderer clocks. The three rank4 skill branches and ultimate remain unported/hidden; this report does not claim complete Culverine, six fresh-save flows or video/heard-audio acceptance.

## Original behavior and implementation

The tower's original update21525–21997, nested shooting helper21644–21662, ray_simple31061, single-main damage aura1443, animation decal1621 and reverse_remove callbacks supply the behavior. Function dumps and disassembly are retained under `analysis/function-bytecode` and `analysis/functions/culverine_*`. Full-function decompilation hits unsupported GOTO structure, so the bytecode, nested functions and actual original coroutine execution remain the authority.

The real tower first acquires an outer look target without ranged bans, then selects a ranged-valid target/forecast for firing. The five sprite states retain original quadrant, flip, hidden rear parts, clocks and loop modes. The chosen forecast is captured for the shot; source damage factor and critical chance are evaluated at launch. Rank4 waits for its body before reloading; base cooldown/animation waits use the original previous-render completion boundary. Real GUI upgrades replace entities through tower_upgrade18.

`CulverineNativeRuntime` queues a ray at the original main slot. At its first own main, it resolves the captured target against the actual registry, computes the fixed ray geometry, hides the first ray frame, queues the actual area payload, then queues the actual hit decal. The payload uses the captured target's current feet if present, otherwise the fixed destination. The actual shooting helper does not set tower_ref, so removing the tower does not cancel the ray or already queued payload.

The area executes at its own main slot and queues real damage IDs in original filtered-table order, with native ellipse distance falloff, armor/explosive factors, captured damage factor and health batch processing. It removes on the following flush. Rays reveal after the first-main yield and queue removal on their real duration boundary.

The hit decal starts its animation at its own first main, rather than creation time. After the previous render finishes its22 frames, its main queues removal; the remove callback rejects once and starts a two-second reverse tween. Alpha and second removal are native. `CulverineNativeRenderer` draws the actual registered decal; the existing projectile renderer draws actual registered rays. Tower EXOs now explicitly use native30FPS frame selection, including the non-loop ceil-minus-one boundary.

A generic runtime bug was corrected: timed8 must not assume runs1 when the original timed.runs is absent. Such a decal belongs to its main/remove/tween lifecycle. Existing default regressions pass with the corrected guard.

## Controlled evidence

`npm run test:native-culverine-chain`: eight original700-frame chains, total5600 frames. Four base ranks plus rank4 target removal before/after the ray's first main, source removal and target movement. Full table/ID/count/queue/event/RNG/HP comparison; all five body sprite states, ray geometry/clock/visibility, actual payload source/level/factor/position and decal animation/alpha/removal match. Angular/geometry math uses1e-12 tolerance across JS/Lua math libraries; event ordering, HP, clocks and alpha are exact.

The harness selects the actual fifth tower in the cleared nine-star native slot so its real animation resources load, and copies the original terrain floor state as tower_upgrade normally does. Every trace asserts empty missing resources/animations. The retained original entities/queues are not projected out.

The earlier7712 isolated basic tower frames and512 isolated ray traces remain supported. `browser_culverine_tower.mjs` passes the normal seven-star fifth-slot UI build and all three upgrades, verifies actual registered ray/decal painter keys/material alpha and real damage with original five-part EXOs. That browser uses a quiet controlled wave and frozen injected target; it is not ordinary-wave proof.

## Ordinary campaign evidence

The accepted normal-input route uses the real400 gold, legal cleared nine-star five-tower loadout, saved6500XP heroes and6000XP powers. It builds/upgrades holder7 through all four ranks, uses ordinary hero/rally/power/wave/sale commands, and does not force HP/resources/outcome. The same recorded input is replayed against the original APK runtime and the web. Original outcome is natural defeat at18658. Do not rerun the adaptive probe over the retained accepted-input file without recapturing its original oracle.

`npm run test:native-culverine`: all18658 native frames,22663 complete entity events,30789 RNG draws and30249 actual tower/ray/aura/decal states pass. All187198 enemy and54619 soldier/hero states also compare through the normal engine verifier. It includes the exact native health.dead bit separately from HP on every enemy frame.1599 original named engine sound requests match; GUI wave/defeat requests are checked separately. Logs: `culverine-mixed-verify.log`, `culverine-mixed-sound-verify.log`.

This battle exposed a real cross-controller boundary: a shadow-blade smoke cast can restore positive HP after health11 already raised health.dead. The death marker remains, the active smoke coroutine continues, and a later wizard bolt must not consume penetration/damage RNG for that corpse. `enemyIsDead` preserves this state for bolt hits/tracking and Culverine filtering; health bars stay hidden, smoke keeps its own animation, and all-enemies-dead detection excludes the corpse. The original18658-frame oracle was retained unchanged while fixing the divergence at3946.

Original trace910666969bytes SHA256 `65b664691863ec9ccd4e3726d78f4c9c578ff1a3ac238411d5834c09f5709458`; full frame-stream SHA256 `db027d526559fae071978fdd197423e8238127c1b8c17da682ea49f77af7a6cc`.

## Full paint gate in progress

The original renderer exported all9309 checkpoints,505863998bytes, SHA256 `d52f9c0dbedfb03b1898c1e12cdbc9cb9f9405f72981db8ba5004ee09ac257be`. The sample stream preserves every field, row and checkpoint; SHA256 `aa431c88f2add993ae16bdda34b949bd8192f7c6c914c7f83f5304f79af8c3e7`. The original exporter now writes each complete sample to an atomic partial file and renames only on completion. Its final tick/events/RNG/nextID/gold/lives metadata must equal the untouched ordinary trace.

The browser verifier now reads large paint oracles as a lazy, fingerprint-checked stream and prepares only the current checkpoint. The original trace stream tests cover both frames and samples, preserved Unicode/f64 values/unknown fields/order, metadata and tamper detection. The former whole-file paint preprocessor caused excessive heap usage; this change keeps all9309 checkpoints rather than reducing coverage. Full Chrome atlas/EXO/alpha/order/GUI acceptance is still running and is not yet claimed as green here.
