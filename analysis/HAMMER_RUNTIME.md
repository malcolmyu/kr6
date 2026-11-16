# Zefira hammer actual area, stun and decal bodies

`ZefiraHammerRuntime.ts` now runs actual-session hammer selection/cast/impact as part of Zefira's own entity main, replacing the pre-main legacy impact path. The original area helper is SU1707, generic stun insert/update/remove4679/4729/4790, and the two-part ground decal's own main is scripts_game1592. Precise attack/stun/decal data is exported by `export_zefira_hammer_templates.lua`, included in export_web. Existing standalone legacy skill APIs remain for their isolated callers.

Selection still enters through the soldier melee-slot/special-attack hook. It consumes the original chance draw and minimum-target query, grants skill XP at cast start, and captures facing. Actual continuation uses precise hit_time and previous-render animation runs. It preserves pre-hit interruption behavior and the native deadline distinction, commits cooldown only at impact, and emits the sound-stop event when the coroutine ends. Each hit target comes from the actual entity table, not the SSO candidate table: the original area helper uses table.filter with its own damage flags/bans/ellipse and no path-validity gate. Minimum-target selection uses SSO and path validity. Damage packets are allocated before their per-target roll, then each stun modifier is queued before the next target's damage; impact FX and ground decal follow all target pairs. Native area damage does not multiply by the basic melee unit factor.

Actual stun insertion validates visibility/death, refreshes an existing same-kind modifier by rejecting the new one, and increments its own stun contribution. Its own main captures the target position reference and original sprite clock; expiry/death queues removal, and actual removal decrements its contribution. This preserves independent other stun sources. The ground decal starts its one-second idle wait on first own-main update, retains the queue-time idle/particle clocks, then plays its21-frame out animation and queues removal. The renderer draws the actual ground/particle EXOs and stun sprites; the separate13-frame impact EXO is registered and visible only after insertion.

## Related native-order fixes

The longer comparison exposed two additional concrete differences:

- A hero about to start a ranged attack must not first execute idle regeneration. Generic actual-session hero bodies now request idle/regen and finish both after ranged selection. A ranged coroutine finishing resumes directly into idle/regen once. This fixed web Zefira healing159→170 at2590 while native remained159. It was not a level-up event.
- Shadow-archer range variance is sampled by original insert1918 after enemy_basic.insert, not by wave creation. Actual sessions now sample it in the insertion callback; standalone sessions retain their existing helper path. The original wave-spawn lane/gem draws stay in their original phase.

## Native evidence

The unrestricted observed-profile comparison previously stopped at2386 (web next508/native516). It now matches every checked state through3401. New `--hammer-prefix` explicitly verifies that prefix without an outcome claim:

- 3401frames /4398entity events /13288RNG draws;
- 18884unit states /30367enemy states;
- 3400shield-check states /282shield states /684Gerald modifier states;
- 262hero-projectile states /93actual hammer stun states /156actual hammer decal states.

All17 ordinary recorded/inferred inputs are issued by then, including the two reinforcement casts, fire rain and Royal edict. This is still an inferred profile with placement/timestamp uncertainty. The affordability-checked build2082 remains within the observed82–83s window; no balance/currency changes were made. Entity IDs/Lua table/insert-remove queues/RNG/economy/HP/position/nodes/targets/XP/armor and actual projectile/skill clocks remain checked. Native export now additionally records unit stun count/flag; these are compared where supplied. Stun/decal target/position/animation/sprite/modifier clocks are explicitly compared. Expected events do not drive production.

`verify_native_hammer_cast.mjs` also compares6 original helper cases/396frames/18area packets across all3ranks and both facings: hit/completion waits, skill XP, damage, ellipse exclusions and queued stun/impact/decal bodies. That original isolated helper fixture prescribes target selection and omits health; the3401-frame coupled comparison supplies normal acquisition/health integration evidence for the base purchased skill. Higher-rank full-game integration is not established by the isolated cases alone.

The full unrestricted comparison remains available and fails3402nextId1207vs1208. Native shadow archer869 creates/queues bullet_shadow_archer1207 toward soldier799 in its own main. The current EnemyRangedCombat still uses a separate unregistered arrow collection and pre-main timing. Implement that actual enemy ranged/arrow main/health family next; adding an allocation placeholder would not resolve the missing behavior. Enemy attack visuals and unregistered arrow state are outside the new prefix's checked fields. No full4500-frame parity or final outcome is claimed.

## Browser and regression evidence

Focused upgraded-hammer Chrome uses a legal5500XP/skill_a/upg_sa1/upg_sa2 save, an actual registered durable/frozen enemy, and real melee-slot acquisition. It checks36queued skillXP,80–100damage from the cast-start HP baseline, damage/stun/FX/decal queue boundary, next-flush stun and three EXOs, target position reference, same-mod refresh rejection with unchanged sprite clock, native out animation, stun decrement only at removal flush, sound start/stop and full entity/renderer cleanup. A synthetic duplicate modifier explicitly isolates refresh. This is controlled behavior evidence, not a natural victory or heard-audio/video acceptance. An initial browser assertion incorrectly counted earlier basic attacks as hammer damage; the baseline was corrected, with no production change. The separate combined hammer+shield browser was updated to inspect actual hammer models and also passes. No page/asset errors; impact screenshot inspected; browsers closed.

Final full npm test10575 and production build6831 pass; existing bundle-size warning remains. The earlier full suite83068 also passes the current production changes. New three-rank cast and3401-prefix gates are in the final suite. Native resources/animations missing lists remain empty.

Current chasing-guard strategy:1-1win20/276.8333s,1-2win1/152.4667,2-1win20/432.7,2-2defeat0/124.2667,3-1win17/679.4,3-2defeat0/63.9333. A separate fixed video-position strategy wins campaigns including3-1with20life/670.6333, but still loses2-2/3-2. These are ordinary heuristics, not video replay acceptance. The probe's escape report previously read only the remaining live collection and lost removed escape bodies; it now captures escape history at the actual escape tick. The guard run is rechecked with that reporting correction below.

Full three-level/video/startup/construction/heard-audio fidelity remains incomplete, with media77native70gold vs reference90 still unexplained by the inferred profile/input/RNG. Goal remains active.

Escape-report recheck64013 exits0 with unchanged guard outcomes and no out-of-viewport command positions. The retained history now identifies the3-2failure: shadow blade532 escapes at63.9s with19HP on path1/node208 (goal-buffer position beyond the visible map). The previous empty escape array was a reporting omission after removal, not evidence that no enemy escaped. Both this guard input and the fixed-position input still lose3-2; the observed video input's later wizard-site order differs from these heuristic openings and remains useful future strategy evidence. All new processes terminal; Vite remains.

Follow-up: the missing shadow-archer bullet at3402 is now actual runtime and strict observed checks extend through4500, then complete held-input defeat4671. See [ENEMY_RANGED_RUNTIME.md](ENEMY_RANGED_RUNTIME.md). This supersedes the previous next-gap note, without changing its earlier prefix scope.
