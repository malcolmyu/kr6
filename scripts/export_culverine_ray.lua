EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,P,J=require('entity_db'),require('path_db'),require('dkjson');local oldValid=P.is_node_valid;P.is_node_valid=function()return true end
local oldSimulation=simulation;local rows={}
for level=1,4 do for _,factor in ipairs({1,1.75})do for _,mode in ipairs({'normal','target-moves','tower-sold','tower-sold-unbound'})do
 local tower=E:create_entity('tower_culverine_lvl'..level);tower.pos={x=500,y=350}
 local enemies={};local entities={[tower.id]=tower}
 for i,p in ipairs({{620,350},{647.5,350},{675,350},{675.001,350},{620,388.5},{620,388.501}})do local e=E:create_entity('enemy_bandit');e.pos={x=p[1],y=p[2]};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.health.hp=1000;entities[e.id]=e;enemies[i]=e end
 local ray=E:create_entity('bullet_culverine_lvl'..level);ray.pos={x=516,y=415};ray.bullet.from=table.deepclone(ray.pos);ray.bullet.to=table.deepclone(enemies[1].pos);ray.bullet.source_id=tower.id;ray.bullet.target_id=enemies[1].id;ray.bullet.damage_factor=factor;if mode~='tower-sold-unbound'then ray.tower_ref=tower end
 local store={tick_ts=0,tick_length=1/30,entities=entities,damage_queue={}};local events,pending,auras={},{},{};local names={};for i,e in ipairs(enemies)do names[e.id]=i end
 simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),aura=o.aura and {min=o.aura.damage_min,max=o.aura.damage_max,radius=o.aura.radius,factor=o.aura.damage_factor,flags=o.aura.vis_flags,bans=o.aura.vis_bans}};if o.aura then pending[#pending+1]=o end end,queue_remove_entity=function(_,o)o.oracleRemoved=true end}
 local co=coroutine.create(ray.main_script.update);local frames={};local damageIndex=1
 for frame=0,15 do store.tick_ts=frame/30;if mode=='target-moves'and frame==1 then enemies[1].pos.x=enemies[1].pos.x+60 end;if mode:find('tower%-sold')and frame==3 then entities[tower.id]=nil end
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,ray,store);assert(ok,debug.traceback(co,tostring(err)))end
  for _,a in ipairs(auras)do if not a.oracleRemoved then local ok,err=coroutine.resume(a.oracleCoroutine,a,store);assert(ok,debug.traceback(a.oracleCoroutine,tostring(err)))end end
  for _,a in ipairs(pending)do a.oracleCoroutine=coroutine.create(a.main_script.update);auras[#auras+1]=a end;pending={}
  local damage={};for i=damageIndex,#store.damage_queue do local d=store.damage_queue[i];damage[#damage+1]={target=names[d.target_id],value=d.value,type=d.damage_type};entities[d.target_id].health.hp=entities[d.target_id].health.hp-d.value end;damageIndex=#store.damage_queue+1
  local s=ray.render.sprites[1];frames[#frames+1]={at=store.tick_ts,hidden=not not s.hidden,removed=not not ray.oracleRemoved,rotation=s.r,scale=table.deepclone(s.scale),damage=damage}
 end
 rows[#rows+1]={level=level,factor=factor,mode=mode,bound=mode~='tower-sold-unbound',frames=frames,events=events}
end end end
simulation=oldSimulation;P.is_node_valid=oldValid
local f=assert(io.open('analysis/culverine-ray-oracle.json','w'));f:write(J.encode(rows));f:close();print('512 original Culverine ray and queued area damage frames exported')
