local root='reference/apk/assets/gc64/'
package.path=root..'kr6/?.lua;'..root..'sequels/?.lua;'..root..'all/?.lua;'..root..'lib/?.lua;'..root..'?.lua;'..package.path
KR_GAME='kr6'; IS_KR6=true; IS_SEQUEL=true; FPS=30
KR_PATH_GAME=root..'kr6'; KR_PATH_ALL=root..'all'; KR_TARGET='phone'
love={timer={getTime=os.clock},filesystem={}}
love.graphics={getHeight=function() return 768 end,getWidth=function() return 1400 end}
package.loaded['love.graphics']=love.graphics
local E=require('entity_db')
E:load()
local json=require('dkjson')
local function clean(value,seen)
  if type(value)=='function' or type(value)=='userdata' then return nil end
  if type(value)~='table' then return value end
  seen=seen or {}; if seen[value] then return nil end; seen[value]=true
  local out={}; for k,v in pairs(value) do out[k]=clean(v,seen) end
  seen[value]=nil; return out
end
local out={}
for name,template in pairs(E.entities) do
  if name:find('bolin',1,true)then out[name]=clean(template)end
  if name:match('^mod_bullet_culverine_skill_[ab]_lvl') or name=='mod_archers_skill_c_weak' or name:match('^mod_archers_skill_a_stun_lvl') then out[name]=clean(template) end
  if name=='aura_wizard_skill_c' or name=='controller_tower_wizard_book_bounce' or name=='explosion_small_KR5' or name=='aura_catapult_skill_c_trap' or name=='mod_catapult_skill_c_stun' or name=='aura_catapult_skill_a' or name=='mod_catapult_skill_a_slow' or name=='aura_catapult_skill_b_bomb' or name:match('^aura_bullet_power_rain_of_fire') or name:match('^mod_bullet_power_rain_of_fire') or name=='aura_power_reinforcement_special' or name:match('^mod_reinforcement_special_') or name:match('^enemy_') or name:match('^tower_') or name:match('^soldier_') or name:match('^decal_') or name:match('^bullet_') or name:match('^bolt_') or name:match('^fx_') or name:match('^power_') or name:match('^hero_') or name:match('^mod_power_royal_edict') or name:match('^mod_gerald_skill_[ab]$') or name:match('^mod_gerald_skill_c') or name=='mod_firebook_aura' or name=='mod_wizard_skill_b' or name=='mod_wizard_skill_b_fx' or name=='mod_archers_skill_b_range' or name:match('^aura_bullet_culverine') or name:match('^aura_zefira_skill_b') or name:match('^mod_zefira_skill_[abc]') or name:match('^mod_gerald_ultimate') or name=='aura_zefira_talent_1' or name=='mod_zefira_talent' or name=='aura_gerald_ultimate' or name:match('^pop_') or name=='pop_block' or name=='aura_gerald_talent_2_regeneration' or name=='aura_shadow_blades_smoke' or name=='mod_shadow_blades_smoke' or name=='controller_stage_01_gerald_intro' then
    out[name]=clean(template)
  end
end
for _,name in ipairs({'hero_gerald','hero_zefira','hero_bolin'}) do
  local prefix=out[name].render.sprites[1].prefix
  local definition=dofile(root..'kr6/data/exoskeletons/go_'..name..'/'..prefix..'.exo3')
  out[name].webAnimationDurations={}
  for _,animation in ipairs(definition.animations)do out[name].webAnimationDurations[animation.name]=#animation.frames/definition.fps end
end
local enemy_animations={}
for file in io.popen('find reference/apk/assets/gc64/kr6/data/animations/go_enemies_T1 -name "*.lua"'):lines()do for name,a in pairs(dofile(file))do enemy_animations[name]=a end end
for _,name in ipairs({'enemy_shadow_archer','enemy_shadow_blades','enemy_crow'})do
 local prefix=out[name].render.sprites[1].prefix;out[name].webAnimationDurations={}
 for key,a in pairs(enemy_animations)do if key:sub(1,#prefix+1)==prefix..'_'then out[name].webAnimationDurations[key:sub(#prefix+2)]=(a.to-a.from+1)/30 end end
end
if not EXPORT_ENTITIES_NO_WRITE then
  local f=assert(io.open('public/data/entities.json','w')); f:write(dofile('scripts/precise_json.lua')(out));f:close()
end
