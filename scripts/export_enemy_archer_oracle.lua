EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local SU=require('script_utils');local U=require('utils');local J=require('dkjson');local GR=require('grid_db')
require('sound_db').queue=function()end;GR.cell_is=function()return false end
simulation={queue_insert_entity=function()end,queue_remove_entity=function()end}
local out={bolts={},targeting={}}
for _,to in ipairs({{x=120,y=12},{x=-150,y=60},{x=220,y=-30}})do
 local target=E:create_entity('soldier_knights_lvl1');target.pos=table.deepclone(to);target.unit.hit_offset={x=0,y=0};target.health.hp=40;target.health.hp_max=40
 local e=E:create_entity('bullet_shadow_archer');e.pos={x=0,y=0};e.bullet.from={x=0,y=0};e.bullet.to=table.deepclone(to);e.bullet.target_id=target.id;e.bullet.hit_blood_fx=nil;e.bullet.pop=nil;e.bullet.miss_decal=nil
 local store={tick_length=1/30,tick_ts=0,entities={[target.id]=target},damage_queue={}}
 assert(e.main_script.insert(e,store));local co=coroutine.create(e.main_script.update)
 local row={to=to,duration=e.bullet.flight_time,speed=table.deepclone(e.bullet.speed),frames={}}
 for frame=0,60 do
  store.tick_ts=frame/30;local ok,err=coroutine.resume(co,e,store);assert(ok,err)
  row.frames[#row.frames+1]={pos=table.deepclone(e.pos),r=e.render.sprites[1].r,hidden=e.render.sprites[1].hidden or false,done=coroutine.status(co)=='dead'}
  if coroutine.status(co)=='dead'then break end
 end
 row.hits=#store.damage_queue;out.bolts[#out.bolts+1]=row
end
for _,pos in ipairs({{x=60,y=0},{x=61,y=0},{x=150,y=0},{x=151,y=0},{x=0,y=42},{x=0,y=43},{x=0,y=105},{x=0,y=106},{x=70,y=40}})do
 local e=E:create_entity('enemy_shadow_archer');e.pos={x=0,y=0};e.ranged.attacks[1].max_range=150
 local target=E:create_entity('soldier_knights_lvl1');target.pos=pos;target.health.hp=40
 local store={entities={[target.id]=target},tick_ts=10}
 out.targeting[#out.targeting+1]={pos=pos,nearest=U.find_nearest_soldier(store.entities,e.pos,60,150,2,0)~=nil,canRange=SU.can_range_soldier(store,e,target)}
end
local enemy=E:create_entity('enemy_shadow_archer');enemy.pos={x=500,y=350};enemy.ranged.order={1};enemy.ranged.attacks[1].max_range=150
local target=E:create_entity('soldier_knights_lvl1');target.pos={x=600,y=350};target.health.hp=1000
local store={tick_ts=0,tick_length=1/30,entities={[enemy.id]=enemy,[target.id]=target}}
local casts={};out.casts=casts
simulation.queue_insert_entity=function(_,bullet)casts[#casts+1]={at=store.tick_ts,from=table.deepclone(bullet.pos),to=table.deepclone(bullet.bullet.to)}end
local rng=math.random;math.random=function()return .5 end
local co=coroutine.create(function()while true do SU.y_enemy_range_attacks(store,enemy,target);coroutine.yield()end end)
for frame=0,210 do
 store.tick_ts=frame/30;local sprite=enemy.render.sprites[1]
 if not sprite.loop and store.tick_ts-sprite.ts>=24/30 then sprite.runs=1 end
 local ok,err=coroutine.resume(co);assert(ok,err)
end
math.random=rng
local f=assert(io.open('analysis/enemy-archer-oracle.json','w'));f:write(assert(J.encode(out)));f:close()
