local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
source=source:sub(1,at-1)..[[
  if tick==20 then
   for _,h in pairs(store.entities)do if h.hero then h.main_script=nil;h.pos={x=1000,y=650}end end
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webSulfurTarget=true;e.pos={x=550,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.magic_armor=.4;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local a=E:create_entity('aura_bullet_culverine_skill_a_lvl'..arg[11]);a.pos={x=550,y=400};a.aura.level=0;a.webSulfurArea=true;sim:queue_insert_entity(a)
  end
  local mode=arg[12]or'normal'
  if tick==40 and(mode=='duplicate'or mode=='mixed'or mode=='higher-level')then local a=E:create_entity('aura_bullet_culverine_skill_a_lvl'..(mode=='mixed'and'3'or arg[11]));a.pos={x=550,y=400};a.aura.level=mode=='higher-level'and 1 or 0;sim:queue_insert_entity(a)end
  if tick==80 then for _,e in pairs(store.entities)do if e.webSulfurTarget then
   if mode=='dead'then e.health.dead=true
   elseif mode=='remove'then sim:queue_remove_entity(e)
   elseif mode=='no-magic'then e.enemy.can_accept_magic=false
   elseif mode=='exit'then e.pos.x=800
   elseif mode=='banned'then e.vis.bans=4
   end
  end end end
  if tick==100 and mode=='remove-area'then for _,e in pairs(store.entities)do if e.webSulfurArea then sim:queue_remove_entity(e)end end end
]]..source:sub(at)
local n;source,n=source:gsub('hp=entity.health and entity.health.hp,','sulfurDuration=entity.actual_duration,rawMagicArmor=entity.health and entity.health.raw_magic_armor,sulfurLost=entity._magic_armor_lost,auraLevel=entity.aura and entity.aura.level,hp=entity.health and entity.health.hp,',1);assert(n==1)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
