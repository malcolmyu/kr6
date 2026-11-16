# Video comparison: missing defend markers and opening gold sensitivity

The full first-three-level/video/startup/construction/heard-audio objective remains active and incomplete. This turn fixes a directly observed visual omission and narrows the unresolved opening gold discrepancy. It does not identify the video's original save or RNG.

## Defend circles

The reference3-2 screenshots show gold defend circles at the left exit and upper exit. The actual web renderer explicitly excluded `decal_defend_point5`, even though its original atlas frame was already available. The missing circles were therefore a rendering omission, independent of the opening economy discrepancy.

Original `scripts_game.decal_defend_point5.insert34470–34516` uses `defense_point_decal`, the mapped position, `editor.alpha*10`, positive `editor.flip`, and z1400. The sprite is static; orientation does not select an animation or rotate this circle. It also sets path defend nodes and exit locations. Those gameplay defend nodes were already exported from the original path database by `export_navigation.lua`; this change does not change escape thresholds or wave balance. The later optional alliance seal branch is not claimed by this first-three-stage fixture.

`EnvironmentRenderer` now includes the entity and applies its original alpha/flip handling. First-three-stage placements are:

| Stage | World positions | Alpha |
| --- | --- | --- |
|1|330,352|100/255|
|2|104,391;360,521|100/255|
|3|-68,331;464,684|100/255|

`export_defend_points.lua` executes the actual native insertion function for all five mapped points at three clocks (15 observations). `browser_defend_points.mjs` uses the normal startup, existing save, native map/mode dialog, pause/quit confirmation and map return to inspect all three real renderers. It compares position, atlas name, material opacity, draw order, flip and anchor against the original insertion output. The1280×720 canvas fills the viewport with no debug shell, matching the reference's video coordinate system. Stage3 uses actual iron mode. No page errors or missing assets occurred. All three screenshots were captured, and the first and third were visually inspected.

The first two browser attempts had test-navigation errors (an incorrect quit label, then missing the original quit confirmation). The corrected test follows the existing native confirmation flow. Production navigation was not changed to bypass it.

## Gold remains unresolved

`probe_video_opening_seeds.mjs` runs256 controlled LCG seeds on the current web engine, holding the inferred profile, observed action windows,13.5s scene origin and original wave data fixed. It does not change production RNG defaults, prices, damage, lives or input times.

At media77, this bounded sweep produces70 or75gold, versus the observed90. None matches all four checkpoints76/77/80/82. Seed104 still gives70/70/85/95. Best examples such as seed16 give70/75/90/95, still short of reference70/90/100/100. This finite LCG experiment does not rule out all random states; it shows that merely choosing one nearby seed has not resolved the current inferred-input discrepancy.

`export_video_seed_probe.lua` independently runs the original APK engine with controlled seed16, the same profile and input. Its four gold samples and RNG boundaries match the web probe:70/75/90/95, with1775 draws at2055. Native playerLevel3/difficulty2 and zero missing resources/animations are recorded. This confirms this alternate sensitivity result, not full-state parity for every seed or identification of the video's RNG.

The original enemy bandit HP table is40/40/50/100 across the four global difficulties; the two lower settings do not provide a simple lower-bandit-HP explanation. This does not eliminate every difficulty-dependent effect. `entity_db.load18–42` resets templates and chained modules, so the inspected source also does not support assuming repeated-level upgrade stacking to fill the gap. No balance adjustment follows from either observation.

The next video-specific evidence to collect is the first lower-road projectile impacts/health bars and their targeting/timing, alongside the exact placement/release windows and save upgrades. The77s discrepancy remains explicitly open; it is not declared fixed by the defend-circle repair.

## Reproduction

```sh
reference/luajit-beta3/src/luajit scripts/export_defend_points.lua
npm run test:defend-points
node scripts/probe_video_opening_seeds.mjs 256
```

Production build and the targeted native-flow browser check passed. Simulation code was not changed; prior full engine gates are not presented as evidence of complete video/visual/audio acceptance.
