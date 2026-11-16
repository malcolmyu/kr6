# Normal tracked particles and shared lifecycle

The complete1-1through3-2 reconstruction/video acceptance remains incomplete.

## Production changes

FirebookTrailSystem now reports actual emitter removal when its particles have finished, and GameSession links the emitter descriptor to the projectile's stable local source ID. The shared registry receives that real callback. Wizard PS108 now queues removal558, PS106 at559, and following flushes match. Cleanup is not a guessed lifespan timer.

Normal catapult shots now emit the original ps_catapult smoke through the existing Three.js particle renderer:100particles/second, static tower_catapult_projectiles_pojectile_particle frame, original1/3second lifetime, random uniform scale from1to0.5, matched X/Y scale, alpha255→0 and nontracking rotation. Each particle consumes three original RNG draws: lifetime, rotation even when spread is zero, then scale. Source disappearance stops emission and waits for remaining particles to die before the real registry removal callback. This adds the actual smoke and its RNG consumption to normal gameplay.

The common helper still implements the three known wizard/firebook/catapult configurations; arbitrary native particle spin/velocity/features and complete global particle iteration are not claimed. Renderer uses the original atlas frame, not generated replacement art.

## Original execution and precision

export_catapult_particles.lua runs actual shipped projectile/main/particle systems in48isolated and48coupled splash/health/pop cases. Each case has100frames and covers multiple origins/destinations/birth clocks, constant and varying rolls, live impact or forced source removal. Both sets match all random counts, source/emitter membership, emission clock, particle timestamps/lifetimes/positions/frame/alpha/scale/rotation/order and cleanup:9600frames/59,616particle samples total. Coupled mode also matches actual damage and landing-pop selection/placement/rotation.

The first test caught an overlooked zero-spread rotation draw (3vs4total calls on first emission including projectile rotation); original bytecode confirms the unconditional frandom call for nontracking rotation. Another initial coupled export mistakenly retained the firebook fixture's40damage override after copying the harness; removed it so both paths use the actual catapult template values. Production stats were not changed.

precise_json.lua emits actual17-digit JSON numbers for fractional IEEE754 values. This preserves the original1/3second death boundary rather than dkjson's default14-digit rounding. Existing wizard64cases/6720frames and firebook48case suites still pass.

The old landing-pop verifier failed once smoke existed because its original Lua exporter explicitly sets particles_name=nil while the JS verifier had not. JS now matches that existing explicit isolated input. Normal production particles remain enabled; the new coupled splash/pop/particle oracle covers their joint random stream.

## Normal battle evidence

The actual GUI-driven GameSession/native comparison now matches584ticks of complete global IDs, creation/queue/accepted-or-rejected insertion/removal events, full Lua entity-table order/count/max/nextID and pending queues. It includes catapult PS114's actual removal572. Previously the registry first differed558, then572 during this work. No native events or actor snapshots drive GameSession.

The first remaining registry gap585 is original pop_zap_blue127 creation, whose callback is not yet connected. Blood pool586, pops/tween/corpse/melee/power records and more remain. Actor position divergence605, HP divergence619 and gold divergence691 remain unchanged in the constant-half fixture.

## Opening evidence corrected

Inspection of the full export log caught an actual test-harness defect from the earlier dispatch integration: replay_observed_opening's capture wrapper dropped RangedCombat's fourth interleave argument. Thus enemies never walked in that capture, and paired input-driven native/web opening checks could pass with zero real shots. Those zero-shot capture results are INVALIDATED as opening evidence.

The wrapper now forwards dispatch. Capture and both opening verifiers assert nonempty emissions from both families. Inputs explicitly record actorPhase=before-enemy-main and a moving flag. Native independent walking comparison now applies the PREVIOUS frame's movement/speed between pre-main snapshots; its old current-frame rule caused23errors at a block transition after dispatch was restored.

Regenerated input/native outputs and final tests now contain4actual catapult and12actual wizard emissions,2055frames,4257catapult and2468wizard source-animation states, and7373independent native walking samples with0errors. These remain INPUT-DRIVEN component comparisons prescribing actors/HP/order, not independent full-game/video acceptance.

## Actual remaining melee diagnosis

The coupled native snapshot now records blocker lists, soldier targets/rally/motion/animation and create-event owner IDs without changing original helpers. At605 native knight71 targets90 and matches the web position. Native72 is still finishing an attack on89, while web72 has already dropped it and retargeted90. Native73 targets91 and blocks it; web73 also targets90, letting91 move an extra step. This makes the next work concrete: original soldier coroutine wait boundaries and blocker-rank alternate-target selection. Original SU_soldier_pick_melee_target chooses an unblocked alternate for blocker ranks beyond1, and heroes use nearest instead of foremost. Current web loop does not fully implement these semantics. Native enemy-death3035 and enemy740bytecode were also extracted; no new death implementation is claimed here.

## Validation and full scope

Full original export19815 completed, then the corrected nonempty opening capture/native exports6474 were regenerated and passed. Final npmtest/build41341 passed after those corrections. Fresh native coupled trace15901 and normal registry584tick/eightstartup checks also pass. Logs particle-lifecycle-{full-export,final-test,build,opening-capture,opening-native,coupled-export}.log. Existing bundle warning only. Browser results are appended after observation.

Fresh normal-action probe34412 (particle-lifecycle-playthrough.json):1-1win20/266.5667s,1-2win1/148.0333s,2-1win20/427.7s,2-2defeat123.9333s,3-1win7/671.9s,3-2defeat106.8s. Still4wins/2losses. The normal RNG now includes actual catapult smoke draws. This is not a fidelity win/loss score or full-video proof.

Fresh video-bar-mid seed104/scene13.5/middle-window diagnostic still first differs at media76:75versus70gold; holder11purchase82.5rejects90gold. Coverage120seconds, not full3-2. Unfinished skills, allsixflows, full global main/health/SSO/RNG behavior, startup/audio and complete video comparison remain required. Goal active.

Browser81285 completed exit0: normal catapult four-rank building/upgrading/directional attacks/reloads plus real smoke frame, material opacity, renderer position/scale/rotation and complete particle cleanup passed. web-catapult-native-trail.png visually inspected. Wizard four-rank/trail/damage/pop regression and localStorage guide/XP/reload/slot migration regression also passed; no page/missing-asset errors. Logs particle-lifecycle-browser-{catapult,wizard,progress}.log. All65740/32495/28541/35324/19815/54454/6474/41341/34412/15901/81285 handles are terminal; early failed checks are described above, not treated as passes. No native producer/browser/test remains. Registry first gap585 and melee605/619 remain; goal active.
