# Catapult basic attack lifecycle and rendering

Current update: ordinary catapult A/B/C purchases are now implemented; C also participates in Royal skill-clock reset. See CATAPULT_TRAPS.md. Earlier unavailable-skill statements below describe their respective historical milestones. Ultimate and full end-to-end acceptance remain unfinished.

2026-11-15 continuation. This replaces the old generic catapult firing loop; it does not implement its Lv4 A/B/C/ultimate or establish final video/gameplay parity.

## Native evidence

`scripts_game.lua:19991–20344` is the shared four-level tower coroutine. Direct decompilation fails on GOTOs; the original loaded function is executed for comparison. Smaller helpers20054/20071/20094/20102/20110/20152 expose quadrant choice, direction-specific animation names, turn-in/turn-out waits, reload and ground projectile creation. Native insertion sets a quadrant-specific idle pose when enemies exist after tick1.

The old web loop skipped turn-in/turn-out/reload and used the generic shooter clock/animation. The native template uses40FPS for tower and loader sprites; Lv4 ammunition sprites retain the default30FPS. All eight catapult EXOs have their own frame counts, so using the EXO file's30FPS default for every part is incorrect.

`CatapultTowerSystem` now implements:

- strict basic cooldown and10-frame empty-target retry;
- initial target acquisition and longer prediction for choosing one of four weapon directions;
- native rotation animations or the direction2 `.725s` wait;
- `.325s` windup, then flight-time prediction and reselection restricted to the weapon's chosen quadrant;
- firing at the original retained point if the new query loses its target, rather than canceling or retargeting across quadrants;
- attack completion, turn-out, tower/loader reload and Lv4 ball reload;
- wait continuations before the next outer blocked-tower check;
- native looping-idle timestamp retention, state replacement on upgrade/sale and independent queued projectiles.

`klove.animation_db.fni` is executed in the oracle to determine completion, instead of approximating it with elapsed/duration. Its `runs` calculation anticipates the next tick. `NativeAnimation` implements that frame/runs rule and the explicit sprite FPS override. Other EXO callers keep their old behavior until separately audited.

## Path prediction

Original `path_db.lua491/517` uses `ceil(seconds * length(motion.speed) / average_node_dist)`, clamps to the current raw path's remaining nodes, and returns that lane's node position. It neither interpolates the current position nor follows a path connection. The original average node distance6 is now exported with navigation metadata.

`EnemyPath.nativePrediction` and the GameSession catapult callback use this rule. Zero-time/stationary prediction still returns a node, which differs from returning a shifted current position; Lua0 is truthy in the original foremost-enemy utility. Selection range/validity uses the predicted node, while choosing a direction uses the source helper's prediction interval. Other tower/hero targeting and full SSO ordering remain separate pending work.

## Projectile integration

Native catapult shots are ground projectiles with no bound enemy target. They enter on the next simulation tick, capture the tower's damage factor when queued, and survive source sale or upgrade. Insertion creates the original `CatapultMotion`, spin random draw and fire sound; the existing native-tested flight/AoE/crater/water behavior is retained. The RangedCombat queue is distinct from the old immediate generic projectile path.

## Verification and limits

-72 original cases ×540 ticks =38,880 script frames across four levels/two birth times/four directions, empty/lost/moved targets, same-quadrant fallback/reselection and blocking. Every part name/timestamp/loop/flip/runs, attack timestamp, target-query time and emitted projectile point/factor matches.
- Original animation_db.fni frame/runs boundary samples at30/40FPS match the TypeScript helper.
-3,120 original path predictions cover all first-three-stage lanes, stationary/zero-time inputs, different speed vectors, ceiling offsets and raw path ends.
- Integration verifies next-tick insertion, source-sale survival, no enemy target binding, captured Royal1.75 factor, actual AoE impact and GameSession's node snapping.
- Browser purchases/build/upgrades normally in an isolated high-gold/no-waves fixture. It covers all four levels/directions, rotation/attack/reload art,40FPS tower/loader and30FPS ball rendering, Lv4 ball reload and actual damage. The original spinning/hiding bomb, center19 versus offset16 damage, explosion and crater browser regression also passes.

The coroutine oracle isolates candidate choice and path prediction with controlled targets; it is not a complete native battle simulation. The separate path oracle executes the real path predictor. The browser freezes a stationary test enemy and is not a natural victory or audio/video acceptance.

## Natural probe after this correction

The unmodified-wave probe still has four wins/two losses. The former arbitrary strategy remains unchanged, including static hero positions and its automatic spell policy. Its before snapshot is `full-playthrough-before-catapult-controller.json`; the current six-flow trace is `full-playthrough-probe.json`.

| Flow | Before | Current |
| --- | --- | --- |
|1-1|win20 lives269.133333s|win20 lives264.633333s|
|1-2|win1 life148.6s|win1 life150.3s|
|2-1|win20 lives430.466667s|win20 lives429.233333s|
|2-2|loss122.8s, blade33HP|same loss/HP|
|3-1|win13 lives670.333333s|win11 lives669.133333s|
|3-2|loss108.933333s, blackguard25HP|loss63.333333s, blade39HP at upper exit|

Exact recorded-command replay reproduces both current iron losses. Earlier leak time in3-2 is not hidden or treated as video completion. The old generic firing behavior is not restored merely to improve the probe. Reference hero movement, power/hero upgrade history, spell timing, original target ordering/entity phases and the unresolved2-2 tower-layout difference still need comparison before final acceptance. Do not infer a tower upgrade merely from one differently shaded airborne rock in a video still.

Final verification after complete exporter integration: full native export, complete npm test and production build pass (existing ~855KB bundle warning). Final four-level browser also confirms the original projectile fire/impact events reach AudioManager.trigger, and all assets load without errors. All browser processes for this continuation completed and closed. Lv2 direction and Lv4 reload screenshots were visually inspected; no natural video/audio parity is claimed from those fixtures.
