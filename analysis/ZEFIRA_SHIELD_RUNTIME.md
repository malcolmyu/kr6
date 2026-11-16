# Zefira shield: actual detector, aura and slow entities

The web runtime now executes the shipped Zefira own-main detector (scripts_game7445), shield insert/update/remove (7488/7499/7590) and slow modifier lifecycle. `scripts/export_zefira_shield_templates.lua` exports original templates with precise floating-point values; `export_web.lua` includes the export. This replaces the previous pre-phase automatic shield in actual entity sessions. The legacy isolated API remains for existing isolated skill tests.

The first hero main queues the detector; its next-flush main starts the cooldown and captures the hero's position object. It waits for the original cooldown, a live melee target and the original SSO elliptical range query, then queues the shield, skill XP and cast sound. Actual shield insertion applies 0.3 physical/magic armor. Start/loop/end animations retain native sprite clocks, loop hits create actual damage, hit FX and optional slow modifiers in source order. Duplicate slows refresh the existing timer and reject the newly queued entity; actual removal restores speed. Shield removal undoes its own armor buff. Three.js renders original EXO parts at native 30fps through removal.

The differential exposed related real engine mismatches:

- Barracks arrival used to replace `hero.pos`; it now mutates that object, preserving the detector/aura's captured reference.
- Zefira ranged cooldown uses original elapsed subtraction and an inclusive boundary; melee selection uses its distinct strict greater-than boundary. Absolute deadlines plus an epsilon incorrectly advanced some attacks by a tick.
- Skill XP is processed while automatically approaching a melee target; explicit deployment/animation locks still gate it.
- Hero melee acquisition selects the nearest eligible enemy by Euclidean distance. Generic soldiers select foremost path progress. The alternative unblocked target query only applies to a retained target, matching the original if/elseif control flow. Both use actual spatial candidates and Lua sorting.
- A target killed during an existing generic melee windup still receives the original queued zero-effective damage packet and hit FX/RNG effects. Health processing awards no second reward.
- Actual soldier corpse alpha/removal now runs in the native tween phase, preserving removal queue order relative to other tween entities.

## Whole-runtime evidence

`verify_native_hero_profile.mjs` replays ordinary build/wave/hero-rally/barrack-rally commands against the exported original runtime. Every frame compares RNG draw count, IDs, actual Lua entity-table order, insert/remove queues, economy, outcome, soldier membership, HP, positions, path nodes, targets, hero XP, effective armor and check/shield/slow clocks/animations. Final entity events must also match. Expected events never drive production.

| Input | Frames | Events | RNG draws | Unit states | Enemy states | Check/shield/slow states | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Video-inferred opening profile | 2055 | 702 | 1955 | 10242 | 7721 | 2054 / 0 / 0 | Prefix matches; no outcome claim |
| Basic shield, Gerald nodes unspent | 2782 | 2573 | 7833 | 13854 | 21560 | 2781 / 282 / 0 | Complete native defeat matches |
| Duration/slow shield upgrades, Gerald nodes unspent | 2782 | 2713 | 7929 | 13854 | 21803 | 2781 / 402 / 339 | Complete native defeat matches |

The two shield runs use legal saved nodes and actual native level/wave/enemy/hero scripts. Gerald's unspent nodes isolate the shield family. The original mixed profile with Gerald skill_a/skill_b/upg_a still fails at tick2112: native Gerald creates a decal/modifier that the web legacy skill path lacks. `--shield` retains this failing comparison; it is not included as a passing gate. Implementing Gerald's actual skill controllers is the next known engine task. The 2055-frame opening ends before a shield is cast, so it proves the detector/identity/timing prefix, not shield animation or damage.

The ordinary video-guard six-route strategy now records victories in 1-1,1-2,2-1,3-1 and defeats in 2-2 and 3-2. Latest3-2 defeat is at63.9333s. Earlier3-2 victory results are historical and must not be presented as current after native hero targeting/cooldown changes. No balance edits were made to force victory. This deterministic strategy is not a video replay; input/profile/difficulty/RNG uncertainty still prevents video economy matching (native70 at media77 vs reference90).

Browser/render and final test/build results are recorded below after their processes finish. Full first-three-level/video/startup/heard-audio fidelity remains incomplete.

Final verification: full `npm test` including the three new profile gates exits0; production build exits0 (existing large-chunk warning). Native exports have no missing resources or animations. The focused Chrome test passes actual queue/insertion boundaries, rendered EXO start/loop/end, armor buff, damage, slow refresh rejection, cast-sound event, and full buff/speed/registry/renderer cleanup. Screenshots retained; loop screenshot visually inspected. The separate hammer+shield browser check was repaired to observe actual shield entities and use registered cinematic enemies while preserving hero position identity; it also passes. Both browsers report no page/asset errors and close. These controlled fixtures use synthetic durable enemy HP/placement and do not establish natural victory, heard audio, or reference-video parity.

Export audit caught a filename collision with the older isolated shield oracle exporter. Template export now uses `export_zefira_shield_templates.lua`; `export_zefira_shield.lua` again regenerates the isolated native coroutine oracle. Regenerated six cases/1446 frames and effect lists exactly equal the retained original JSON; no oracle expectations were changed. Both distinct exporters remain in `export_web.lua`.

Follow-up: the previously failing mixed Gerald-enabled2782-frame input now passes actual courage/retribution modifier/FX/armor/reflect bodies and improved main timing. See [GERALD_MODIFIER_RUNTIME.md](GERALD_MODIFIER_RUNTIME.md); the earlier2112failure remains historical evidence, not a current failure.
