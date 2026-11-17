local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('hp=entity.health and entity.health.hp,','empowerTween=entity.tween and entity.tween.ts,empowerDisabled=entity.tween and entity.tween.disabled,empowerReverse=entity.tween and entity.tween.reverse,wizardParts=entity.template_name=="tower_wizard_lvl4" and table.deepclone(entity.render.sprites),wizardBuffTs=entity.template_name=="tower_wizard_lvl4" and entity.attacks.list[3].ts,hp=entity.health and entity.health.hp,',1)
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=760,y=412};e.motion.speed={x=0,y=0};e.health.hp=10000;e.health.hp_max=10000;e.vis.bans=-1;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local t=E:create_entity('tower_wizard_lvl4');t.pos={x=520,y=400};t.tower.holder_id='probe';t.tower.holder_template='tower_holder_terrain_1_1';t.tower.terrain_style=1;t.webEmpowerSource=true;t.powers.skill_b.level=tonumber(arg[11])or 1;t.powers.skill_b.changed=true;if arg[12]=='preview'then t.powers.skill_b.level=0;t.powers.skill_b.changed=false;t.ui.hover_active=true;t.ui.args='skill_b'end;sim:queue_insert_entity(t)
   local w=E:create_entity('tower_wizard_lvl1');w.pos={x=650,y=400};w.tower.holder_id='empower-target';w.tower.holder_template='tower_holder_terrain_1_1';w.tower.terrain_style=1;w.main_script=nil;sim:queue_insert_entity(w)
  end
  if tick==20 and(arg[12]=='equal'or arg[12]=='stronger'or arg[12]=='stronger-late')then local t=E:create_entity('tower_wizard_lvl4');t.pos={x=560,y=400};t.tower.holder_id='second';t.tower.holder_template='tower_holder_terrain_1_1';t.tower.terrain_style=1;t.webEmpowerSource=true;t.webEmpowerSecond=true;t.powers.skill_b.level=arg[12]=='stronger'and 3 or arg[12]=='equal'and 1 or 0;t.powers.skill_b.changed=t.powers.skill_b.level>0;sim:queue_insert_entity(t)end
  if tick==100 and arg[12]=='stronger-late'then for _,t in pairs(store.entities)do if t.webEmpowerSecond then t.powers.skill_b.level=1;t.powers.skill_b.changed=true end end end
  if tick==105 and arg[12]=='stronger-late'then for _,t in pairs(store.entities)do if t.webEmpowerSecond then t.powers.skill_b.level=3;t.powers.skill_b.changed=true end end end
  if tick==40 and(arg[12]=='preview'or arg[12]=='rank-up')then for _,t in pairs(store.entities)do if t.webEmpowerSource then t.ui.hover_active=false;t.ui.args=nil;t.powers.skill_b.level=arg[12]=='preview'and 1 or 3;t.powers.skill_b.changed=true end end end
  if tick>20 then for _,t in pairs(store.entities)do if t.webEmpowerSource then assert(t.main_script.co,'empower source coroutine stopped unexpectedly')end end end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
