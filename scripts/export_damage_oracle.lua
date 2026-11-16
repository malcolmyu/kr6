dofile('scripts/export_entities.lua')
local U=require('utils'); local E=require('entity_db');local json=require('dkjson')
local cases={}
for _,name in ipairs({'enemy_bandit','enemy_blackguard','enemy_shadow_archer','enemy_shadow_blades','enemy_crow'}) do
  for _,kind in ipairs({DAMAGE_PHYSICAL,DAMAGE_MAGICAL,DAMAGE_EXPLOSION,DAMAGE_TRUE}) do
    for value=1,30 do
      local target=E:create_entity(name);target.health.hp=100
      local damage={value=value,damage_type=kind,reduce_armor=0,reduce_magic_armor=0}
      cases[#cases+1]={health=target.health,damage=damage,expected=U.predict_damage(target,damage)}
    end
  end
end
local f=assert(io.open('analysis/damage-oracle.json','w'));f:write(assert(json.encode(cases)));f:close()
