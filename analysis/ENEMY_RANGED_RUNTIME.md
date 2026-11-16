# Shadow archer actual ranged runtime

The active goal remains the complete Vue/TypeScript/Three.js reconstruction through 3-2, including startup, sound and construction effects. This change closes the concrete missing bullet at observed tick3402; it does not establish complete video parity.

Production now advances shadow-archer targeting and shooting at its own actual entity main position. It uses the native soldier spatial query, unstable Lua distance sort, visibility and elliptical min/max range, insertion-time range variance, retained target, blocking priority, cooldown/chance and original attack animation/shoot delay. Invalid-target exit yields before the next walk/range acquisition. Attack sprite clocks and facing are synchronized with the enemy melee continuation.

Shots are actual queued `bullet_shadow_archer` entities. Insertion verifies target registration, starts the original parabola and sound, and retains the initial hidden frame. Own-main motion, target proximity, dodge, physical health packets, blood, water splash and ground-miss selection are connected to actual queues. Arrow removal waits for its removal flush; the impact body is still present beforehand. Ground arrows are actual tween entities with the original 2.1-second alpha, drawn and removed with their registered model. Blood plays its insertion sound. Existing isolated legacy helpers remain for unrelated families.

Two additional native discoveries were necessary: expired soldiers must be removed in native entity traversal order rather than array insertion order (tick3761), and a ranged exit must resume same-tick target acquisition on the following main, rather than insert one walking movement (tick4349). Neither correction changes prices, damage, starting gold, waves or outcomes.

## Authoritative comparisons

`export_enemy_ranged_templates.lua` exports precise original attack and bullet configuration to `public/data/enemy-ranged-runtime.json`; it is included in the main web data export. Existing native arrow trajectory and helper checks remain. `verify_native_hero_profile.mjs` now checks the registered enemy arrow position, rotation, destination, hidden state, insertion clock and target; ground-miss position/rotation/alpha, FX clocks, and shadow-archer pose/facing are checked alongside full entity events, IDs, RNG, units, enemies, resources, other hero/modifier/projectile state and outcomes.

- `--observed`: 4500 frames, 7707 entity events, 24307 RNG draws, 25077 unit and 51544 enemy states, 315 enemy-arrow and 371 arrow-effect states. Exact checked-state/event agreement. This is an opening prefix with no outcome.
- `--observed-hold`: the same17 ordinary input commands/profile, last command3151, then no additional player actions. Original execution stops at4671 (155.7 seconds), defeat, gold336, lives0. All4671 frames/8214 events/25971 RNG draws match; 25932 unit/56456 enemy/360 enemy-arrow/401 arrow-effect states. This is a complete prescribed-input defeat, not the rest of the reference video's actual play or a natural victory. There are now19 complete native input fixtures plus explicitly labeled prefixes.
- Original fixture `analysis/level-entity-bootstrap-3-iron-cleared-video-observed-hold-runtime-lcg104.json` reports no missing resources/animations. The input/profile are separate read-only comparison data; expected events are not used to drive production.
- Both new comparisons are included in `npm test`, retaining earlier prefixes and full fixtures. Native hold export and both initial strict comparisons passed. Production build passed with the existing bundle-size warning.

`npm run test:enemy-ranged-runtime` passes in Chrome: actual own-main shot → pending arrow → next-flush insertion/hidden frame → rendered flight and rotation → physical hero damage → queued blood/removal → next-flush blood/removal. A normal hero move causes the second shot to miss; native decal alpha and complete registry/render cleanup are checked. It checks ArrowSound/HitSound dispatch, page errors and asset responses. The durable stationary enemy and quiet wave program deliberately isolate this integration; audio is not subjectively heard/accepted. Flight, impact and miss screenshots are saved as `analysis/web-enemy-arrow-*.png`; flight image visually inspected. Browser closes in finally.

## Ordinary six-route probe

Added optional `KR6_PROBE_OPENING=observed` to the normal playthrough probe: stage3 iron builds7/4/5 catapults,6/10/11/8/1 wizards and uses observed barrack9 rally (570.6667,321.0667). It changes only ordinary player commands. `video-guard` hero movement remains in the native viewport, without changing combat values or forcing results. Output: `analysis/enemy-ranged-observed-playthrough.json`.

Results: 1-1 victory20/276.8333s; 1-2 victory1/152.4667s; 2-1 victory20/433.9s; 2-2 defeat0/135.2333s; 3-1 victory17/674.5s; 3-2 defeat0/260.1s. The first3-2 leak is blackguard5826, 28HP, path2/node213 at260.0667, already beyond the visible goal buffer. Earlier shadowblade leak at63.9 is avoided with this changed opening; the later failure remains explicit. These are strategy results, not proof of source fidelity or the whole reference playthrough.

Remaining: 2-2/3-2 ordinary victories, later reference commands/profile/RNG uncertainty, unported mixed/high-tier behaviors, and full startup/construction/visual/heard-audio comparison. Media77 gold70 vs video90 remains unresolved input/profile/RNG evidence, not grounds to alter original balances.

Final verification: full `npm test` process22286 exits0 with both new native gates and all previous checks; build75673 exits0; Chrome45912 exits0 and closes; ordinary probe60796 exits0. Flight and miss screenshots inspected. No required full-goal verification is inferred from these narrow checks.

Follow-up: longer ordinary inputs exposed Gerald rally protection, waiting-blocker destination/cancellation, mixed health/pop ordering and upgrade lifecycle gaps. They are corrected and the new prefix6078 passes, while the next mismatch is actual hero death at6079. See [GERALD_RALLY_RUNTIME.md](GERALD_RALLY_RUNTIME.md). Current ordinary2-2 wins;3-2 still loses209.1667s. The previous260.1-second result above is retained as prior-runtime evidence.
