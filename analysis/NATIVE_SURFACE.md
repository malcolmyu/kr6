# Native browser surface and level selection

2026-11-15 continuation. The preceding power-XP/persistence turn made verified progress. The full through3-2 gameplay/visual/audio goal remains active and incomplete.

## Default presentation

`App.vue` now presents the battle viewport without the external title, stage navigation, mode selector, mute button or gray border. Its16:9 projection fills a16:9 browser window and centers with black letterboxing in other window sizes. This preserves the existing world/click projection rather than stretching it. The old diagnostic controls require the explicit `?debug=1` flag **and** a development build. Existing isolated combat browser scripts now opt into that diagnostic route. The native-surface browser test uses the default route without the flag.

Native in-game pause/options remain the route to restart, audio settings and quitting to the map. Campaign/iron choice is available from map flags. This change does not implement a new browser fullscreen permission flow.

## Level-selection reconstruction

Original `window_level_select`/`room_level_select` templates, atlas `room_level_select`, three stage preview images, localized history/title/rules/rewards, disabled mode tabs, difficulty flames, allowed-tower icons, completion badges, close button and fight button replace the previous ordinary HTML dialog.

`export_level_select.lua` runs original `kviews_screen_map_game.lua` functions46,62,8187,8356,8909 and9214 with a read-only KUI node adapter. It initializes callbacks/filters, executes native show/mode changes and exports12 stage/mode/campaign-completion snapshots as path patches over one expanded template. The nonrequested mode equipment trees are pruned; their native locked tab images remain. The first three campaign/iron pairs cannot reach the original24-star extra-mode unlock.

The adapter isolates KUI rendering, roster loading and title glyph measurement. Title width comes from Pillow using the supplied36px NotoSansCJKsc-Bold font; this is not execution of LÖVE's font rasterizer. Font rendering and shader pixels still require visual acceptance. Campaign/iron state, localized content, source restrictions and node visibility execute original code. Shared popup animation frames come from the already-executed native GG5PopUp show/hide exporter (.25s/.15s,60 logical-pixel slide).

`LevelSelect.ts` applies stage patches, maps the two requested toggles/fight/close actions, and displays each save's actual star/iron badges. Viewing a locked iron mode does not award a campaign victory or expose a fight action. Body labels use the supplied regular Chinese font with original1.1 size substitution. Title bands/outline/shadow use source parameters; CSS treatment is an approximation of the native shader kernel, not pixel-level shader parity.

### Corrected integration edges

- Lua's contiguous1-based state table encodes as a JSON array; TypeScript now indexes stage−1. A title/preview oracle caught the off-by-one before acceptance.
- Browser animation timestamps can predate a popup's mount timestamp. The previous negative frame index stopped the RAF loop with `undefined.disabled`. Popup elapsed time now clamps to0, retaining the real first pose instead of indexing−1. Repeated native map entries exercise this regression.
- Map drag completion previously left the `moved` flag set and blocked later flag clicks. A new button pointerdown clears it, while captured drag releases still do not select a flag.
- Fight's original click sound is emitted once by the selection component; the old generic map dialog's additional emit was removed.

## Map viewport

The previous map used a fixed one-world-pixel-per-logical-screen-pixel zoom, visibly cropping much of the map. `MapViewport` ports desktop MapTouchView934/969/987: initial cover-fit zoom `max(.2,windowW/mapW,windowH/mapH)`, max zoom=min+.2, wheel factors1.05/.95 around the pointer, and clamped drag limits. The map uses the original declared2486×1339.5 bounds; background art retains its original1390 height. GUI scaling and map zoom are separate.

`export_map_viewport.lua` executes original set_puppet/update_drag_limits/on_scroll.200 original states cover several logical windows, four focus points, multiple wheel inputs and extreme drag offsets; TypeScript matches. Browser verification checks actual initial scale, wheel growth, drag followed by flag selection, original mode popup, all six map→level→pause/quit→map routes and tall-window letterboxing.

## Acceptance boundaries

Successful entry to all six modes is navigation coverage, not six natural victories or video fidelity. The previous natural probe still has four wins and two losses. Native map decorations/full map HUD and its remaining rooms, exact native font/shader rendering, first difficulty prompt, touch pinch behavior, desktop options assets, general combat phases and full through3-2 video/audio acceptance remain pending. No waves, enemy stats, gold or tower positions were adjusted to manufacture victories.

## Final checks for this continuation

- Full native export, complete npm test and production build pass (existing bundle-size warning ~846KB).
- Final default-route browser passes all six map entry→pause/quit→map paths at1280×720, source initial map zoom, pointer wheel zoom, drag then flag selection, Escape close, and1000×900 letterboxing. Screenshots `web-native-level-select-3-iron.png`, `web-native-stage3-iron.png`, `web-native-letterbox.png` visually inspected. The selection dialog is substantially closer to the reference's page6 t0; remaining HUD/room/font/shader gaps are listed above.
- Locked-mode browser passes stage3 campaign availability, original iron lock text/panel, no fight action and unchanged completion data.
- Pause/restart/audio/quit browser and victory/comic2/map/stage2/defeat browser regressions pass after selection integration; pause rerun also passes after the final label-layer adjustment.
- Final fresh first-campaign browser uses the default route, with original tutorial camera/build/gold lessons, locked/unearned tower choices, four tutorial kills and two-click wave confirmation. It passes without the diagnostic chrome.
- CSS text stroke initially obscured a transparent gradient fill. Visual inspection caught it despite navigation tests passing. Fill and outline now render in separate layers; the outline uses an aria-hidden generated-text layer to avoid duplicate DOM text. The gold labels are legible again. This remains CSS emulation, not a claim of native GPU kernel parity.

Final default-route persistence regression also passes after the label-layer adjustment: guide midway reload, XP autosave/rehydration, pagehide, new-slot isolation and legacy zero-star migration. All browser processes for this continuation completed successfully and closed. Final full npm test/build pass on the current sources.
