# Native entity registry now drives normal tower/enemy ordering

The full HTML/Vue/TypeScript/Three.js reconstruction through3-2 remains incomplete. This milestone replaces the prior descriptor-only foundation with an actual GameSession allocation/queue owner and uses its Lua table iteration to interleave normal ranged tower sources and enemy walking.

## Production changes

- RuntimeEntities owns NativeEntityRegistry and NativePersistentEntities in every normal session initialized by applyStageSetup. It loads original component/editor/controller metadata (2302template defaults), executes existing native bootstrap/first-insertion semantics, and binds real site/hero/enemy/scene model objects to descriptors. Combat-facing local IDs remain stable; native global IDs belong to the shared registry.
- Actual fish/buy-indicator/soldier/enemy callbacks allocate and queue objects through that owner. GUI building flags are consumed in tower_upgrade phase at the next tick; builders insert the following tick. Completed tower and dust allocate at the existing completion-queued tick and insert next tick. Atlas timed entities use original frame count/FPS/duration metadata and previous render completion. Tower replacement binds its new source on actual insertion.
- Wizard/catapult/firebook queued shots allocate at actual emission, bind to the inserted projectile object, allocate their particle-system descriptor on the first projectile update, and allocate damage records without inserting them. Hit FX now allocate after damage, matching the original script. Bolt removal queues at the real linger completion. Not every other bullet/FX/melee/power allocation family is wired yet.
- RangedCombat accepts a source dispatcher. Normal GameSession iterates the real registry table, updating tower sources and enemy walking at their actual registered positions. This removes the previous universal enemy-walk-then-all-towers order. Culverine supports a per-source update while retaining whole-session cleanup. Lower-level standalone helpers retain their explicit continuous/synthetic test API.
- Removed gameplay actors cannot continue walking through retained registry bindings. Existing source-upgrade controller invalidation, queued projectiles, onboarding/progression saves and GUI guards remain.

## Missing native controller found by the continuous comparison

After wiring the real callbacks, the first mismatch was background_sounds_kr5 removal at301. The original31354 coroutine draws7–13seconds, waits, then either plays a random ambient sound and immediately draws its next delay, or removes itself if a wave has begun and only_on_preparation is set. BackgroundSounds now implements this normal sound/RNG/lifecycle behavior before the fish main scripts. Twelve original coroutine cases/14,400frames verify preparation repeats, delay/selection draw counts and wave-start exit. This is actual AudioManager triggering, not proof of audible native audio equivalence.

## Authoritative independent evidence

verify_runtime_entities.mjs executes normal GameSession with the smoke GUI inputs and constant-half RNG. No native event order, IDs, actor poses, target choices or health values drive its runtime. Comparison against fresh shipped native execution proves557ticks of:

- All global creation IDs and create/queueInsert/queueRemove/accepted or rejected insert/remove events.
- Full Lua entity table order, count/max, next allocator ID and both pending queues on every tick.
- Scene bootstrap, fisherman bubble,11buy modifiers,3knights,5normal builders/completed towers/dusts, actual original waves, first paired wizard bolts/particle systems/damage/FX, first catapult launch and first bolt removal.

Eight additional ACTUAL GameSession entry configurations match original first insertion: tutorial first stage, replay and iron, second-stage introduction/replay/chess controllers, third-stage campaign/iron. Earlier pure registry/SSO verifiers remain separate; these new checks bind normal gameplay models and execute its real callbacks.

The coupled normal battle now predicts the first catapult impact at763,247, exactly matching native, instead of755,247. First six wizard emission ticks still match508/513/569/574/630/635. Actor positions/nodes/HP match through604, and HP matches through618. Previously the first HP mismatch was562. Current first actor-position difference is605 (bandit3/native91 moves one extra tick while native holds); first HP difference619 (bandit2/native90 web22/native25). First gold difference remains691 web80/native75. These are actual remaining failures, not acceptance results.

## Exact next registry gap

The first registry mismatch is now558: original queues removal of ps_tower_wizard_bolt_trail108; its real trail cleanup callback has not yet been connected to the registry. Original removes bolt107 at558 and105 at559, which now match. Catapult trail cleanup, pops/tween removal, enemy corpses/blood, melee/power damage records, additional scene allocations and replacement side effects also remain. The diagnostic preserves the first full-registry event/frame differences.

Main-script dispatch currently interleaves registered ranged sources and enemy walking. Hero/soldier AI, modifiers, powers and projectile movement still have partially batched phases; they must join complete native iteration. SSO descriptors/indexes are initialized, but actual combat target lookup has not switched to the native spatial grid. Invalid projectile insertion callbacks and all dynamic replacement/death hooks are not yet complete. Normal upgrade menu behavior is tested; exact native upgraded-soldier creation/old-source final-update timing is not claimed.

## Validation

Fresh full export27784 completed. Full npmtest/build88763 passed, then the removed-actor guard/background verifier and fresh metadata passed final npmtest/build41724. Existing bundle-size warning only. Logs runtime-entities-full-export.log/runtime-entities-{full,final}-test.log/runtime-entities-build.log. Browser regressions are recorded below after completion.

Fresh normal-action six-flow probe73233 (runtime-entities-playthrough.json):1-1win20/265.8s,1-2win1/150.5667s,2-1win20/432.9667s,2-2defeat127.9333s,3-1win8/672.4667s,3-2defeat109.6333s. Still4wins/2losses. Video opening replay video-bar-mid seed104/scene13.5/middle windows still first differs at media76:75versus70gold; holder11 purchase82.5 rejects with90gold. Coverage120seconds only; no full-video victory or profile/RNG identification.

Complete startup/audio/video fidelity, remaining skills and all six level flows remain required. The goal stays active.

Browser chain91368: normal construction/summon/enemy queue UI, wizard four-rank upgrade/projectile/trail/damage/pop checks and catapult four-rank/direction/reload/projectile/audio-trigger checks have passed with no page/asset errors. The current wizard rank4 screenshot was visually inspected. Storage refresh test is the last step in that chain; its terminal result is recorded in the ledger after observation.

Browser chain91368 completed with exit0: final localStorage regression also passed fresh-entry/mid-guide reload, guide/comic skip without fake victory, periodic and pagehide XP save/reload, slot isolation and legacy zero-star migration. Logs runtime-entities-browser-{queue,wizard,catapult,progress}.log. All38044/27877/59054/88763/27784/41724/73233/91368 handles are terminal; no producer/browser/test remains. Current normal registry gap remains particle cleanup at558; complete3-2 is unproven.
