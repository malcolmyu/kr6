local root = 'reference/apk/assets/gc64/'
package.path = root .. 'lib/?.lua;' .. package.path
local json = require('dkjson')
local function write(path, value)
  local f = assert(io.open(path, 'w')); f:write(assert(json.encode(value))); f:close()
end
for level = 1,3 do
  local prefix = string.format('level%02d', level)
  local result = {}
  for _, suffix in ipairs({'data','paths','grid'}) do
    result[suffix] = assert(loadfile(root .. 'kr6/data/levels/' .. prefix .. '_' .. suffix .. '.lua'))()
  end
  write('public/data/' .. prefix .. '.json', result)
  write('public/data/' .. prefix .. '-atlas.json', dofile(string.format('runtime/desktop_assets/kr6-phone/images/ipadhd/go_stage%02d_bg.lua',level)))
end
FPS = 30
write('public/data/balance.json', dofile(root .. 'kr6/data/balance/balance.lua'))
write('public/data/enemies-atlas.json', dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/go_enemies_T1.lua'))
local animations = {}
for file in io.popen('ls reference/apk/assets/gc64/kr6/data/animations/go_enemies_T1/*.lua'):lines() do
  for name, animation in pairs(dofile(file)) do animations[name] = animation end
end
write('public/data/enemies-animations.json', animations)
dofile('scripts/export_waves.lua')
dofile('scripts/export_wave_gems.lua')
dofile('scripts/export_entities.lua')
dofile('scripts/export_tower_assets.lua')
dofile('scripts/export_audio.lua')
dofile('scripts/export_opening.lua')
dofile('scripts/export_stage_art.lua')
dofile('scripts/export_navigation.lua')
dofile('scripts/export_teleport_nodes.lua')
dofile('scripts/export_tutorial.lua')
dofile('scripts/export_tower_menu.lua')
dofile('scripts/export_hud.lua')

dofile('scripts/export_comics.lua')

dofile('scripts/export_outcome.lua')

dofile('scripts/export_map.lua')

dofile('scripts/export_hero_progression.lua')

dofile('scripts/export_healthbars.lua')

dofile('scripts/export_royal_edict.lua')

dofile('scripts/export_progression.lua')

-- Original hero modifiers, skill costs/graph, passive stats and desktop room artwork.
dofile('scripts/export_gerald_skills.lua')
dofile('scripts/export_gerald_cast_oracle.lua')
dofile('scripts/export_hero_upgrade_graph.lua')
dofile('scripts/export_hero_room.lua')

dofile('scripts/export_hero_room_state.lua')
dofile('scripts/export_power_room.lua')

dofile('scripts/export_nine_slice_oracle.lua')

dofile('scripts/export_gerald_survivor_oracle.lua')
dofile('scripts/export_enemy_teleport_oracle.lua')

dofile('scripts/export_zefira_skills.lua')
dofile('scripts/export_zefira_shield.lua')
dofile('scripts/export_zefira_stun_interrupt.lua')
dofile('scripts/export_zefira_shield_check.lua')
dofile('scripts/export_enemy_melee_damage.lua')
assert(os.execute('luajit scripts/export_enemy_melee.lua')==0)
dofile('scripts/export_zefira_blink.lua')
dofile('scripts/export_zefira_blink_buff.lua')
dofile('scripts/export_zefira_redirect.lua')
dofile('scripts/export_gerald_regen.lua')
dofile('scripts/export_gerald_regen_survivor.lua')
dofile('scripts/export_gerald_dodge.lua')
dofile('scripts/export_gerald_dodge_arrow.lua')
dofile('scripts/export_block_pop.lua')
dofile('scripts/export_simulation_clock.lua')
dofile('scripts/export_gerald_ultimate.lua')
dofile('scripts/export_ultimate_stun_stack.lua')
dofile('scripts/export_zefira_weakness.lua')
dofile('scripts/export_zefira_ranged_cancel.lua')
dofile('scripts/export_zefira_critical.lua')
dofile('scripts/export_damage_pops.lua')
dofile('scripts/export_soldier_melee_damage.lua')
dofile('scripts/export_soldier_combat.lua')
assert(os.execute('luajit scripts/export_soldier_combat.lua --death')==0)
assert(os.execute('luajit scripts/export_soldier_combat.lua --death-tween')==0)
dofile('scripts/export_knight_deployment.lua')
dofile('scripts/export_hero_melee_arrival.lua')
dofile('scripts/export_barrack_door.lua')
dofile('scripts/export_pop_lifecycle.lua')
dofile('scripts/export_enemy_death.lua')
dofile('scripts/export_static_effects.lua')
dofile('scripts/export_zefira_ultimate.lua')
dofile('scripts/export_culverine_ray.lua')
dofile('scripts/export_culverine_tower.lua')
dofile('scripts/export_scene_transition.lua')

dofile('scripts/export_slots.lua')

dofile('scripts/export_ui_exo.lua')

dofile('scripts/export_splash.lua')

dofile('scripts/export_options.lua')

dofile('scripts/export_tower_power.lua')
dofile('scripts/export_archers_range.lua')

dofile('scripts/export_wizard_tower.lua')

dofile('scripts/export_wizard_empower.lua')

dofile('scripts/export_power_cooldown.lua')

dofile('scripts/export_power_progression.lua')
dofile('scripts/export_power_upgrades.lua')
dofile('scripts/export_power_room_oracle.lua')
dofile('scripts/export_reinforcements.lua')
dofile('scripts/export_rain_upgrades.lua')

dofile('scripts/export_level_select.lua')

dofile('scripts/export_map_viewport.lua')

dofile('scripts/export_catapult_tower.lua')
dofile('scripts/export_path_prediction.lua')

dofile('scripts/export_catapult_explosive.lua')
dofile('scripts/export_catapult_bomb.lua')

dofile('scripts/export_catapult_tar_tower.lua')
dofile('scripts/export_catapult_tar_areas.lua')
dofile('scripts/export_catapult_tar_impact.lua')

assert(os.execute('luajit scripts/export_catapult_trap_positions.lua')==0)
dofile('scripts/export_catapult_trap_tower.lua')
dofile('scripts/export_catapult_trap_effects.lua')
dofile('scripts/export_catapult_trap_impact.lua')

-- These native comparisons require a fresh module/template state: earlier
-- exporters deliberately replace simulator helpers and repeatedly reload E.
assert(os.execute('luajit scripts/export_global_upgrades.lua')==0)

assert(os.execute('luajit scripts/export_global_artillery_impact.lua')==0)

assert(os.execute('luajit scripts/export_global_room.lua')==0)
assert(os.execute('luajit scripts/export_global_room_oracle.lua')==0)

assert(os.execute('luajit scripts/export_wizard_targeting.lua')==0)
assert(os.execute('luajit scripts/export_wizard_targeting.lua --off-node')==0)

assert(os.execute('node scripts/replay_observed_opening.mjs --capture-catapult')==0)
assert(os.execute('luajit scripts/export_catapult_opening.lua')==0)
assert(os.execute('luajit scripts/export_wizard_opening.lua')==0)

assert(os.execute('luajit scripts/export_wizard_bolt_health.lua')==0)
assert(os.execute('luajit scripts/export_wizard_bolt_health.lua --pops')==0)

assert(os.execute('python3 scripts/export_game_system_order.py')==0)

assert(os.execute('luajit scripts/export_bomb_pops.lua')==0)
assert(os.execute('luajit scripts/export_wizard_firebook_tower.lua')==0)
assert(os.execute('luajit scripts/export_wizard_firebook_burn.lua')==0)
assert(os.execute('luajit scripts/export_wizard_firebook_impact.lua')==0)
assert(os.execute('luajit scripts/export_wizard_targeting.lua --firebook')==0)
assert(os.execute('luajit scripts/export_wizard_targeting.lua --off-node --firebook')==0)

assert(os.execute('luajit scripts/export_firebook_particles.lua')==0)

assert(os.execute('luajit scripts/export_firebook_particles.lua --combined')==0)

assert(os.execute('luajit scripts/export_firebook_particles.lua --late-main')==0)

assert(os.execute('luajit scripts/export_wizard_bolt_particles.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_wizard_bolt_particles.lua --paired-sequence')==0)

assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_lua_entity_table.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_entity_registry.lua')==0)

assert(os.execute('luajit scripts/export_lua_entity_table.lua analysis/lua-entity-table-rolling-oracle.json')==0)
assert(os.execute('luajit scripts/export_wizard_bolt_particles.lua --paired-sequence analysis/wizard-bolt-paired-sequence-rolling-oracle.json')==0)
assert(os.execute('python3 scripts/audit_native_lua.py')==0)

-- Each bootstrap runs in a fresh VM: the shipped level modules retain locals.
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_level_entity_bootstrap.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_level_entity_bootstrap.lua --insert-all')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_native_persistent_entities.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_native_spatial_entities.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_entity_clone.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_native_level_runtime.lua')==0)

