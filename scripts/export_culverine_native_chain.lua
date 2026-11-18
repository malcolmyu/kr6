local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
source=source:sub(1,at-1)..[[
  if tick==20 then
   for _,h in pairs(store.entities)do if h.hero then h.main_script=nil;h.pos={x=1000,y=650}end end
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.webCulverineTarget=true;e.pos={x=550,y=400};e.motion.speed={x=0,y=0};e.heading.angle=0;e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local t=E:create_entity('tower_culverine_lvl'..arg[11]);t.pos={x=450,y=400};t.render.sprites[1].name='terrains_0001';t.tower.holder_id='culverine-source';t.tower.holder_template='tower_holder_terrain_1_1';t.tower.terrain_style=1;t.webCulverineSource=true;sim:queue_insert_entity(t)
  end
  local mode=arg[12]or'normal'
  if (mode=='remove-target-before'and tick==23 or mode=='remove-target-after'and tick==24)then for _,e in pairs(store.entities)do if e.webCulverineTarget then sim:queue_remove_entity(e)end end end
  if mode=='remove-source'and tick==23 then for _,t in pairs(store.entities)do if t.webCulverineSource then sim:queue_remove_entity(t)end end end
  if mode=='moving'and tick>=100 and tick<250 then for _,e in pairs(store.entities)do if e.webCulverineTarget then e.pos.x=e.pos.x+0.5 end end end
]]..source:sub(at)
source=source:gsub("slot.towers.selected={'archers','knights','catapult','wizard'}","slot.towers.selected={'archers','knights','catapult','wizard','culverine'}",1)
local n;source,n=source:gsub('hp=entity.health and entity.health.hp,','culverineParts=entity.template_name:match("^tower_culverine") and table.deepclone(entity.render.sprites),culverineAttackTs=entity.template_name:match("^tower_culverine") and entity.attacks.list[1].ts,auraSource=entity.aura and entity.aura.source_id,auraLevel=entity.aura and entity.aura.level,auraFactor=entity.aura and entity.aura.damage_factor,auraMin=entity.aura and entity.aura.damage_min,auraMax=entity.aura and entity.aura.damage_max,hp=entity.health and entity.health.hp,',1);assert(n==1)
if CULVERINE_CHAIN_TRANSFORM then source=CULVERINE_CHAIN_TRANSFORM(source)end
if CONTROLLED_PAINT_TRANSFORM then source=CONTROLLED_PAINT_TRANSFORM(source)end
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
