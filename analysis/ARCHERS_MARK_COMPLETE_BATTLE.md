# Archer C complete ordinary battle

2026-11-16. This milestone does not complete the overall video/fresh-save goal.

The legal stage-three campaign route now matches the original APK through its natural defeat at tick14014:15204 entity events,45895 RNG calls and421 registered mark states. Original starting gold is400; final gold169 and lives0. The input uses ordinary construction, upgrades, sales, waves, heroes and powers with a saved6500-XP hero profile and6000-XP powers. It purchases all three C levels; this is not a claim that every level casts in ordinary combat. No combat HP/gold or outcome is forced.

Inputs/profile are native-runtime-archers-mark-complete-{input,profile}.json. The original oracle is level-entity-bootstrap-3-campaign-cleared-archers-mark-complete-runtime-lcg104.json. Older mixed-prefix artifacts remain separate.

Four production differences were resolved:

- Persistent soldier.target_id survives a removed target while the active blocker target detaches. The original blocker_rank returns nil for a missing entity and permits local selection. Twelve original helper cases/720frames verify retention, replacement and reset without ghost attacks.
- Gerald A/B death handling distinguishes predeadline cancellation, due-time payload commitment and postcommit animation exit. Fifty-four original hero traces/1050frames verify clocks, XP, actual queued effects and sounds.
- Walking facing uses the current path node to destination, including off-node positions and crows. All three maps, paths and lanes across five enemy families match195 original traces/143357frames. Fatal/death crow animation assertions are also retained.
- Ordinary arrow blood insert sounds now play at actual registry insertion, correcting a one-tick lead. Full battle matches1568 valid original sound requests in name, order and tick. This does not verify perceived audio mixing.

Chrome checks all14014 simulation ticks and1287 original painter checkpoints, including eagle/mark EXO part atlas frames, positions, layers, visible-part completeness, contiguous parts and actual submission order. The63MB painter fixture is streamed checkpoint by checkpoint; two earlier attempts closed the renderer when sending it whole. Streaming retains every original checkpoint and assertion.

Evidence: archers-mark-complete-verify.log, archers-mark-complete-sounds-verify.log, archers-mark-complete-browser-streamed.log and browser-native-archers-mark-complete-battle.json. Full npm test passes in target-retention-regression-final.log; build passes in target-retention-build-final.log with the existing bundle-size warning. Canonical3-2 browser victory still passes in target-retention-baseline-browser.log.

Reproduce with npm run test:native-archers-mark and npm run test:archers-mark-battle (Vite on5173). Independent modifier/caster/chain and quiet UI gates remain available.

Remaining: ordinary victory with this archer route, Archer A, full native A/B/C shared coroutine interplay, remaining knight/culverine powers, fresh-save six-route acceptance and full startup/video/audio comparison. The goal remains active.
