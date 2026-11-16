EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local times=J.decode(assert(io.open('public/data/zefira-exo-times.json')):read('*a'));local rows={}
for level=1,3 do for _,born in ipairs({0,19})do for _,mode in ipairs({'normal','refresh','death'})do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};local m=E:create_entity('mod_zefira_skill_c_dmg_buff');m.modifier.target_id=h.id;m.modifier.source_id=h.id;m.modifier.duration=2+level*2;m.inflicted_damage_factor=1.2+level*.1
 local store={tick_ts=born,tick_length=1/30,entities={[h.id]=h}};local removed=false;simulation={queue_remove_entity=function()removed=true end}
 assert(m.main_script.insert(m,store));local co=coroutine.create(m.main_script.update);local frames={};local refreshFrame=math.floor((m.modifier.duration+.1)*30+.5)
 for frame=0,620 do store.tick_ts=born+frame/30
  if mode=='refresh'and frame==refreshFrame then m.modifier.ts=store.tick_ts end
  if mode=='death'and frame==60 then h.health.dead=true end
  for _,s in ipairs(m.render.sprites)do local t=times[s.prefix];s.runs=math.floor((store.tick_ts-s.ts)/t[s.name]+1e-9)end
  if not removed then local ok,err=coroutine.resume(co,m,store);assert(ok,debug.traceback(co,tostring(err)));if removed then m.main_script.remove(m,store)end end
  local sprites={};for _,s in ipairs(m.render.sprites)do sprites[#sprites+1]={name=s.name,ts=s.ts}end
  frames[#frames+1]={at=store.tick_ts,factor=h.unit.damage_factor,removed=removed,sprites=sprites}
 end
 rows[#rows+1]={level=level,born=born,mode=mode,frames=frames}
end end end
local f=assert(io.open('analysis/zefira-blink-buff-oracle.json','w'));f:write(J.encode(rows));f:close();print('Native Zefira teleport damage modifier traces exported')
