TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,GR,J=require('entity_db'),require('grid_db'),require('dkjson');require('sound_db').queue=function()end;GR.cell_is=function()return false end
local rows={}
for _,birth in ipairs({0,19,1795})do for _,delta in ipairs({{x=120,y=12},{x=-140,y=-80},{x=40,y=150}})do for _,velocity in ipairs({{x=0,y=0},{x=30,y=0},{x=-30,y=20},{x=0,y=0,warp=true}})do for _,roll in ipairs({.2,.8})do
 local from={x=500,y=450};local target=E:create_entity('enemy_bandit');target.pos={x=from.x+delta.x,y=from.y+delta.y};target.unit.hit_offset={x=0,y=0};target.motion.speed=table.clone(velocity);target.health.hp=5000
 local p=E:create_entity('bullet_skill_c_wizard_1');p.pos=table.clone(from);p.bullet.from=table.clone(from);p.bullet.to=table.clone(target.pos);p.bullet.target_id=target.id;p.bullet.level=2;p.bullet.damage_min=50;p.bullet.damage_max=50;p.bullet.pop=nil
 local calls,payload=0,false;local store={tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[target.id]=target},damage_queue={}}
 math.random=function(a,b)calls=calls+1;return a and a+math.floor(roll*(b-a+1))or roll end
 simulation={queue_insert_entity=function(_,o)if o.template_name=='controller_tower_wizard_book_bounce'then payload=true end end,queue_remove_entity=function()end}
 assert(p.main_script.insert(p,store));local initial={to=table.clone(p.bullet.to),duration=p.bullet.flight_time,speed=table.clone(p.bullet.speed),rotation=p.render.sprites[1].r,calls=calls}
 local co=coroutine.create(p.main_script.update);local frames={}
 for relative=0,100 do store.tick_ts=(birth+relative)*TICK_LENGTH;target.pos={x=from.x+delta.x+velocity.x*relative*TICK_LENGTH,y=from.y+delta.y+velocity.y*relative*TICK_LENGTH};if velocity.warp and relative>=8 then target.pos.x=target.pos.x+200;target.pos.y=target.pos.y+90 end
  local ok,err=coroutine.resume(co,p,store);assert(ok,debug.traceback(co,tostring(err)));frames[#frames+1]={tick=birth+relative,pos=table.clone(p.pos),target=table.clone(target.pos),rotation=p.render.sprites[1].r,payload=payload,damage=store.damage_queue[1]and store.damage_queue[1].value or 0};if payload then break end
 end
 assert(payload);rows[#rows+1]={birth=birth,from=from,delta=delta,velocity=velocity,roll=roll,initial=initial,frames=frames}
end end end end
local f=assert(io.open('analysis/wizard-copies-motion-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original first thrown-book motion traces')
