EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local GR=require('grid_db')
require('sound_db').queue=function()end;GR.cell_is=function()return false end
simulation={queue_insert_entity=function()end,queue_remove_entity=function()end}
local random=math.random;math.random=function(a,b)if a then return math.floor((a+(b or 1))/2)else return .5 end end
local rows={}
for level=1,4 do for _,speed in ipairs({{x=0,y=0},{x=30,y=0},{x=-30,y=20},{x=100,y=-60},{x=0,y=0,warp=true}})do
 local target=E:create_entity('enemy_bandit');target.pos={x=120,y=12};target.unit.hit_offset={x=0,y=0};target.motion.speed=table.deepclone(speed);target.health.hp=1000;target.health.hp_max=1000
 local e=E:create_entity('bullet_archers_lvl'..level);e.pos={x=0,y=0};e.bullet.from={x=0,y=0};e.bullet.to={x=120,y=12};e.bullet.target_id=target.id;e.bullet.hit_blood_fx=nil;e.bullet.pop=nil;e.bullet.miss_decal=nil;e.bullet.hit_fx=nil
 local store={tick_length=1/30,tick_ts=0,entities={[target.id]=target},damage_queue={}}
 assert(e.main_script.insert(e,store));local co=coroutine.create(e.main_script.update)
 local row={name=e.template_name,targetSpeed=speed,from={x=0,y=0},targetStart={x=120,y=12},to=table.deepclone(e.bullet.to),duration=e.bullet.flight_time,speed=table.deepclone(e.bullet.speed),frames={}}
 for frame=0,60 do store.tick_ts=frame/30;target.pos={x=120+speed.x*store.tick_ts,y=12+speed.y*store.tick_ts};if speed.warp and frame>=8 then target.pos.x=target.pos.x+200;target.pos.y=target.pos.y+90 end;assert(coroutine.resume(co,e,store));row.frames[#row.frames+1]={pos=table.deepclone(e.pos),target=table.deepclone(target.pos),rotation=e.render.sprites[1].r,hidden=e.render.sprites[1].hidden or false,done=coroutine.status(co)=='dead'};if coroutine.status(co)=='dead'then break end end
 row.hit=#store.damage_queue>0;row.damage=store.damage_queue[1]and store.damage_queue[1].value;rows[#rows+1]=row
end end
math.random=random
local f=assert(io.open('analysis/tower-arrow-oracle.json','w'));f:write(J.encode(rows));f:close()

local create=require('script_utils').create_bullet_damage;local damageRows={}
for _,bounds in ipairs({{4,6},{9,13},{13,18},{16,26},{0,0}})do for _,factor in ipairs({0,.5,1,1.4})do for _,fraction in ipairs({0,.01,.1,.49,.5,.99,1})do
 math.random=function()return fraction end
 local d=create({damage_min=bounds[1],damage_max=bounds[2],damage_type=2,damage_factor=factor},1,2)
 damageRows[#damageRows+1]={min=bounds[1],max=bounds[2],factor=factor,fraction=fraction,value=d.value}
end end end
math.random=random
f=assert(io.open('analysis/bullet-damage-oracle.json','w'));f:write(J.encode(damageRows));f:close()
