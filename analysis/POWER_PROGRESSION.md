# Original power experience and cooldown presentation

Implemented from the supplied APK, 2026-11-15. This does not complete power upgrade rooms or video acceptance.

## Authoritative sources

- `all/systems.lua:60–66`: apply starting experience floor.
- `all/systems.lua:2102–2114`: initialize selected powers with saved XP, gain0 and level.
- `all/systems.lua:2116–2145`: gain on insertion of a user-power control. Reinforcements100, fire400, Royal320 per use. Expected-level correction uses battle-entry XP, not newly gained XP; mode factors include iron1.5. A level increase does not automatically purchase a skill-tree node.
- `sequels/game_gui.lua:7897–7930`: level and bar from entryXP+gain, thresholds6000/16000/32000/56000/90000, max6 with full bar. Original `game_gui_power_button` template positions XP bar at25.7,90 and level at−2,81.5, separate from keyboard labels1/2/3.
- `sequels/game_gui.lua:5330–5357`: save `floor(entryXP+gain)` for each selected power.
- `sequels/game_gui.lua:7932–7945` and initialization clip: cooldown mask phase `(ts-start)/cooldown`, clamped0..1. Base durations reinforcement15/fire60/Royal50. Previously the web Royal mask incorrectly divided by60. The active cast now snapshots its duration so a later configuration change cannot distort its current mask; early-wave bonus reduces remaining time as before.

`export_power_progression.lua` executes original initialization, insertion and GUI functions, with actual game settings/entity control templates and `utils.get_unit_level`. `power-progression-oracle.json` has1400 snapshots ×3 powers =4200 comparisons, crossing thresholds and max level across five entry XP values, five player levels, four modes and14 use counts. Numeric comparisons account for dkjson's15-digit decimal serialization. The cooldown oracle executes the original button update for21 boundaries.

## Web integration

`PowerProgression` retains entry XP separately from gained XP. Only successfully placed powers queue a control use; next `PowerSystem.advance` consumes the queue, once per control rather than per reinforcement soldier, meteor or affected tower. Invalid placement, selection, unavailable powers and cooldown rejection earn nothing. XP has no random draws or combat-stat changes.

Each slot's `Progress.powerXp` validates finite nonnegative values, saves integers, and loads into the new session with its actual player level/mode. It participates in the existing changed-XP5-second save, pause/pagehide/visibility/disposal saves, scene/restart/quit and outcome saves. Older snapshots cannot reduce saved XP. Old profiles start at zero; new/deleted slots do not inherit XP. HUD uses original bar art, level label coordinates and native fraction.

## Verification

- Core:4200 original comparisons, fixed entry-level multiplier across a level-up, invalid/successful real-session placements, one-use-per-control accounting, integer persistence, parsing, slot isolation/deletion.
- `test:power-xp`: normal keyboard/placement use of all three powers, naturally crosses fire5900→6300/level1→2, saves100/6300/320, reloads the same slot and restores levels/fractions. Browser had no page/asset errors; screenshots `web-power-xp-level-up.png` and `web-power-xp-reloaded.png` inspected.
- `test:royal`: original art,1.75 buff/expiry and native50-second mask phase pass after XP integration.
- Full native export, npm test and production build pass. Existing bundle-size warning remains (~842KB).
- Six-flow natural command probe rerun with power XP carried between stages. Outcomes/times/HP are unchanged: four wins, losses at2-2/122.8s (blade33HP) and3-2/108.933333s (blackguard25HP). Power XP now accumulates through all six entries. These arbitrary actions do not match the reference video's use counts or prove parity.

Remaining: native power room/equipment/upgrade purchases and their effects, readiness shader flash/refresh SFX, and complete visual/gameplay/audio comparison through3-2. Hero/power XP display in video is save-history dependent; do not force its level labels or grant upgrades merely to resemble a still.
