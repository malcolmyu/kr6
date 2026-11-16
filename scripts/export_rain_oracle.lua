EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local S=require('sound_db');local GR=require('grid_db')
S.queue=function()end;GR.cell_type=function()return 1 end
simulation={queue_remove_entity=function()end,queue_insert_entity=function()end}
local traces={}
for _,to in ipairs({{x=200,y=300},{x=600,y=50},{x=400,y=700}})do
 local e=E:create_entity('bullet_power_rain_of_fire');e.pos={x=to.x,y=768};e.bullet.to=table.deepclone(to)
 local store={tick_length=1/30,tick_ts=0,entities={},damage_queue={}}
 local co=coroutine.create(e.main_script.update);local trace={to=to,frames={}}
 for frame=0,119 do
  store.tick_ts=frame/30
  local ok,err=coroutine.resume(co,e,store);assert(ok,err)
  trace.frames[#trace.frames+1]={pos=table.deepclone(e.pos),velocity=table.deepclone(e.bullet.speed),done=coroutine.status(co)=='dead'}
  if coroutine.status(co)=='dead'then break end
 end
 traces[#traces+1]=trace
end
local f=assert(io.open('analysis/rain-oracle.json','w'));f:write(assert(J.encode(traces)));f:close()
