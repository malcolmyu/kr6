EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
os.execute('mkdir -p analysis/function-bytecode analysis/functions')
local function dump(name,fn)
  if type(fn)~='function' then return end
  local f=assert(io.open('analysis/function-bytecode/'..name..'.lua','wb'));f:write(string.dump(fn));f:close()
end
local SU=require('script_utils')
for _,name in ipairs({'y_soldier_new_rally','y_soldier_death','soldier_pick_melee_target','soldier_move_to_slot_step','soldier_pick_melee_attack','y_soldier_do_single_melee_attack','soldier_regen','soldier_go_back_step','enemy_walk_step'}) do dump('SU_'..name,SU[name]) end
local E=require('entity_db')
for _,name in ipairs({'tower_archers_lvl1','tower_wizard_lvl1','tower_knights_lvl1','tower_catapult_lvl1','soldier_knights_lvl1','enemy_bandit','bolt_tower_wizard_lvl1'}) do
  local e=E:create_entity(name)
  for key,fn in pairs(e.main_script or {}) do dump(name..'_'..key,fn) end
end
local S=require('systems')
for _,name in ipairs({'goal_line','health','wave_spawn','render','particles'}) do
  if S[name] then for key,fn in pairs(S[name]) do dump('system_'..name..'_'..key,fn) end end
end
