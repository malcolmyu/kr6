# Original wizard animation completion and opening differential

The earlier wizard coroutine tests supplied sprite `runs` using floor(elapsed/duration). Production WizardTower.finished used the same approximation. Those tests validated the Lua coroutine under that render-completion assumption; they could not establish the original renderer's completion time.

The APK's actual klove.animation_db.fni reports completed runs in anticipation of the next simulation tick. A new same-input opening comparison, using the original FFE/path helpers and original animation_db rather than the approximation, exposed the delay. With wizard pairing fixed at0.75, the first four native/web launch times were59.8/59.8333333,59.9666667/60,61.8333333/61.8666667 and62/62.0333333 (simulation seconds). Target IDs agreed. The old input/native outputs are retained in `wizard-opening-before-input.json` and `wizard-opening-before-native.json`.

WizardTower.finished now uses the ported nativeAnimationFrame runs. WorldRenderer passes explicit30fps for wizard parts so ExoSprite uses the original native frame-selection rule too. The browser instrumentation now preserves that fourth fps argument instead of dropping it. `export_wizard_tower.lua` and `export_wizard_empower.lua` obtain `runs` from the original A:fni; queue-insertion assertions derive their launch tick from the native oracle rather than a stale hardcoded tick.

The corrected runtime matches36,960 native basic-coroutine frames across four ranks/births/scenarios and18,270 knowledge-scroll/empower frames. Target acquisition remains isolated in those broad controller cases; the separate real-path acquisition and opening comparisons cover additional behavior below.

## Linked acquisition, controller and real-path inputs

`replay_observed_opening.mjs --capture-catapult` records the third-stage opening before combat dispatch each tick, through media82s. The diagnostic uses the legal mage1/artillery1+2 profile and fixed wizard-pair roll0.75. It supplies actor position, node, motion, visibility, HP and source availability. These are web inputs, not an independently recovered original playthrough or save.

Fresh LuaJIT processes run actual original tower coroutines with original FFE, path/grid helpers and A:fni against those inputs. Bullet requests are recorded; their flight/health effects are not independently simulated by the native producer. SSO is disabled. Therefore this comparison isolates acquisition/control/prediction on equal inputs, rather than proving whole-game ordering, spawn timing, health resolution or video equivalence.

`opening_subject.mjs` executes the **current production** GameSession path helpers and RangedCombat on those prescribed inputs every test run. Verifiers compare that execution with the native output, not merely recorded web states:

- 2055 input ticks;4263 full catapult source-animation states and four launches match, including exact origins/targets/factors/timestamps.
- 2472 wizard source-animation states and13 launches match, including paired target IDs, hand origins, clocks, bob offsets and signs.
- 7452 native P.next_entity_node/U.walk samples match after each actor's initial prescribed frame. Speeds and movement/hold decisions are inputs; this does not validate original spawn/insert/AI decisions. The walking counts from the two producers describe the same samples and must not be added together.

## Whole-route status

The updated observed-opening diagnostic still has75 gold at media77 versus video90 and rejects wizard11 with90 gold. Do not change enemy HP, ranges or rewards to conceal this difference. The exact video profile and visual-effect ownership remain uncertain.

A new natural-policy run uses original waves/stats and ordinary commands, writing `wizard-animation-playthrough.json` without replacing the historical baseline. Results:1-1 victory20 lives/265.633s;1-2 victory1/148.533s;2-1 victory20/425.933s;2-2 defeat122.4s;3-1 victory7/671.267s;3-2 defeat63.333s. This is still four wins/two losses and an arbitrary policy, not proof of either solvability failure or reference-video fidelity.

The full native exporter now regenerates the opening input and both fresh-process outputs. Complete npm test/build and wizard four-level/B browser regressions passed; the four-level browser verifies explicit30fps and the prior between-tick upgrade fix. Browser checks request original sound assets but do not prove waveform/auditory equivalence. All browser processes closed normally. Bundle-size warning and full3-2 visual/audio/gameplay acceptance remain unresolved.
