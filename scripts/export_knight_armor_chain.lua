local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('hp=entity.health and entity.health.hp,','rawArmor=entity.health and entity.health.raw_armor,powerA=entity.powers and entity.powers.skill_a and entity.powers.skill_a.level,auraSource=entity.aura and entity.aura.source_id,armorTween=entity.tween and entity.tween.ts,armorDisabled=entity.tween and entity.tween.disabled,armorReverse=entity.tween and entity.tween.reverse,armorAlphas=entity.template_name=="aura_knights_skill_a_check" and {entity.render.sprites[1].alpha,entity.render.sprites[2].alpha},hp=entity.health and entity.health.hp,',1)
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   for _,h in pairs(store.entities)do if h.hero then h.main_script=nil;h.pos.x=h.template_name=='hero_gerald'and 600 or 1000;h.pos.y=h.template_name=='hero_gerald'and 400 or 650 end end
   local t=E:create_entity('tower_knights_lvl4');t.pos={x=520,y=400};t.tower.holder_id='armor-source';t.tower.holder_template='tower_holder_terrain_1_1';t.tower.terrain_style=1;t.barrack.rally_pos={x=520,y=400};t.tower.default_rally_pos={x=520,y=400};t.powers.skill_a.level=(arg[12]=='upgrade'or arg[12]=='upgrade-near')and 0 or tonumber(arg[11])or 1;t.webArmorSource=true;sim:queue_insert_entity(t)
  end
  if tick==200 or tick==350 or tick==450 or tick==550 or tick==650 or tick==730 then
   for _,h in pairs(store.entities)do if h.hero then
    local near=h.template_name=='hero_gerald'and(tick==350 or tick==450 or tick==730)or h.template_name=='hero_zefira'and(tick==450 or tick==550)
    h.pos.x=near and 600 or 1000;h.pos.y=near and 400 or 650
   end end
  end
  if tick==300 and (arg[12]=='death'or arg[12]=='death-upgrade') then for _,t in pairs(store.entities)do if t.webArmorSource then local d=E:create_entity('damage');d.source_id=t.id;d.target_id=t.barrack.soldiers[1].id;d.damage_type=1;d.value=1000;table.insert(store.damage_queue,d) end end end
  if tick>20 then for _,t in pairs(store.entities)do if t.webArmorSource then assert(t.main_script.co,'knight tower coroutine stopped unexpectedly')end end end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
