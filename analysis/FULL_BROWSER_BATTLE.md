# Full prescribed 3-2 browser battle and original sound requests

The complete first-three-level/video/startup/construction/heard-audio objective remains incomplete. This checks one legal saved profile and 69 ordinary control commands, not a transcription of the remaining reference video. It extends the native victory documented in `HERO_LIFE_RUNTIME.md` into the actual Three.js renderer and application outcome flow.

## Rendered battle

`scripts/browser_native_full_battle.mjs` enters the actual startup/menu/save/map/stage/mode UI. It injects only the simulation RNG and an external fixed-step driver; production defaults still use `Math.random`. It submits builds, upgrades, rallies, hero moves, wave calls and powers through ordinary `GameSession` controls. Enemy HP, waves, prices and outcomes are not patched.

Each stepped frame is compared with the original 12000-frame native fixture: gold, lives, wave, RNG boundary, next entity ID, table count/max/presence, insertion/removal queues and victory state. Complete entity events through victory are compared too. Original first victory remains tick8699, gold88, lives1. The native engine fixture continues beyond victory because it has no wall-clock GUI callbacks; the browser instead resumes real animation frames and executes the actual four-second outcome transition/pause.

Drawing checkpoints include every build/upgrade command, its next frame and eight frames later, plus mixed combat, death, grave and victory checkpoints. Registered holder templates are checked against native entities. Screenshots are saved as `analysis/web-native-full-*.png`; no page errors or missing resources are permitted. This does not establish pixel-by-pixel pose coverage of every sprite.

The first run exposed a genuine render discrepancy at5040/holder9: the source level1 tower was still registered, but the renderer displayed the newly requested level2 tower. Rendering now follows the registered entity template until insertion switches the binding. Retiring animated parts retain their original pose/clock/offset/visibility rather than sampling the new tower controller. Four-family level2/3/4 upgrade/sell/refund browser regression also passes.

## Sound requests

`scripts/export_native_battle_sounds.lua` instruments the existing native bootstrap by wrapping the actual `sound_db.queue`. It calls the original queue implementation and retains original simulation, templates, systems, RNG and input. Only large read-only frame serialization is omitted. Through tick8800, the original has24375 queue calls, including22613 nil no-ops, leaving1762 named sound requests. The compact fixture is `analysis/native-battle-sounds.json`; final resources, RNG, entity-event count and victory are checked against the web simulation.

This exposed:

- Missing insertion taunt for the prebuilt barracks.
- Construction sound ten times one frame early, and upgrade taunts five times one frame early.
- Same-frame insertion sounds grouped by projectile family instead of actual entity queue order (wizard/catapult/arrow/hero projectile/reinforcement interactions).
- Rally acknowledgement emitted by the input method instead of the barracks main coroutine.

Tower insertion sounds now come from registered insertion. Deferred wizard/catapult motion still materializes in its existing phase, while insertion audio dispatches at its original registry queue position. Hero projectile insertion audio follows the same rule. Rally audio is coalesced and consumed by the tower main, waits through door animation, and requires a living roster member.

`scripts/export_barrack_rally_sounds.lua` executes the original tower coroutine for24 traces, with192 rally requests across four ranks, two clock origins, opening/hold/closing and replenishment. `verify_barrack_rally_sounds.mjs` matches the complete spawn/sound event stream and dispatch clocks, including coalescing. These cases caught and corrected an overly long wait through the door-open hold.

`verify_native_battle_sounds.mjs` compares all1762 named requests, in exact order and at raw simulation ticks, through8800. Input calls are not relabelled as future ticks. The single GUI `GUINextWaveIncoming` at1464 is asserted separately because the original engine harness installs the got-gold handler but not the GUI wave signal listener. All other sounds, including rally/hero controls, participate in the exact comparison. The actual browser replay also compares its whole request stream through victory.

## Commands and limits

```sh
npm run test:battle-sounds
npm run test:native-full-battle
npm test
npm run build
```

The sound checks cover event names/timing/order. Accelerated rendering and sound requests do not prove decoded audio mixing, device playback, perceived loudness or agreement with the reference video's complete soundtrack. Remaining video input/profile/RNG reconciliation, mixed higher abilities including Gerald Fated Survivor, remaining unified health paths, and continuous startup/construction/visual/heard-audio acceptance still require work. No completion claim follows from this prescribed victory.

Final verification: default full test suite, production build, final full browser replay, four-family upgrade/sell UI regression and fresh tutorial browser regression passed. Final browser report records73 drawing checkpoints,23700 entity events through8699 and1762 matched engine sound requests; post-victory world pauses at8802 in that run (the wall timer, not a fixed simulation tick, owns the pause). The build retains its existing large-bundle warning.

The driver now also supports `--survivor`, the actual registered Fated Survivor/teleport battle described in `GERALD_SURVIVOR_RUNTIME.md`. Its natural defeat case has separate artifacts and does not replace the prescribed victory case.
