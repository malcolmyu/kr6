# Knight B / 战斗坚韧

Status: shipped source/controller port, 14 controlled original-runtime chains, a complete ordinary campaign route through natural defeat, and complete browser rendering comparison. Normal-menu browser coverage includes three purchases and exact healing pulses. Knight C, remaining advanced controllers, winning skill combinations, six fresh-save routes and video/listened-audio acceptance remain unfinished.

## Original evidence

Original `soldier_knights_lvl4.insert` and full `soldier_knights_lvl4.update` bytecode are exported by `scripts/export_knight_skill_functions.lua`. The update cannot be decompiled reliably; its actual bytecode and native execution determine the implementation. The exporter also retains `U.y_wait`, `SU.y_soldier_wait`, and the latter's private `soldier_interrupted` predicate. Original data are in `analysis/knight-skill-templates.json`, `public/data/knight-heal.json`, and the existing tower atlas.

The UI's 战斗坚韧 is native `skill_b`, costs180 per rank, and restores25%/40%/60% of maximum HP. Its purchase taunt is `TowerKnightsOrderSkillATaunt`; the cast request is `TowerKnightsOrderResilienceCast`. These A/B letters follow the original localization/sound mapping.

## Coroutine behavior

* A heal can start only after the actual melee controller returns `A_IN_COOLDOWN`, when wounded and `now - lastCast > 15`. Idle wounded knights use ordinary regeneration instead.
* Purchasing rank1 backdates the cooldown by15 seconds when the soldier consumes its power-change flag. Ranks2/3 retain that cooldown. A newly inserted or replenished knight inherits its rank/fraction and starts with the template's zero clock.
* An active heal owns the soldier's main coroutine. Power changes wait until it returns to the outer loop. Buying another rank during a cast leaves that cast's configured fraction unchanged.
* The first wait lasts8/30 seconds and checks rally change, native death and stun while waiting. As in the original wait helper, reaching the time boundary is tested before interruption. The cooldown stores the cast's start time only after this wait succeeds.
* The first pulse adds `hp_max * fraction / 2`, clamped to maximum HP. The second wait starts at that actual first-pulse time and lasts `18/30 - 8/30` using native subtraction comparisons. It has no interruption callback. The second pulse uses the same arithmetic. The coroutine then waits for the original30-frame heal animation before yielding to its outer loop.
* Lethal damage during the second wait can be followed by a positive-HP second pulse while native `health.dead` remains true. The corpse stays dead, cannot resume combat or become an eligible live target, and retains its hidden health bar. Native death timing is represented separately from HP.
* Each newly created knight now deep-clones its template components. The stun fixture exposed that the previous shared `unit` object could incorrectly stun all three soldiers when mutating one soldier. Original entities have independent components.

The production implementation is `KnightHeal.ts`, dispatched at each soldier's real native main slot and the existing tower power-change/insert boundaries. Armor and healing remain independent controllers. `soldierIsDead` preserves the native knight death marker for damage, blockers, ranged targeting and Gerald modifier eligibility. Existing unnamed minimal health test objects remain supported.

## Controlled native chains

Run `npm run test:native-knight-heal`. All14 chains run1200frames each, totaling16800frames,4957entity events,6436RNG calls,1476 named sound requests and2884 native heal-animation states. They cover:

* Separately purchased ranks1/2/3 and inherited initial ranks1/2/3.
* A wounded idle source that never enters a heal cast.
* Death before the first pulse and between pulses, including natural corpse lifetime/replenishment.
* Stun before the first pulse and between pulses, with recovery.
* Upgrading the tower while a soldier is casting.
* Rally changes before the first pulse and between pulses.

Every frame compares native entity table order, IDs/count/max, insertion/removal queues, all event history and RNG boundaries, resources, soldier HP/position/death/hidden-health-bar state, rank, enabled state, configured fraction and cast cooldown. Native heal animation names/clocks and all original sound request order/ticks are also checked. These cases inject a fixed original enemy/tower, lock hero mains and raise damage through actual damage entities; power-change controls are explicit fixtures rather than ordinary resource spending. The initial red trace lacked healing and first failed at213. Later death-between and stun cases exposed the corpse-health and shared-component issues rather than suppressing them.

Evidence: `knight-heal-before.log`, `knight-heal-final-chains-verify.log`, `knight-heal-native-export.log` and `knight-heal-interrupts-verify.log`.

## Ordinary campaign route

`probe_knight_heal_route.mjs` records67 legal commands using original400 starting gold and legal saved6500XP heroes/6000XP powers. Unaffordable opening builds wait for actual income. Holder7 buys all three B ranks at9945/12015/12735. No HP/resource/outcome forcing occurs in this route.

Original outcome is defeat at12886, gold29, lives0. The complete logical trace passes12886frames,20227entity events,44051RNG calls,9893 knight heal-configuration states and341 heal-body animation states. Generic full-battle checks include all units/enemies/hero XP and health, modifiers/projectiles, positions (existing1e-7 tolerance), global queues and later outcome. `npm run test:native-knight-heal-mixed` also matches1947 named native engine sound requests, with GUI wave/defeat requests checked separately.

The full original source JSON is584777521bytes, SHA256 `5a0820d342ef11de983c590ed41ca87212d8f6124281e4669424acfc8ab4e48c`. Complete frame stream SHA256: `5d8fecd3028c5f2fa3e1032b5d6db6bdc48a23e9538f55651aae9f34b2ec643c`. Fields are streamed without projections or dropped frames.

## Real renderer and normal menu

`npm run test:knight-heal-battle` checks508 independently recorded original render checkpoints and70174 submitted original frame keys, including all341 original heal-body frames. Heal atlas frame names must match native animation/frame indices and every visible native heal body must be present. Generic native scene order/metadata, all battle events/resources/RNG/sounds, and the actual defeat GUI also pass. See `analysis/browser-native-knight-heal-mixed-battle.json`, `knight-heal-mixed-browser.log`, and `web-native-knight-heal-mixed-defeat.png`.

`npm run test:knight-heal` uses the normal build/upgrade/purchase menu, spends180 per purchase, and verifies two actual25/40/60 HP pulses, original atlas frames, cast requests and purchase audio triggers. It uses a quiet wave program, a fixed high-HP target and accelerated cooldowns. Screenshots `web-knight-heal-rank1.png` through `rank3.png` show the original heal sequence. A fourth cast is killed after its first pulse; the test verifies the resulting60-HP corpse stays dead with no attack and no rendered health bar, while its body remains visible (`web-knight-heal-dead-positive-hp.png`). These controlled rendering checks and the naturally failing ordinary route do not prove video fidelity, heard audio, or a winning Knight B strategy.

## Final regression

Full `npm test` completed successfully (`analysis/knight-heal-full-regression.log`). Production type checking/build passed (`knight-heal-build.log`), and `git diff --check` is clean. Final focused native chains and mixed-battle sound/logic replay also completed with exit0 (`knight-heal-final-chains-verify.log`, `knight-heal-mixed-final-verify.log`). Both normal-menu and complete-battle browser scripts completed with exit0; heal screenshots were visually inspected. These results preserve the broader unfinished-goal boundary above.
