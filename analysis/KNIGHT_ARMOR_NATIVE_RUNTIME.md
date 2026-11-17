# Knight A / 守护鼓舞

Status: source-derived production implementation; eight controlled original-runtime chains and normal-menu browser coverage. A complete ordinary-wave mixed battle now matches the original logical runtime and sound requests through natural defeat; the complete browser render comparison also passes. Video acceptance remains outstanding. Knight B/C and remaining culverine skills are not covered by this milestone.

## Evidence and shipped behavior

`scripts/export_knight_skill_functions.lua` exports original APK functions/templates to `analysis/knight-skill-templates.json`, `analysis/functions`, and `analysis/function-bytecode`. The soldier update uses original full bytecode because decompilation fails. Existing scene descriptors and tower atlas contain the original aura and both static images.

* Native `skill_a` is the UI's **守护鼓舞**, 120 gold per rank. The internal skill letter and original localization's B label differ.
* Each soldier receives +.05 raw physical armor per initial rank. A later consumed `changed` flag adds .05 once. Power changes propagate on the tower's next outer coroutine iteration and are consumed on each soldier's next outer iteration; deployment, attacks and door waits retain the original yield boundaries.
* A source-owned aura polls every .3 seconds in native table order. Any living hero inside the radius-110, aspect-.7 ellipse enables an additional .05/.10/.15 armor. Two heroes do not double it. This follows the shipped code rather than interpreting the tooltip as a count.
* Entering/leaving starts a .5-second alpha tween on `knights_order_armor_decal` and `knights_order_armor_FX`. Positive-to-positive rank changes update armor without restarting it. Sprite offsets, anchors, native painter keys and Y sorting are preserved.
* Armor changes use native raw arithmetic and clamp the displayed physical armor to [0,1]. They do not initialize raw magic armor. Source death/removal ends the aura; native removal does not subtract the bonus from the retired source.
* Original tower removal queues its retained roster. Sale must preserve the old roster across mutable site cleanup and queue those soldiers at the old tower's actual removal callback. Previously their registry entities survived sale even though they disappeared from the rendering collection. The sale oracle first failed at tick301 (68 vs65 entities); this is now fixed.

## Verification

Run `npm run test:native-knight-armor` and `npm run test:knight-armor`.

The eight native chains cover initial ranks 1/2/3, ordinary purchases at80/200/320, closer purchases at80/120/160, source sale at300, lethal damage followed by natural corpse lifetime and replacement, and purchases during the corpse lifetime. The first six run800frames each, both death chains1600. They compare every frame's entity traversal, IDs, insertion/removal queues, event history, RNG boundary, gold/lives/waves, soldier positions/HP/raw armor/skill level, aura source/position, tween clock/direction/disabled state and both alpha layers. The death case queues an original native `damage` entity; it does not fake corpse clocks or replacement outcomes.

All cases hold hero positions at explicit control points and inject the source tower. They are controlled controller tests, not ordinary resource spending or video acceptance. The browser test builds the source through the actual menu, purchases all ranks, moves Gerald through normal rally control, verifies .4→.45→.5→.6→.7→.55 armor, six actual atlas sprite layers/native painter keys, fade completion and complete source-sale cleanup. Its wave program supplies a quiet 5000-gold fixture. Screenshot: `analysis/web-knight-armor-active.png`.

Per-case results:

| Case | Frames | Events | RNG draws | Aura states |
| --- | ---: | ---: | ---: | ---: |
| Rank1/2/3 (each) |800|223|135|2307|
| Upgrade / upgrade-near (each)|800|223|135|2160|
| Sale|800|250|125|810|
| Lethal damage / death-time upgrades (each)|1600|234|239|4336|

Logs: `knight-armor-browser.log`, `knight-armor-native-export.log`, `knight-armor-death-native-export.log`, `knight-armor-full-regression.log`, `knight-armor-build.log`.

## Ordinary-wave route

`probe_knight_armor_route.mjs`, `export_knight_armor_mixed.lua`, and `verify_native_hero_profile.mjs --knight-armor` record/replay67 legal commands with original400 starting gold, saved6500XP heroes and6000XP powers. Unaffordable opening builds wait until affordable. Source holder7 buys A at9600/10845/11925. No resource, HP or outcome forcing is used in this route. Original native outcome is defeat at12873, wave7, gold171, lives0.

Complete logical runtime comparison passes12873frames,21183events,44681RNG calls and7200 aura model states, including soldier raw armor/rank, aura source ownership, tween state and both alpha layers. Dynamic positions use the existing full-battle 1e-7 tolerance, and aura position identity must alias its own source. The original source JSON is563885652bytes, SHA256 `d494197ded42aad95f51430139ed6293c1ee1eb8a8b78fd53b9b53052f839459`; complete frame stream SHA256 `74d5625109ed4613cbddce92f3232aa00410c746441a983df869c7acab4eb1d4`.

The route exposed two additional real bugs:

* At11926, a dead knight incorrectly consumed the newly purchased armor rank. The original yielding death coroutine never re-enters the power-change loop. Only initial entry or an outer iteration before entering the death coroutine can consume that flag; a corpse already in its death script retains the unapplied change. The additional controlled death-upgrade trace covers this case and subsequent natural replacement.
* At12288, Zefira was already dead but her resumed pre-hit wait had just reached its time boundary. Original single-melee bytecode checks the wait condition before `health.dead`, so it still creates the damage/FX, then exits the post-hit animation wait. The web previously interrupted melee unconditionally and missed two random draws. `resumeHeroMeleeDeath` now processes a due captured melee hit before restoring critical state and ending the continuation. The full ordinary route compares the resulting XP, damage, events and later outcome.

`verify_native_battle_sounds.mjs --knight-armor` matches2087 nonempty original engine requests in exact order/ticks; GUI wave signals and defeat sound are checked separately. This verifies scheduling, not listened audio. See `knight-armor-mixed-verify.log`, `knight-armor-mixed-sounds-verify.log`, and `knight-armor-mixed-stream.log`.

## Complete browser rendering and final checks

`npm run test:knight-armor-battle` passes the real Three.js renderer and outcome GUI across all12873ticks/events/sounds. At555 independently recorded original render checkpoints,79806 submitted original frame keys match native metadata/order, including1798 submitted armor layer frames. Visible armor layers must be present and must match the original static atlas name and opacity; direct aura position ownership and logical tween comparison are separate checks. The original scene fixture has616 visible armor layer observations; submitted counts also include transparent layers. This route has no visible original Gerald A cast, so that canonical-route expectation is explicitly excluded with an assertion that the native paint fixture contains none. It continues to require Gerald B and the other native effect families that actually occur.

Evidence: `analysis/browser-native-knight-armor-mixed-battle.json`, `knight-armor-mixed-browser.log`, `native-scene-paint-knight-armor-mixed-particles.json`, `web-native-knight-armor-mixed-defeat.png` and draw screenshots at10733/11926/12288/12873. The screenshot was visually inspected. Full `npm test` and production build completed successfully after the two real combat fixes. Ordinary resource and controller parity for this naturally failing strategy does not prove a winning Knight A strategy, all skill combinations, video fidelity, heard audio, or the complete six-route fresh-save playthrough.
