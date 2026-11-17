# Knight C / 继承遗志

Status: production C aura/attack/stun implementation, green core controller and chance/lifecycle gates, normal-menu browser coverage and an entire ordinary campaign route with real rendering. The two retained special-reinforcement failures are now fixed, and two additional entrance-death/repeated-cast chains pass with actual modifier/armor/tween fields. The ordinary special-reinforcement battle now also passes13037 frames/2246 named sounds/1886 Chrome checkpoints; broader combinations and the overall goal remain incomplete; see `REINFORCEMENT_SPECIAL_NATIVE_GAP.md`.

## Original behavior

The original knight function exports, full soldier update bytecode, C aura main and named stun callbacks are under `analysis/functions` and `analysis/function-bytecode`. `scripts/export_knight_skill_functions.lua` also retains base stun insert, attack-order generation, soldier death and native wait helpers. Source-derived data are in `public/data/knight-legacy.json`.

C is125 gold per rank. Each knight owns a radius100, aspect.7 corpse detector, polling every.3 seconds in its actual native main slot. A living source detects another soldier (including heroes/reinforcements) with native death or HP<=0 and no `health.death_finished_ts`. A reinforcement with `hp_before_timeout` is excluded, even when that numeric value is0. Generic knight/base-reinforcement death main now records the original death-animation completion marker; heroes already retain it in their own life controller.

Detection switches attack1 off and attack2 on, then performs the original eight-second yielding wait. It does not re-check source existence, death or new corpses during that wait. Afterward it restores attack flags and reaches the outer yield; only on the next main call can it remove for a missing/dead source or poll again. This preserves source sale/death while sleeping and avoids repeated boosts from completed corpses.

Initial/inherited ranks configure attack2 cooldown as attack1's cooldown times .8/.6/.4 and select the named rank1/2/3 stun modifier. A source's first own main queues the aura; later power changes run only on an outer soldier iteration, and rank1 queues it. Tower changes propagate at the real tower outer-loop boundary. Active melee/cast/deployment yields retain the captured attack and delay power consumption.

The enhanced hit creates damage first, then queues the actual named stun at the same coroutine point, with captured source/target IDs and attack level0. The modifier lifecycle rejects an existing same-template modifier before rolling chance, without refreshing it or consuming RNG. Otherwise its original insert wrapper accepts `random <= .1/.2/.3`, then executes normal stun target/visibility/death checks. Different rank templates and Zefira stuns own separate stun counts. Native expiry/removal and captured target position/offset/flip are preserved. The original enhanced attack and shared stun atlas are rendered; the detector itself has no render component.

## Controlled proof

`npm run test:native-knight-legacy` now runs all16 original chains plus the576 original chance/lifecycle cases. The original12 core chains are described below; the four special extensions are documented in `REINFORCEMENT_SPECIAL_NATIVE_GAP.md`. Core chains cover inherited and separately purchased ranks1/2/3, late purchase after an old corpse's animation finished, source sale during its eight-second wait, exact ellipse inclusion/exclusion, normal reinforcement expiry and normal reinforcement combat death. Each chain runs1200frames: total14400frames,5579entity events,5820RNG calls,1249named sound requests,6411enhanced-attack states and1085registered stun states.

Every core frame compares native table order, next ID/count/max, pending queues, complete event history and random boundaries; resources; soldier HP/positions/rank/death completion; both attacks' enabled/cooldown/modifier fields; aura source/target/position; stun lifetime/source/target/level/sprite clock/name/flip/offset; enemy HP and stun ownership. Original sound request order/ticks are checked too. These fixtures inject a fixed original enemy/tower and lock hero mains; they are controlled controller tests. Reinforcement fixtures queue the same direct controller as their original harness rather than bypassing GUI availability checks in product code.

`verify_knight_legacy_stun.mjs` checks576cases/161280frames at two global birth times, probability values0/.1/.100000001/.2/.200000001/.3/.300000001/.9, duplicate/different-rank/hero stuns, dying/missing/removed targets, bans/boss/ignore-stun and moving offsets/facing. All match original state and RNG.

`npm run test:native-knight-legacy-all` now passes all16 chains, including the two former special failures and the new entrance-death/repeated-cast cases. Default regressions use this full gate. The first C implementation red trace was31/nextId78 vs81; no expected queues/IDs/RNG were suppressed to implement the C controller.

## Ordinary battle

The recorded route uses original400 gold, legal saved6500XP heroes/6000XP powers and67 ordinary commands, with no HP/resource/outcome forcing. Holder7 buys C at9600/10905/12405. Original outcome is defeat at12623, gold96, lives0.

`npm run test:native-knight-legacy-mixed` matches all12623frames,20529entity events,43048RNG calls,6217aura states,580enhanced attack-body states and33registered stun states. It also checks1989named native engine sound requests; GUI wave/defeat requests are checked separately. The route creates9/17/5 rank1/2/3 stun candidates and accepts1/1/0 respectively. Thus its rank3 stun has no registered visible effect; rank3 acceptance/rendering is instead covered by the controlled chain and normal-menu browser. Dynamic positions use the existing1e-7 full-battle tolerance.

Original full JSON:558252078bytes, SHA256 `47417ef7ac02fa1865244cc3ceeaa1aba8f09a11629f3f070a075ec194522c81`; complete frame stream SHA256 `674b7a6641d271a3d8402047428961c55cc35f9efc62401fad243ba0a287495d`. Frames/unknown nested metadata are retained, not projected.

`npm run test:knight-legacy-battle` passes the actual Three.js renderer across641original render checkpoints and92971submitted original frame keys, all580enhanced attack-body frames and33stun frames. Every visible native C body/stun must be present and use its actual original atlas frame. Generic native ordering/metadata, complete battle events/resources/RNG/sounds and real defeat GUI also pass. This naturally failing strategy is not a winning-route or video acceptance.

## Normal menu

`npm run test:knight-legacy` builds the tower and buys all three ranks through normal menu actions at125each. It verifies native .4 rank3 cooldown, real damage-driven friendly death, enhanced attack and stun atlas frames, actual stun count, rendered modifier's registered native key, eight-second restoration without completed-corpse retrigger, and all three purchase taunt requests. It uses a quiet5000-gold fixture, a fixed high-HP target, deterministic .25 chance and accelerated expiry. Screenshots: `web-knight-legacy-active.png` and `web-knight-legacy-expired.png`.

Logs and full report: `knight-legacy-before.log`, `knight-legacy-core-verify.log`, `knight-legacy-stun-verify.log`, `knight-legacy-mixed-verify.log`, `knight-legacy-mixed-sounds-verify.log`, `knight-legacy-mixed-browser.log`, `browser-native-knight-legacy-mixed-battle.json`, and `knight-legacy-browser.log`. Full video/listened-audio acceptance, all winning combinations and all fresh-save routes remain unfinished.

## Final checks and explicit unfinished gate

Default `npm test` completed with exit0 after fixing a controlled sale-fixture input that tried to inject damage into the already removed source at500. The original fixture naturally finds no source then; the web fixture now applies the same source-presence condition, retaining all frame/event comparisons. Production build/type checks passed; `git diff --check` is clean. Both normal-menu and full ordinary-battle browser checks completed with exit0, and the active screenshot was visually inspected.

The two current special-reinforcement failures are re-run separately and retained in `analysis/knight-legacy-special-current-failures.log`; the gap remains open. Default test success does not supersede the explicitly unfinished full14-chain gate or overall video/fresh-save requirements.
