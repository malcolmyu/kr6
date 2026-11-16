EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,systems,sim=require('entity_db'),require('dkjson'),require('systems'),require('klove.simulation');simulation=sim;SSO=nil
local rows={}
for level=1,3 do for _,kind in ipairs({'base','refresh','upgrade','lower','dead','removed','vis-ban','immune','ignore'})do
 local store={};sim:init(store,systems,{'mod_lifecycle','main_script','health'},1/30)
 local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=500,y=350};e.health.hp=1000;e.health.hp_max=1000;e.enemy.gold=0;e.enemy.gems=0
 if kind=='vis-ban'then e.vis.bans=bit.bor(e.vis.bans,16388)end;if kind=='immune'then e.health.immune_to=1 end;if kind=='ignore'then e.health.ignore_damage=true end
 sim:queue_insert_entity(e);sim:do_tick();assert(e.health.hp==1000)
 local calls=0;math.random=function(a,b)calls=calls+1;return a and a or .25 end
 local function add(rank)local m=E:create_entity('mod_firebook_aura');m.modifier.target_id=e.id;m.modifier.level=rank;sim:queue_insert_entity(m)end
 local frames={}
 for tick=1,210 do
  if tick==1 then add(level)end
  if tick==31 and kind=='refresh'then add(level)end
  if tick==31 and kind=='upgrade'and level<3 then add(level+1)end
  if tick==31 and kind=='lower'and level>1 then add(level-1)end
  if tick==61 and kind=='dead'then e.health.hp=0;e.health.dead=true end
  if tick==61 and kind=='removed'then sim:queue_remove_entity(e)end
  sim:do_tick();local burns={}
  for _,m in pairs(store.entities)do if m.template_name=='mod_firebook_aura'then burns[#burns+1]={level=m.modifier.level,at=m.modifier.ts,spriteAt=m.render.sprites[1].ts,dpsTs=m.dps.ts}end end
  table.sort(burns,function(a,b)return a.level<b.level end)
  frames[#frames+1]={at=store.tick_ts,hp=e.health.hp,calls=calls,burns=burns}
 end
 rows[#rows+1]={level=level,kind=kind,frames=frames}
end end
local f=assert(io.open('analysis/wizard-firebook-burn-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original firebook modifier/lifecycle/DPS/health cases exported')
