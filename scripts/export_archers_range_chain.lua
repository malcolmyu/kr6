local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('hp=entity.health and entity.health.hp,','towerRange=entity.attacks and entity.attacks.range,rangeTween=entity.tween and entity.tween.ts,hp=entity.health and entity.health.hp,',1)
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=620,y=462};e.motion.speed={x=0,y=0};e.health.hp=10000;e.health.hp_max=10000;if(arg[12]or''):match('^target%-')then e.vis.bans=-1 end;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local t=E:create_entity('tower_archers_lvl4');t.pos={x=520,y=400};t.tower.holder_id='probe';t.webRangeSource=true;t.powers.skill_b.level=tonumber(arg[11])or 1;t.powers.skill_b.changed=true;if arg[12]=='abc'then t.powers.skill_a.level=1;t.powers.skill_a.changed=true;t.powers.skill_c.level=1;t.powers.skill_c.changed=true end;if arg[12]=='preview'then t.powers.skill_b.level=0;t.powers.skill_b.changed=false;t.ui.hover_active=true;t.ui.args='skill_b'end;sim:queue_insert_entity(t)
   if arg[12]=='upgrade'or arg[12]=='sale'or arg[12]=='stronger'or arg[12]=='equal'or(arg[12]or''):match('^target%-')then local w=E:create_entity('tower_wizard_lvl1');w.pos={x=650,y=400};w.tower.holder_id='range-target';w.webRangeTarget=true;w.tower.holder_template='tower_holder_terrain_1_1';w.tower.terrain_style=1;w.main_script=nil;sim:queue_insert_entity(w)end
   if arg[12]=='stronger'or arg[12]=='equal'then local s=E:create_entity('tower_archers_lvl4');s.pos={x=560,y=400};s.tower.holder_id='second';s.webRangeSecond=true;s.powers.skill_b.level=arg[12]=='equal'and 1 or 3;s.powers.skill_b.changed=true;sim:queue_insert_entity(s)end
  end
  if tick>20 then for _,t in pairs(store.entities)do if t.webRangeSource then assert(t.main_script.co,'range source coroutine stopped unexpectedly')end end end
  if tick==40 and arg[12]=='preview'then for _,t in pairs(store.entities)do if t.webRangeSource then t.ui.hover_active=false;t.ui.args=nil;t.powers.skill_b.level=1;t.powers.skill_b.changed=true end end end
  if tick==80 and arg[12]=='upgrade'then
   for _,old in pairs(store.entities)do if old.webRangeTarget then local n=E:create_entity('tower_wizard_lvl2');n.pos=old.pos;n.tower.holder_id='range-target';n.webRangeTarget=true;n.main_script=nil
    for _,m in pairs(store.entities)do if m.modifier and m.modifier.target_id==old.id then m.modifier.target_id=n.id end end
    sim:queue_remove_entity(old);sim:queue_insert_entity(n);break
   end end
  end
  if tick==80 and(arg[12]=='sale'or arg[12]=='equal')then for _,t in pairs(store.entities)do if t.webRangeSource then sim:queue_remove_entity(t);break end end end
  if tick==180 and arg[12]=='stronger'then for _,t in pairs(store.entities)do if t.webRangeSecond then sim:queue_remove_entity(t);break end end end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
