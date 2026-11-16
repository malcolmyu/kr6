TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,A,Sound=require('entity_db'),require('dkjson'),require('klove.animation_db'),require('sound_db')
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local encode=dofile('scripts/precise_json.lua')
for _,stage in ipairs({1,3})do local extra=J.decode(assert(io.open('public/data/level0'..stage..'-art.json')):read('*a'));for k,v in pairs(extra.exos)do art.exos[k]=v end end
local names={'decal_stage_01_sheep','decal_stage_01_sheep_small','decal_stage_03_sheep','decal_stage_03_sheep_small','decal_stage_03_cow'}
local animations={}
for _,name in ipairs(names)do local t=E:get_template(name);local prefix=t.render.sprites[1].prefix;local exo=assert(art.exos[prefix]);local counts={};for _,a in ipairs(exo.animations)do counts[a.name]=#a.frames end;animations[prefix]={fps=exo.fps,counts=counts}end
local f=assert(io.open('public/data/ambient-creatures.json','w'));f:write(encode({names=names,animations=animations}));f:close()
local rows={}
for _,name in ipairs(names)do for _,birth in ipairs({0,19,827})do for _,roll in ipairs({.05,.5,.95})do for _,scenario in ipairs({'idle','tap','repeat','censored','early'})do
 local e=E:create_entity(name);e.pos={x=500,y=350};local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={[e.id]=e}}
 local calls,removed,removalAt=0,false,nil;local events={}
 math.random=function(a,b)calls=calls+1;return a and a+math.floor(roll*(b-a+1))or roll end
 Sound.queue=function(_,n)if n then events[#events+1]={tick=store.tick,sound=n}end end
 simulation={queue_remove_entity=function(_,entity)assert(entity==e);removalAt=store.tick;events[#events+1]={tick=store.tick,remove=true}end}
 require('features').censored_cn=scenario=='censored'
 local co=coroutine.create(e.main_script.update);local frames={}
 for relative=1,350 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30);if removalAt and store.tick>removalAt then removed=true end
  local clicked=scenario=='early'and relative==1 or scenario=='tap'and relative==3 or (scenario=='repeat'or scenario=='censored')and relative>=3 and relative<=7
  if clicked and not removed then e.ui.clicked=true end
  if not removed and coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,e,store);assert(ok,debug.traceback(co,tostring(err)))end
  local s=e.render.sprites[1];local cfg=animations[s.prefix];local _,runs,frame=A:fni({from=1,to=cfg.counts[s.name],prefix='original'},store.tick_ts-s.ts,s.loop,cfg.fps,store.tick_length);s.runs=runs;s.frame_idx=frame
  frames[#frames+1]={tick=store.tick,clicked=clicked,active=not removed,removalAt=removalAt,animation=s.name,ts=s.ts,loop=s.loop==true or s.loop==-1,frame=frame,calls=calls}
 end
 rows[#rows+1]={name=name,birth=birth,roll=roll,scenario=scenario,frames=frames,events=events}
end end end end
require('features').censored_cn=false
local f=assert(io.open('analysis/ambient-creatures-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original sheep/cow main+animation traces exported')
