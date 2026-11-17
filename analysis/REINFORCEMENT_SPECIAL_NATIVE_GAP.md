# Special reinforcement native runtime

The original tick80/nextId gap is fixed. The native session now creates registered ingress/aura/damage/armor models at the special soldier's first own main, with original global-table target order, insertion/main/timed/tween phases and source/target ownership. The old isolated ReinforcementAura helper remains only for its isolated legacy tests.

## Current evidence

`npm run test:native-knight-legacy` and `test:native-knight-legacy-all` now run all16 original controller chains (19200 frames), including natural special timeout, lethal special death, death during entrance, and overlapping repeated casts. The former two retained failing cases pass without projecting out native entities, queues or RNG. The default regression also uses the all-chain gate. The576 original C stun cases remain included.

For the four special cases, the verifier additionally checks all soldier HP, positions, physical/raw armor and inflicted damage factor, reinforcement health.dead/health-bar state, actual modifier clocks/source/target/rank/duration, source-tracking positions, alpha and tween disabled/reverse/remove flags. Original requests are compared in order with their actual ticks. New source snapshots retain full native tween state and damage factors. Logs: `reinforcement-special-all16.log` and individual expiry/death/early/repeat logs.

The shipped special entrance coroutine continues after lethal damage and starts death only after its previous-render completion. Likewise active three-part melee owns main and delays expiry. Timeout removes modifiers, captures hp_before_timeout, rotates the blocker queue, walks50 units and retains the invisible registered corpse until health cleanup. Damage uses the actual queued damage entity and hit FX. Modifiers have original duplicate refresh and independent lifecycle. Armor removal during an unfinished forward tween preserves the shipped early-return side effect; completed armor reverses after subtracting once. Explicit removal does not stop a still-running modifier main: next-frame death can remove its reversing tween early.

`ReinforcementSpecialRenderer` draws actual registered ingress and armor atlas sprites, clocks and z1400/native painter keys. `browser_reinforcements.mjs` passes through the normal saved-rank6 UI cast and checks three units, real entrance/three-part attack frames, actual damage/armor sprites/material alpha, .9 scale,12s cooldown, real damage/sword request and departure cleanup. Both screenshots were regenerated; `web-reinforcement-special-attack.png` was visually inspected. This browser uses a quiet controlled wave and injected target; it is not an ordinary-wave or video acceptance result.

## Render-clock corrections exposed by the ordinary battle

Special looping walk/idle animation_start retains the preceding sprite clock. The renderer now keeps that clock across attack-out/movement/cooldown rather than falling back to birth time. Exact body animation/clock/loop checks cover every registered special state, including early-death and full-wave routes.

Health-bar fades now belong to the simulation's render phase (`HealthBarRuntime`), not the cadence of browser paints. Both552 original fixture states and the same552 states with sparse paints pass. The full ordinary battle checks63882 original health-bar frames at the1886 paint checkpoints, including zero-alpha bars. Original shadow-blade smoke explicitly clears alpha without clearing its fade clock; that callback is connected. Units crossing the goal stay renderable while registered until the following removal flush. Health-bar meshes submit outside the camera just as the original render list does; hardware clipping still handles pixels outside the viewport.

The complete default regression passed (`reinforcement-special-final-regression.log`). Subsequent smoke-alpha and goal-frame render-boundary corrections pass the complete native health-bar and Chrome comparisons described here, the final health-bar/smoke/focused reinforcement gates, and the production build.

## Ordinary full battle

An ordinary full-wave special-reinforcement campaign route now matches all13037 original frames through natural defeat,23399 entity events,42714 RNG draws and34022 registered ingress/aura/modifier states. Actual soldier HP/positions/raw armor/damage factor and modifier clocks/alpha/tween ownership are compared by the same shared frame assertions as the controlled tests. Position comparisons use the existing1e-7 world-coordinate tolerance; clocks, attributes, queues and alpha remain exact. The legal saved profile uses90000 reinforcement XP and its actual upgrade nodes,6500 hero XP and ordinary400 starting gold. The route generator records only accepted ordinary build/upgrade/sale/rally/wave/power commands; no HP/resource/outcome forcing. Defeat is at13037 with150gold/0lives. `test:native-reinforcement-special` also matches2246 original named engine sound requests and separately checks GUI wave/defeat sounds. Retained original source717162561bytes SHA256 `8f71cd2d9906764eb087c13a5b4ceb45a7c4427e48dc8e1298d7262c7633dd8b`; complete frame-stream SHA256 `b520247d62af7bf1867a1999640eff180f628737b892f5a4fc25103395a6387b`.

`npm run test:reinforcement-special-battle` now passes all1886 original paint checkpoints and257410 actual submitted native frames, including registered special-body/ingress/armor atlas frames, material opacity, all native visible health bars, original z/draw/position/order, complete tick/entity/sound checks and real defeat GUI. Report: `browser-native-knight-legacy-special-mixed-battle.json`; terminal log: `reinforcement-special-mixed-browser.log`. The final defeat screenshot was visually inspected.

The existing ordinary3-2 victory browser also passes after these global render-clock changes: all8699 ticks through original victory,187 paint checkpoints/41099 actual native submitted frames, original sounds and real four-second GUI continuation/pause. Log: `reinforcement-special-victory-regression.log`.

## Remaining acceptance

These controlled chains and ordinary profile battles do not prove every modifier combination, all original capabilities, complete heard-audio/pixel/video fidelity, or the six required fresh-save flows through3-2. The overall goal remains active and incomplete.

Original source evidence remains in `analysis/functions/reinforcement_*`, bytecode exports and the retained `level-entity-bootstrap-3-campaign-cleared-knight-legacy-chain-1-reinforcement-*-special-runtime-lcg104.json` traces. Exporter instrumentation asserts its source anchors; source coroutines and full table/queue comparisons are unchanged.
