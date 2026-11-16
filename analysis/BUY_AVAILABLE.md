# Original purchase-availability controller and glow

The full reconstruction through3-2 is still incomplete. This change implements a missing original scene controller and its visible output; it does not complete global entity allocation or main-script scheduling.

## Production implementation

- `BuyAvailable.ts` ports controller_show_buy_available52571: first yield, shared animation epoch on the next resume, strict quarter-second polling, force_check, selected/forced tower minimum cost, and next-tick modifier entry. It exposes each normal creation via onCreate for subsequent shared-registry integration.
- mod_buy_available52629 visibility priority is ported from original bytecode: hide override, disable_spend_highlight, active/inactive repairs, non-ultimate skill prices/caps, purchasable attacks, next-level cost and locks, empty/blocked holders, final UI can_click override. Original branches remain distinct from the web purchase menu's implemented-skill filter.
- GameSession advances this controller on real levels that contain it. The normal Three.js WorldRenderer uses the existing original holder_ready_indicator atlas frame. Alpha0→160 and scale1.2→1.3 use original2.3-second looping quad_out tween keys and shared epoch. No AI/new art or combat-stat/RNG changes.
- Visual objects are disposed on level change. Modifier visibility polls at the original0.2-second coroutine wait, rather than instantly following every gold change.

## Original execution evidence

`export_buy_available.lua` executes shipped original modifier/controller functions and original systems.tween. `verify_buy_available.mjs` checks576 original condition cases,299 tween samples and four independent100-tick per-holder timelines, including forced early polling and gold/hide transitions. Per-holder sorting deliberately does NOT claim global allocation traversal equality. The controller's real minimum-cost result is checked, not a mirrored expected constant.

The fresh coupled native stage3 iron runtime now exposes modifier target IDs and tower holder IDs in trace snapshots without altering helper results. Normal GameSession and original runtime both create11 holder modifiers on tick10. Current native first wizard shot508 and first gold discrepancy691 are unchanged; this is not a main-script-order fix. Coupled original global IDs/table reconstruction still passes2782ticks/3714events.

Full npm test and production build passed after production integration (buy-available-full-test.log, buy-available-build.log); the later trace/test extension also passed directly. The known bundle-size warning remains.

`browser_buy_available.mjs` uses normal UI with a completed first-campaign replay save. It verifies original pulses on affordable holders at245gold, then builds three70-gold archer towers through the menu and observes all indicators hidden at35gold. It asserts visible meshes, scale bounds, offsets, opacity and no page/missing-asset errors. Screenshots web-buy-available-pulse.png and web-buy-available-insufficient.png were produced; the first was visually inspected.

## Next required integration

This controller was one missing source of noncombat entity IDs (native mods60–70 before first soldiers/towers in the smoke fixture). Its onCreate hook is available but has not yet been wired into the single global allocator. The fisherman bubble and other scene controllers, all projectile/FX/particle allocations and removal phases must share that allocator before exact native next iteration can drive normal main-script scheduling. The known catapult before-enemy-movement read discrepancy remains. Unfinished tower/hero skills, all six natural flows, startup/audio and complete video comparison remain required.

## Runtime alternative examined

A read-only checkout of CppCXY/luajit-rs at5ee79bc58ea41fd1817d8a80435db526122045b1 was inspected as a possible browser host for the original scripts. Its compiler/undump.rs accepts its own version1/fixed-width format, while this APK uses LuaJIT version2/GC64 bytecode. It was not adopted, built, installed, or added to production dependencies. A compatibility claim from its README alone was insufficient evidence for replacing the runtime.
