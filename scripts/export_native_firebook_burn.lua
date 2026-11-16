EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,systems,sim=require('entity_db'),require('dkjson'),require('systems'),require('klove.simulation');simulation=sim;SSO=nil
local rows={}
local create,queueInsert,queueRemove,insert,remove=E.create_entity,sim.queue_insert_entity,sim.queue_remove_entity,sim.insert_entity,sim.remove_entity
local events,currentTick={},0
local function record(kind,e)events[#events+1]={tick=currentTick,kind=kind,id=e.id,name=e.template_name}end
E.create_entity=function(self,name)local e=create(self,name);record('create',e);return e end
sim.queue_insert_entity=function(self,e)record('queueInsert',e);return queueInsert(self,e)end
sim.queue_remove_entity=function(self,e)if not e.pending_removal then record('queueRemove',e)end;return queueRemove(self,e)end
sim.insert_entity=function(self,e)local r=insert(self,e);record(self.store.entities[e.id]and'insert'or'insertRejected',e);return r end
sim.remove_entity=function(self,e)local r=remove(self,e);record('remove',e);return r end
for level=1,3 do for _,kind in ipairs({'base','refresh','upgrade','lower','dead','removed','vis-ban','immune','ignore','burst-up','burst-mixed','burst-refresh','expiry-refresh'})do
 local store={};sim:init(store,systems,{'mod_lifecycle','main_script','health'},1/30);E.last_id=100;events={};currentTick=0
 local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=500,y=350};e.health.hp=1000;e.health.hp_max=1000;e.enemy.gold=0;e.enemy.gems=0
 if kind=='vis-ban'then e.vis.bans=bit.bor(e.vis.bans,16388)end;if kind=='immune'then e.health.immune_to=1 end;if kind=='ignore'then e.health.ignore_damage=true end
 sim:queue_insert_entity(e);sim:do_tick()
 local calls=0;math.random=function(a,b)calls=calls+1;return a and a or .25 end
 local function add(rank)local m=E:create_entity('mod_firebook_aura');m.modifier.target_id=e.id;m.modifier.level=rank;sim:queue_insert_entity(m)end
 local frames={}
 for tick=1,210 do
  currentTick=tick
  if tick==1 then add(level)end
  if tick==31 then
   if kind=='refresh'then add(level)elseif kind=='upgrade'and level<3 then add(level+1)elseif kind=='lower'and level>1 then add(level-1)
   elseif kind=='burst-up'then add(2);add(3)elseif kind=='burst-mixed'then add(3);add(2);add(1)elseif kind=='burst-refresh'then add(level);add(level)end
  end
  if tick==121 and kind=='expiry-refresh'then add(level)end
  if tick==61 and kind=='dead'then e.health.hp=0;e.health.dead=true end
  if tick==61 and kind=='removed'then sim:queue_remove_entity(e)end
  sim:do_tick();local burns,ids,inserts,removals={},{},{},{}
  for id,m in pairs(store.entities)do ids[#ids+1]=id;if m.template_name=='mod_firebook_aura'then burns[#burns+1]={id=id,level=m.modifier.level,at=m.modifier.ts,spriteAt=m.render.sprites[1].ts,dpsTs=m.dps.ts,pos=table.clone(m.pos)}end end
  for _,m in ipairs(store.pending_inserts)do inserts[#inserts+1]=m.id end;for _,m in ipairs(store.pending_removals)do removals[#removals+1]=m.id end
  frames[#frames+1]={at=store.tick_ts,hp=e.health.hp,calls=calls,burns=burns,ids=ids,nextId=E.last_id,count=store.entity_count,max=store.entity_max,inserts=inserts,removals=removals}
 end
 rows[#rows+1]={level=level,kind=kind,frames=frames,events=events}
end end
local f=assert(io.open('analysis/native-firebook-burn-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original firebook queue/main/health/registry traces exported')
