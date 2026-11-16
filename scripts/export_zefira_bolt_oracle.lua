EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local S=require('sound_db')
S.queue=function()end
simulation={queue_remove_entity=function()end,queue_insert_entity=function()end}
local out={}
for _,to in ipairs({{x=120,y=50},{x=-200,y=-80},{x=450,y=250},{x=5,y=0},{x=0,y=0},{x=-2,y=8}})do
 local target=E:create_entity('enemy_bandit');target.pos=table.deepclone(to);target.unit.hit_offset={x=0,y=0};target.health.hp=100;target.health.hp_max=100
 local e=E:create_entity('bullet_zefira');e.pos={x=0,y=0};e.bullet.from={x=0,y=0};e.bullet.to=table.deepclone(to);e.bullet.target_id=target.id;e.bullet.damage_min=4;e.bullet.damage_max=12;e.bullet.particles_name=nil;e.bullet.hit_fx=nil;e.bullet.pop=nil
 local store={tick_length=1/30,tick_ts=0,entities={[target.id]=target},damage_queue={}}
 assert(e.main_script.insert(e,store));local co=coroutine.create(e.main_script.update)
 local trace={to=to,frames={}}
 for frame=0,150 do
  store.tick_ts=frame/30;local ok,err=coroutine.resume(co,e,store);assert(ok,err)
  trace.frames[#trace.frames+1]={pos=table.deepclone(e.pos),done=coroutine.status(co)=='dead',damage=#store.damage_queue}
  if coroutine.status(co)=='dead'then break end
 end
 out[#out+1]=trace
end
local f=assert(io.open('analysis/zefira-bolt-oracle.json','w'));f:write(J.encode(out));f:close()
