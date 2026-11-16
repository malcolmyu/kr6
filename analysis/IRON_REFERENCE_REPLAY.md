# Iron references and reproducible command comparisons

2026-11-15 continuation. The previous persistence work is verified; the complete six-flow reverse-engineering objective remains incomplete. No damage, health, waves, tower positions or starting gold were changed to make these probes win.

## Full local HD evidence

The public Bilibili playurl API returned quality64 at1280×720 when requested with qn80/fnval1. `fetch_iron_reference.py` downloads a returned stream, retries its supplied backup on CDN failure, and checks advertised length/ffprobe duration. No authentication or protected stream was used. The normal first CDN failed for page6; the provided backup completed successfully. These are the user-supplied BV1tCaP6GEtq's pages4/6:

| Clip | Duration | Bytes | SHA256 |
| --- | --- | --- | --- |
| `reference/video/page04-reference.mp4` /2-2 |209.301333s|25960176|e1385dc09f19c619e9ab0c046e40ef1f94fc01358799935ac6c09f82fd6aaf0b|
| `reference/video/page06-reference.mp4` /3-2 |306.24s|36942019|5d2533b7dbe774c46d270d1ff341f9e6fd8a7b23da8136fed6c453a9ace0c7d0|

`capture_iron_reference.py` makes unmodified ffmpeg stills in `analysis/video-iron/`. Timestamps below are absolute media times, not simulation timestamps.

## Direct observations and uncertainty

2-2: at10s, wave0,300gold, three prebuilt Lv1 wizards at APK holders1/5/10. By20s, barracks3/8 exist,160gold; by25–30s both formations/heroes meet centrally. At31s the player previews a wizard on holder4, still160gold/wave0. At33s it is building,60gold/wave0; at35s wave1. Thus the diagnostic's assumed31s wave call is early and is not an exact input reconstruction. At40/60s the four mages and two barracks are clear; at60s122gold, Royal is cooling down. At90s there are six mages/two barracks; by120s a third barracks at holder2; at150s Zefira is dead and reinforcement soldiers fight a leak near the left exit. Both heroes are level2. The lower1/2/3 labels are hotkeys; separate lower-left labels are power levels.

3-2: at45–50s, wave0,70gold, three catapults, two wizards and prebuilt barracks9. At50s Gerald remains near the left exit and Zefira near the upper exit. At60s both heroes have moved toward the barracks/central catapult; at62s wave0 with wave hover/path arrows;65s wave1. Therefore leaving heroes at their early preparation positions, as the old probe did, does not reproduce video play. Gerald is level2, Zefira3; power levels are2. The probe's different persistent XP history is another unproven alignment.

### Unresolved upper tower layout

`locate_reference_towers.py` reads original HD90s pixels with a floor-art template; it emits coordinates only. Known1/5/10 and new4/9 floor centers agree with an approximately.9375 scale and constant sprite offset. An upper wizard's floor center is727,280.5, corresponding roughly to world605,452. APK holder6 is558,489;7 is653,430. Both GC32/GC64 level02_data tables have those APK positions, no conditional branch. Video has one visible upper site where the web has two. The supplied APK's version is kr6-phone-1.02.004. This may be a reference-version difference; generic insertion/platform layout still warrants checking. No production coordinates or ranges were overridden from this observation.

## Controlled replay evidence

`replay_iron_reference.mjs` initializes the same original level/waves, deterministic seed, entry hero XP/upgrades/power XP/equipment as the existing natural probe. It replays recorded successful player commands in order and asserts exact final outcome/time/gold/heroXP/powerXP/escape HP/coordinates. Both baselines reproduce exactly:2-2 loses122.8s to shadow_blades33HP;3-2 loses108.933333s to blackguard25HP.

Then it changes ordinary player actions only, keeping original stats/waves and the old automatic spell policy. All rally requests succeed. Results:

| 2-2 comparison | Defeat time | Escaping enemy/HP |
| --- | --- | --- |
| Same opening/positions |122.8|shadow_blades33|
| Central barracks rallies only |122.633333|shadow_blades6|
| Central heroes only |183.966667|blackguard22|
| Both |126.366667|bandit10|
| Both + inferred video-style builds/delayed wave |147.5|shadow_blades9|

Central positions are inferred coordinates, later build times are coarse, upper wizard is only a holder6 hypothesis, and spells remain autonomous. These are diagnostic comparisons, not video replays or acceptance. They rule out a claim that a simple rally correction alone resolves the two losses. Complete temporal input reconstruction, later hero moves/escape interventions, upgrade history, map discrepancy and original combat/navigation phases remain to investigate.

### After the native catapult controller correction

The earlier table is historical. Current full-playthrough trace uses the native catapult rotation/shot/reload lifecycle and node prediction (CATAPULT_TOWER.md). Exact command replay now reproduces2-2/122.8s/blade33HP and3-2/63.333333s/blade39HP at the upper exit. Four natural probe wins/two losses remain. The former complete probe is preserved in full-playthrough-before-catapult-controller.json. Static hero positions, coarse video action guesses and automatic spells remain diagnostic limitations; earlier loss timing is recorded rather than hidden by restoring faster generic fire.
