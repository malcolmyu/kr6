# Actual Fated Survivor and teleport lifecycle

The complete first-three-level/video/startup/construction/heard-audio objective remains active and incomplete. This milestone replaces the normal-session Fated Survivor shortcut with the original own-main death branch and registered teleport lifecycle. It does not certify every mixed higher ability or the complete reference video.

## Production behavior

`GeraldSurvivor` now has a normal-session own-main path. The skill cooldown starts at the hero's first main resume. The existing original death continuation runs before the hero chooses between Fated Survivor and ordinary death. Both purchased and unpurchased Gerald now use native health death semantics: lethal HP clamps0 and preserves the action/target through health.

An eligible Fated Survivor keeps its blocked target, starts the original143-frame animation and sound, grants damage immunity and waits the original two seconds. It queues the original decal with the hero's shared position, queues the teleport modifier only when the current target is still present/alive, adds50/100/150 skill XP, restores40/70/100% maximum HP, clicks and health bar, and removes damage immunity. The remainder of the same animation can be interrupted by a new rally or lethal packet. A second death during the tail resumes the outer main and follows the ordinary death path on its next loop; it does not restart an available-looking shortcut.

During cooldown, the same hero uses `HeroLifeRuntime`, including the actual death animation, upgraded dead lifetime, level-up respawn immunity, original own-main continuation and retained entity identity. The earlier legacy helper remains for isolated/public-model callers; actual sessions no longer use it.

`EnemyTeleportRuntime` owns queued insertion, rejection, main progression and removal. Its modifier is a real allocated/bound entity. It preserves source/target identities, queue visibility bans, insertion immunity/stun, own-main use count, original start/end effects, hidden interval, blocker release, path-history/node-validity rewind and the separate removal flush. Metadata comes from the shipped templates through `export_gerald_survivor_templates.lua`.

Accepted native insertions do **not** execute the rejection dequeue callback. The queued F_ALL contribution remains throughout teleport and is popped when removal is queued; stun and damage immunity end at the following removal flush. A previously isolated manual insert/dequeue harness missed this distinction. The actual engine fixture and effective visibility checks exposed it, and the new lifecycle oracle now models real queue/dequeue behavior. Enemy shadows and smoke dodge attachments also hide while the unit's sprites are hidden.

## Evidence

- `export_native_survivor_life.lua` / `verify_native_survivor_life.mjs`:36 original death-branch traces,23040 frames across three skill ranks, two clock origins, alive/dead/missing targets and a second lethal packet during recovery. Raw HP/dead/immunity/click/XP, animation clocks/loops, shared decal position and complete decal/modifier/sound request streams match. Ordinary melee/growth/movement/regen are deliberately isolated in this helper fixture; the actual engine run below supplies integration evidence.
- `export_native_teleport_runtime.lua` / `verify_native_teleport_runtime.mjs`:90 original lifecycle traces,9000 frames across three maps, two clock origins, three starting nodes and normal/cap/dead/boss/immunity rejection. Effective queue bans, count/stun/immunity, registration/removal boundary, hiding, cross-path destination and effect clocks match. Rejected insertions dequeue; accepted ones retain their contribution until removal is queued.
- `verify_native_hero_profile.mjs --survivor`: a legal6500XP Gerald profile with the prerequisite node chain and28 ordinary controls reaches a natural first Fated Survivor at4736, heals at4796, registers the teleport at4797 and finishes the recovery tail at4879. No HP/wave/price/outcome overrides are used. It completely matches6223 frames/14142 entity events/42055 RNG draws through a natural defeat, including38777 unit states,98015 enemy states,143 survivor states,59 registered teleport states and30 registered survivor effect states. Source/target IDs, modifier insertion clock, effective bans, hiding, immunity, queued XP and cooldown are checked in addition to the previous full-battle gates.

The strategy was adjusted using ordinary controls to exercise this branch: Gerald moves to the upper road and later closes on the archers; a later fire rain protects the lower road. Two build commands were postponed until affordable. These are diagnostic strategy choices, not a new video transcription or a successful3-2 strategy claim.

The longer coupled run exposed a separate Zefira shield condition. Original `U.get_blocked` can return a dead entity that is still registered and still assigned as the hero's target until its own main resumes. The web check incorrectly demanded positive target HP. It now checks target presence, allowing the original5359 aura request and the subsequent full simulation to match.

Native snapshots now record effective visibility via the original accessor rather than copying raw cached flag-stack fields. They also expose hero queued XP/click state/C cooldown and modifier source for stronger comparisons. Recording does not supply expected state to the web simulation.

## Reproduction and limits

```sh
npm run test:survivor-runtime
npm run test:gerald-survivor
npm run test:survivor-battle
npm test
npm run build
```

The existing isolated survivor/teleport tests are retained, with their actual-session synthetic enemy registered through the normal entity queue. The browser survivor fixture intentionally supplies a frozen enemy and lethal damage to inspect the original effects, health recovery and disappearance/return; it complements the ordinary-input engine run and does not constitute an unmodified browser playthrough.

The actual ordinary-input Chrome replay also passes all6223 ticks/14142 entity events,55 draw checkpoints and1105 original sound requests through defeat. The same full renderer driver retains the earlier8699-frame victory case. Screenshots cover the actual survivor cast, hidden target, arrival, recovery completion and outcome. The controlled browser additionally asserts registered modifier presence, F_ALL/immunity while hidden, actual body/shadow hiding, body restoration and immunity/bans removal after the real flush; its returned target is at node70.

The native audio harness now loads and binds the original GUI callback876 for `enemy-reached-goal`, so its1105 requests include the real life-loss sound at6222. The wave UI request at1464 and defeat UI request at6223 are asserted separately because those GUI listeners are not installed by the engine harness. All remaining request names/order/raw clocks match. This checks requests, not decoded mixing or heard-audio equivalence.

An older browser fixture tried to use `spawn` as an immediate collection insertion and could kill the hero before his first main initialized the skill clock. It now waits for actual entity registration and the first hero main. Those fixture failures were corrected without changing production cooldown/death behavior.

Continuous video input/profile/RNG reconciliation, all remaining mixed/higher ability paths, complete health phase dispatch, visual comparisons and heard-audio acceptance are still open. A passing defeat fixture proves faithful behavior for those controls, not completion of the requested whole game.

Final verification: production build and the final default `npm test` passed, including both new original-function oracles, the complete6223-frame coupled case and both original sound-stream gates. The ordinary survivor browser replay, prior victory browser regression and controlled body/shadow/registered-modifier check all passed without missing assets or page errors. Their artifacts are `browser-native-survivor-battle.json`, `browser-native-full-battle.json` and `browser-survivor-runtime.json`.
