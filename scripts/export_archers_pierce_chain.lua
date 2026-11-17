local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local anchor='  for _,command in ipairs(input)do if command.tick==tick then';local at=assert(source:find(anchor,1,true))
local injected=[[
  if tick==20 then
   local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=620,y=462};e.motion.speed={x=0,y=0};e.health.hp=10000;e.health.hp_max=10000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;sim:queue_insert_entity(e)
   local t=E:create_entity('tower_archers_lvl4');t.pos={x=520,y=400};t.tower.holder_id='probe';t.webPierceTower=true;t.powers.skill_a.level=arg[12]=='a-in-c'and 0 or(arg[12]=='upgrade'or arg[12]=='sale'or arg[12]=='release'or arg[12]=='same'or arg[12]=='c-in-a')and 1 or(tonumber(arg[11])or 1);if arg[12]=='same'or arg[12]=='a-in-c'then t.powers.skill_c.level=1;t.powers.skill_c.changed=true end;t.powers.skill_a.changed=true;sim:queue_insert_entity(t)
  end
  if tick==30 and(arg[12]=='upgrade'or arg[12]=='sale')then for _,t in pairs(store.entities)do if t.webPierceTower then t.powers.skill_a.level=tonumber(arg[11]);t.powers.skill_a.changed=true end end end
  if tick==63 and arg[12]=='release'then for _,t in pairs(store.entities)do if t.webPierceTower then t.powers.skill_a.level=tonumber(arg[11]);t.powers.skill_a.changed=true end end end
  if tick==31 and(arg[12]=='c-in-a'or arg[12]=='a-in-c')then for _,t in pairs(store.entities)do if t.webPierceTower then local p=arg[12]=='c-in-a'and t.powers.skill_c or t.powers.skill_a;p.level=1;p.changed=true end end end
  if tick==70 and arg[12]=='sale'then for _,t in pairs(store.entities)do if t.webPierceTower then sim:queue_remove_entity(t)end end end
  if tick==100 and arg[12]=='combined'then for _,t in pairs(store.entities)do if t.webPierceTower then t.powers.skill_c.level=1;t.powers.skill_c.changed=true end end end
]]
source=source:sub(1,at-1)..injected..source:sub(at)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