assert(os.execute('luajit scripts/export_buy_available.lua')==0)

assert(os.execute('luajit scripts/export_fishing.lua')==0)

assert(os.execute('luajit scripts/export_sprite_phase.lua')==0)

assert(os.execute('luajit scripts/export_scene_entities.lua')==0)

assert(os.execute('luajit scripts/export_background_sounds.lua')==0)

assert(os.execute('luajit scripts/export_catapult_particles.lua')==0)
assert(os.execute('luajit scripts/export_catapult_particles.lua --combined')==0)

assert(os.execute('luajit scripts/export_hero_ranged_targeting.lua')==0)

assert(os.execute('luajit scripts/export_zefira_bolt_oracle.lua')==0)

dofile('scripts/export_zefira_particles.lua')

dofile('scripts/export_hero_melee_queue.lua')

dofile('scripts/export_template_random.lua')
dofile('scripts/export_ambient_creatures.lua')

dofile('scripts/export_soldier_idle.lua')
dofile('scripts/export_lua_sort.lua')

dofile('scripts/export_rain_trail.lua')

dofile("scripts/export_zefira_shield_templates.lua")

dofile('scripts/export_gerald_runtime_templates.lua')

dofile('scripts/export_hero_ranged_spatial.lua')

dofile('scripts/export_zefira_hammer_templates.lua')

dofile('scripts/export_enemy_ranged_templates.lua')

dofile('scripts/export_hero_life_templates.lua')

dofile('scripts/export_victory_timing.lua')

dofile('scripts/export_gerald_survivor_templates.lua')

-- Bolin patches and metadata use isolated native VMs to preserve template state.
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_hero_team_rules.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_bolin_upgrade_rules.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_bolin_casing_particles.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_bolin_runtime.lua')==0)
assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_bolin_mortar.lua')==0)

assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_bolin_mines.lua')==0)

assert(os.execute('reference/luajit-beta3/src/luajit scripts/export_enemy_book.lua')==0)
