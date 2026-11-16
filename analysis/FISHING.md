# Original stage03 fishing scene

Full six-flow/3-2 reconstruction and video fidelity remain incomplete. This change implements the actual stage03 fish/fisherman interaction and fixes an unrelated scene-render RNG error discovered during integration.

## Normal production behavior

`Fishing.ts` ports original fish.insert35515/update35520 and fisherman.update35565. Real map positions/flip, original hidden fish, jump timing, click rectangles, queued tap effects, fisherman action1–5, bubble creation/replay, sound waits, five-fish achievement signal and20gold signal are connected to normal GameSession and canvas input. `FishingRenderer.ts` renders the original EXOs through Three.js. The old static EnvironmentRenderer skips these objects to avoid duplicate fisherman drawing. Scene disposal removes these sprites.

Normal GameSession consumes the fish RNG through its shared random callback. It forwards sounds through existing AudioManager and adds20gold exactly once when the original got-gold signal is emitted. The achievement signal is exposed; a complete persistent achievements subsystem is not claimed. Scene progress resets on level entry, as with the native script; existing campaign/XP/onboarding saves remain unchanged.

Important original semantics preserved:

- Initial fish delay draws integer5–10seconds. Each uncaught jump consumes another5–10draw but shadows/discards that cooldown rather than assigning it to the persistent variable. Catching sets15–20seconds; subsequent jump draws still remain discarded.
- `fish_tapped` is one boolean shared with the fisherman. Simultaneous catches collapse, rather than accumulating a catch queue.
- UI clicked flags are consumed while hidden without a catch; animation completion hides the fish without unconditionally disabling UI.
- `animation_start(...,1)` is nonlooping: the shipped helper recognizes only true/-1 as loop. Bubble's temporary ts+3 assignment is overwritten by animation_start on the same tick.
- Fish/taps/bubble use previous-render animation completion for main/timed waits and next-tick insertion/removal. Fisherman's47-frame sound delay keeps native floating-point wait behavior, followed by a yield; found_all is set after the fifth sound wait/yield and reward waits for action5's full131frames.
- Native bubble persists after completion. Fish stop after found_all and are removed after their own animation wait. Tap effects are timed originals.

## Independent original evidence

`export_fishing.lua` executes the shipped original coroutines, original utils helpers, animation_db.fni and systems.timed in nine fresh coupled scene cases: random rolls0/.5/.999 × no clicks/single catches/simultaneous bursts,3300ticks each. Inputs are GUI-style fish clicks. TS is driven only by those inputs, not native sprite states. All29,700 per-entity frame snapshots, sprite frame indices/flags/timestamps, random draw args/values/counts, create/sound/signal order and each removal tick match.

One explicitly excluded global-order difference is retained: at roll0/burst/tick1971 native timed removes tap13,tap15,tap14, while local array removes tap13,tap14,tap15. The verifier compares removal timing by entity and preserves strict non-removal event order. This is not proof of global IDs/Lua table iteration equality; the shared native registry still needs integration. Both paths produce the same scene state on every subsequent frame in this component fixture.

The actual continuously running stage3 iron native fixture independently queues the bubble on tick1 at512,384; normal GameSession matches. Existing constant-half battle divergence remains HP562/gold691. No complete scene-wide RNG or main-script scheduling parity is claimed.

## Scene render RNG correction

Original systems.render.on_insert randomizes ts only if random_ts exists, including zero (Lua truthy), using U.frandom(-random_ts,0). EnvironmentRenderer previously consumed a random draw for EVERY sprite, even absent random_ts, and used the other end of the random interval for phase. `nativeSpritePhase` now preserves supplied ts, consumes no draw when absent, correctly consumes one for explicit zero and uses the original interval/sign. `export_sprite_phase.lua` executes the original render insertion callback;20independent cases verify timestamps and random consumption. This removes extra browser-only random consumption, but does not establish complete native browser/global RNG ordering.

## Verification and remaining full scope

Fresh full export25862, full npmtest/build58131 passed. After render-phase correction, original sprite-phase check and production build21022 passed. Browser93675 passed normal canvas interactions at the original locations with original jump/tap/fisherman/bubble art. Five catches reward400→420; sound triggers are5feedback/2single/3pile; fish disappear, bubble persists, no page/missing asset errors. Waits were accelerated by passing elapsed time through the existing fixed-step simulation, rather than altering cooldowns. Both screenshots web-fishing-first-catch.png and web-fishing-five-reward.png were visually inspected. Audible native playback comparison is still unverified.

Fresh six-flow normal policy6169:1-1win20/266.6s,1-2win1/149.5s,2-1win20/431.9s,2-2defeat124.2333s,3-1win5/673.1s,3-2defeat106.8s. Four wins/two losses. Fish RNG draws now occur in this normal simulator; no catches or20gold were injected into the battle policy. Artifact fishing-playthrough.json. Headless probes do not instantiate EnvironmentRenderer, so the later render-only fix does not alter them.

Fresh video opening replay still first differs for video-bar-mid seed104/scene13.5/middle windows at media76:75versus70gold; holder11 purchase82.5 rejected with95gold. Coverage120seconds only, not victory or video acceptance.

Still required: connect bootstrap and all actual scene/tower/soldier/enemy/bullet/FX/modifier/particle allocations into one native registry, interleave actual main-script iteration, finish all required skills, native health/RNG equivalence, startup/audio and full video/1-1through3-2 acceptance. Current onCreate/onRemove hooks expose actual scene lifecycle events for that integration.

Final full npmtest66734 also passed after the render RNG fix and coupled bubble verifier extension (fishing-final-test.log). All25862/58131/6169/21022/93675/66734/18249 handles are terminal; no producer/browser/test remains.
