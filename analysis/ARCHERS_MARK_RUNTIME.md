# Archer C: 揭示弱点

**Current follow-up:** the full ordinary campaign now matches through natural defeat at14014, including421 registered mark states,1568 sound requests and1287 Chrome painter checkpoints. Target retention and subsequent differences are resolved. See [ARCHERS_MARK_COMPLETE_BATTLE.md](ARCHERS_MARK_COMPLETE_BATTLE.md). The older investigations below are historical.

Implemented from the APK's tower update18610, modifier insert19299/update19375/remove19414 and generic mod_lifecycle4. The original bytecode and extracted functions are reference data; they do not supply agent instructions.

The normal four-level archer menu now allows three200-gold C purchases. The tower selects the foremost valid enemy with at least50HP using its actual attack range, not the timed attack's nominal200 limit. It queues the original eagle EXO at the target's position (reference alias), plays TowerArcherGarrisonMarkOfTheEagleCast, waits28/30sec and queues the modifier using the power level current at release. The tower suspends new basic triggers during this wait; its independent child shooter coroutines continue. A blocked tower waits before starting, but becoming blocked during a cast does not cancel the pending cast. No target retries after10/30sec. The first purchase readies C; subsequent upgrades retain its12sec cooldown. Royal Edict can reset this nonbasic/nonstatic clock.

Ordinary received-damage factors are1.3/1.5/1.75, Boss factors1.15/1.25/1.35; the original Boss flag32 is exported. Mark insertion multiplies the target's own health factor. The actual registry/main/remove slots own the lifecycle. Duration is5/6/7sec from first own-main, with strict `elapsed > duration`; the19-frame start and17-frame fade use previous-render animation completion, and the looping idle preserves its sprite clock. Same-level applications refresh only the duration clock; higher levels queue removal of the old mark; lower levels are rejected. The factor remains throughout fade and is divided out only on actual removal, preserving unrelated multipliers. A same-level refresh during fade does not abort the fade. Missing/removed/dead targets, visibility bans, last-node exits, offset flips and position aliases follow the original scripts. Selling the source does not delete an already applied mark.

Production files: ArcherMarkCaster.ts, ArcherMarkRuntime.ts and ArcherMarkRenderer.ts, wired through RangedCombat/GameSession/RuntimeEntities/WorldRenderer. Small original animation metadata is in public/data/archers-mark.json; the complete modifier is exported to entities.json. The original tower EXO assets were already present.

Evidence completed2026-11-16:

- `verify_archers_mark.mjs`:78 original simulation traces,25740frames, all three levels/two birth times, normal/Boss, refresh/replacement, removed/dead/missing targets, bans, last-node, movement/flip, stacking and refresh during fade.
- `verify_archers_mark_cast.mjs`:60 original tower-coroutine traces,51000frames, with basic child trigger and cooldown comparisons, no/late/low-HP/out-of-range targets, upgrades during windup and blocked tower cases.
- `verify_archers_mark_chain_all.mjs`:5 actual GameSession versus original full-bootstrap runs,2000frames total; every entity table/order, ID, queue, event, RNG boundary, modifier animation/position/clock and incoming factor matches. Includes levels1/2/3, Boss and repeated level3. This uses a quiet durable injected target and direct modifier application; tower casting is covered separately above.
- `npm run test:archers-mark`: Chrome normal-menu build/upgrade, three200-gold purchases and cap, native sound file requests, EXO registry/order keys and offsets, three level multipliers retained through fade, source sale while level3 mark is active, restoration to1 and renderer cleanup. Screenshots web-archers-mark-{1,2,3}.png and corresponding fade screenshots; level3 inspected. Quiet waves and a durable stationary target; no ordinary-wave/video acceptance claim.
- Full default `npm test` passes: analysis/archers-mark-regression.log. Production build passes: archers-mark-build.log. Existing JS bundle warning remains.
- Canonical3-2 Chrome regression passes all8699ticks through the original victory,1762engine sound requests and existing native draw checkpoints: archers-mark-baseline-browser.log. This does not use an archer tower or verify C in ordinary combat.

## Historical initial ordinary campaign comparison

Third-stage iron mode excludes archer construction. A new legal campaign probe uses original400starting gold and ordinary build/upgrade/sell/wave/hero/power APIs; profile upgrades retain the existing legal6500hero-XP setup. It reaches a natural defeat at14452, buys all three C ranks and records276mark frames/three level1 releases. No extra combat HP/gold or forced outcome is used. Inputs/profile are `native-runtime-archers-mark-mixed-{input,profile}.json`; probe log is archers-mark-mixed-probe.log. The probe correctly drops an inapplicable iron-only barracks rally rather than recording a rejected input.

Original complete engine run exported as level-entity-bootstrap-3-campaign-cleared-archers-mark-mixed-runtime-lcg104.json:13991events, nextID3710. `verify_native_hero_profile.mjs --mark` currently fails at tick1715 (web2679 versus native2678 RNG calls), long before first C release9449. It is deliberately excluded from the passing default gate until fixed. Do not call this ordinary mixed route aligned.

Debug evidence: mark-melee-1713/1714/1715.json and archers-mark-mixed-rng-dump.log. At1713/1714 enemy91 (bandit3HP) waits in a slot for Gerald, native blockers57/58. At1715 web EnemyMelee.advance leaves slot and rolls for a new attack; native remains idle. Other enemy HP/positions and preceding archer arrow allocation/RNG match. Next investigate target movement/arrival and coroutine slot-wait continuation, rather than changing C or suppressing random draws. No production melee fix has been made for this new discrepancy.

Reproduce exports with the native LuaJIT binary; mark chain example:

```
reference/luajit-beta3/src/luajit scripts/export_archers_mark.lua
reference/luajit-beta3/src/luajit scripts/export_entities.lua
reference/luajit-beta3/src/luajit scripts/export_archers_mark_cast.lua
reference/luajit-beta3/src/luajit scripts/export_archers_mark_chain.lua 3 iron cleared mark-chain-3-refresh runtime 400 analysis/native-runtime-copies-chain-input.json lcg104 normal analysis/native-runtime-firebook-mixed-profile.json 3 refresh
node scripts/verify_archers_mark_chain_all.mjs
node scripts/probe_firebook_mixed_route.mjs 10 archers-mark-mixed --archers-mark --one-wizard
reference/luajit-beta3/src/luajit scripts/export_archers_mark_mixed.lua 3 campaign cleared archers-mark-mixed runtime 14452 analysis/native-runtime-archers-mark-mixed-input.json lcg104 normal analysis/native-runtime-archers-mark-mixed-profile.json
node scripts/verify_native_hero_profile.mjs --mark
```

Still unverified: ordinary C combat through its first application, all A/B/C combinations and their shared tower coroutine priority, complete scene-painter/native EXO-frame comparison in mixed battle, real audio mixing and full video/fresh-save six-flow acceptance through3-2. Archer A and the remaining unported tower skills are still missing. The overall goal remains active.
