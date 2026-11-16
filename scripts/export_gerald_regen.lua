EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local rows={}
for _,born in ipairs({0,19})do for _,mode in ipairs({'normal','conditions','growth'})do
 local h=E:create_entity('hero_gerald');h.main_script.insert(h,{tick_ts=born});h.health.hp=120
 local a=E:create_entity('aura_gerald_talent_2_regeneration');a.aura.source_id=h.id
 local store={tick_ts=born,tick_length=1/30,entities={[h.id]=h}};local removed=false;simulation={queue_remove_entity=function()removed=true end};assert(a.main_script.insert(a,store));local co=coroutine.create(a.main_script.update);local frames={}
 for frame=0,330 do store.tick_ts=born+frame/30
  if frame==30 then h.health.hp=h.health.hp-70 end
  if mode=='conditions'then h.unit.is_stunned=frame>=30 and frame<60;h.vis.bans=frame>=90 and frame<120 and 4 or 0;store.entities[999999]=frame>=150 and frame<180 and{modifier={target_id=h.id,type='freeze'}}or nil end
  if mode=='growth'and frame==120 then h.health.hp_max=400;h.health.hp=200 end
  if frame==240 then h.health.dead=true;h.health.hp=0 end
  if not removed then local ok,err=coroutine.resume(co,a,store);assert(ok,debug.traceback(co,tostring(err)))end
  frames[#frames+1]={at=store.tick_ts,hp=h.health.hp,hpMax=h.health.hp_max,ts=a.aura.ts,removed=removed}
 end
 rows[#rows+1]={born=born,mode=mode,regen=a.regen.health,frames=frames}
end end
local f=assert(io.open('analysis/gerald-regen-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original Gerald regeneration aura traces exported')
