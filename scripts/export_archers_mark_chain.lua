-- Real engine queue/main/remove chain, with a quiet durable target and no waves.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('hp=entity.health and entity.health.hp,','damageFactor=entity.health and entity.health.damage_factor,hp=entity.health and entity.health.hp,',1)
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   local e=E:create_entity('enemy_bandit');e.webMarkTarget=true;e.main_script=nil;e.pos={x=620,y=462};e.motion.speed={x=0,y=0};e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.unit.mod_offset={x=7,y=13};if arg[12]=='boss'then e.vis.flags=bit.bor(e.vis.flags,F_BOSS)end;sim:queue_insert_entity(e)
   local m=E:create_entity('mod_archers_skill_c_weak');m.modifier.target_id=e.id;m.modifier.level=tonumber(arg[11])or 1;sim:queue_insert_entity(m)
  end
  if tick==80 and arg[12]=='refresh'then
   for _,e in pairs(store.entities)do if e.webMarkTarget then local m=E:create_entity('mod_archers_skill_c_weak');m.modifier.target_id=e.id;m.modifier.level=tonumber(arg[11])or 1;sim:queue_insert_entity(m);break end end
  end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
