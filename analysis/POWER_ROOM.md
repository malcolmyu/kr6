# Native power room, saved purchases and equipment

The overall recreation through3-2 remains incomplete. This update exposes the power upgrades through the ordinary map's 法术 entry, without requiring the developer toolbar. It does not establish complete video, sound or natural-battle parity.

The exported original room supplies its nine-power roster, portraits, locked artwork, labels, stat bars, five skill previews, eight-node trees, links, tooltips and page timelines. Native point costs, prerequisites and exclusive branches govern purchases. Selecting a replacement branch transfers purchased sub-decisions as the original does. Reset affects only the selected power. Equipment uses the original explicit slot picker, with replacement or clamped append, rather than automatic swapping. The first three stages only unlock the first three powers; later powers remain inspectable but unavailable.

Purchases and loadouts save to the active localStorage slot immediately and survive reload. The next GameSession receives those selections and applies its template patches. Royal's purchased reset callback resets the implemented Wizard B, Archer B and Catapult C skill clocks while preserving basic/static attack clocks. Additional tower/soldier skill controllers still need their respective behavior and reset integration as they are implemented.

The picker uses original fade and slot shake values. Transparent input overlays fit the actual window through the native KView conversion and rounding, including tall windows. The separate native modal backdrop uses the original black160-alpha layer and vignette image. The generic hero room retains its previous backdrop implementation.

Verification:

- `export_power_room_oracle.lua` executes original functions for90 stats profiles,408 purchase/branch-transfer cases,30 equipment writes and10 Royal reset cases. Unlock/seen inputs use the current progression adapter; these fixtures do not prove the complete original unlock/storage subsystem.
- `export_power_room_fit.lua` independently loads real native KWindow/KView and checks eight window/scale fits against the web layout.
- `verify_power_room.mjs` compares those results, all nine room/tree models, exported assets and timelines, and actual GameSession skill reset hooks.
- `npm run test:power-room` exercises the default map entry, detail/tree pages, node purchase, exclusive branch transfer, per-power reset, explicit slot replacement/append, tall-window overlay coverage, locked power inspection, save/reload and next-battle loadout/cooldown. No page or asset errors. Browser screenshots of the main room, trees and tall equip view were inspected.
- Final complete native data export, `npm test`, production build and power-room browser all passed. Existing bundle-size warning remains. Earlier hero-room and default-surface browser regressions also passed after shared UI changes.

Remaining differences include complete outer RoomView entrance/exit choreography, exact native font/shader behavior, full tooltip wrapping, new-item badges, gem/XP purchase flows, remaining tower skills, generic simulation phase ordering and complete particles/audio comparison. No new natural six-flow battle run was made for this room update. The latest fixed-policy probe still wins four flows and loses2-2 and3-2; it predates power-room purchases and does not represent video acceptance.
