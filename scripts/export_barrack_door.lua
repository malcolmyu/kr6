TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,P,G,A,Sound=require('entity_db'),require('dkjson'),require('path_db'),require('grid_db'),require('klove.animation_db'),require('sound_db')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});G.cell_type=function()return TERRAIN_LAND end
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for rank=1,4 do for _,birth in ipairs({0,19})do for scenario=1,3 do
 E.last_id=1
 local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={}};local pending,events,frames,inputs={},{},{},{}
 local tower=E:create_entity('tower_knights_lvl'..rank);tower.pos={x=500,y=450};tower.barrack.rally_pos={x=600,y=350};store.entities[tower.id]=tower
 Sound.queue=function(_,name)if name then events[#events+1]={tick=store.tick,kind='sound',name=name}end end
 simulation={queue_insert_entity=function(_,e)pending[#pending+1]=e;events[#events+1]={tick=store.tick,kind='spawn',slot=e.soldier.tower_soldier_idx}end}
 local co=coroutine.create(tower.main_script.update)
 for relative=1,180 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  for _,e in ipairs(pending)do store.entities[e.id]=e end;pending={}
  local schedule=scenario==1 and{[25]=1,[35]=2,[95]=3}or scenario==2 and{[72]=1,[76]=2,[125]=3}or{[90]=1,[91]=2,[92]=3}
  local slot=schedule[relative]
  if slot then local s=tower.barrack.soldiers[slot];assert(s);s.health.dead=true;store.entities[s.id]=nil;inputs[#inputs+1]={tick=store.tick,slot=slot}end
  local ok,err=coroutine.resume(co,tower,store);assert(ok,debug.traceback(co,tostring(err)))
  local p=tower.render.sprites[3];local a=assert(art.animations[p.prefix..'_'..p.name],p.prefix..'_'..p.name)
  local _,runs,frame=A:fni({from=1,to=a.to-a.from+1,prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,store.tick_length);p.runs=runs;p.frame_idx=frame
  frames[#frames+1]={tick=store.tick,animation=p.name,ts=p.ts,frame=frame,open=tower.barrack.door_open}
 end
 rows[#rows+1]={rank=rank,birth=birth,scenario=scenario,inputs=inputs,events=events,frames=frames}
end end end
local f=assert(io.open('analysis/barrack-door-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original tower door cases exported')
