TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,S,sim,A=require('entity_db'),require('systems'),require('klove.simulation'),require('klove.animation_db');simulation=sim;SSO=nil
local encode=dofile('scripts/precise_json.lua')
require('sound_db').queue=function()end
for i=1,20 do local n,v=debug.getupvalue(S.particle_system.on_update,i);if n=='I'then v.s=function(_,name)return {webName=name}end end end
local name='ps_bullet_zefira'
local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'))
local config={template=name,system=E:create_entity(name).particle_system,animation=art.animations.hero_zefira_attack_particle_action}
assert(config.animation,'native animation missing');A.db[config.system.name]=config.animation
local cf=assert(io.open('public/data/zefira-trail.json','w'));cf:write(encode(config));cf:close()
local insert=sim.queue_insert_entity;local rows={}
for _,birth in ipairs({0,19,1248})do for _,to in ipairs({{x=620,y=350},{x=380,y=430},{x=620,y=470},{x=505,y=390},{x=500,y=390}})do for _,roll in ipairs({.05,.5,.95,'sequence'})do for _,kind in ipairs({'normal','moving','removed'})do
 local store={};sim:init(store,S,{'main_script','particle_system'},1/30);store.render_frames={};store.damage_queue={}
 for i=1,birth do sim:do_tick()end
 local enemy=E:create_entity('enemy_bandit');enemy.main_script=nil;enemy.pos=table.deepclone(to);enemy.unit.hit_offset={x=0,y=0};enemy.health.hp=1000
 local b=E:create_entity('bullet_zefira');b.pos={x=500,y=390};b.bullet.from=table.deepclone(b.pos);b.bullet.to=table.deepclone(to);b.bullet.target_id=enemy.id;b.bullet.damage_min=4;b.bullet.damage_max=12;b.bullet.pop=nil
 local calls=0;math.random=function(a,b)calls=calls+1;local value=roll=='sequence'and({.01,.91,.19,.81,.39,.61,.59,.41})[(calls-1)%8+1]or roll;return a and a+math.floor(value*(b-a+1))or value end
 local emitter,queued
 sim.queue_insert_entity=function(self,e)if e and e.template_name==name then emitter=e;queued=store.tick_ts end;if e==b or e==enemy or e and e.template_name==name then insert(self,e)end end
 sim:queue_insert_entity(enemy);sim:queue_insert_entity(b);local frames={}
 for tick=1,90 do
  if kind=='removed'and tick==5 then sim:queue_remove_entity(b)end
  if kind=='moving'then enemy.pos.x=to.x+(tick-1)*40/30 end
  sim:do_tick();local particles={}
  if emitter then for _,p in ipairs(emitter.particle_system.particles)do local f=p.f;particles[#particles+1]={at=p.ts,lifetime=p.lifetime,pos=table.deepclone(p.pos),rotation=p.r,frame=f.ss and f.ss.webName,alpha=f.alpha,scale=table.deepclone(f.scale),drawOrder=f.draw_order}end end
  frames[#frames+1]={at=store.tick_ts,calls=calls,source=store.entities[b.id]~=nil,pos=table.deepclone(b.pos),queued=queued,emitter=emitter and store.entities[emitter.id]~=nil or false,emit=emitter and emitter.particle_system.emit,emitTs=emitter and emitter.particle_system.emit_ts,emitterAt=emitter and emitter.particle_system.ts,particles=particles}
 end
 assert(emitter,'native main did not run');assert(not store.entities[b.id],'native bullet did not finish/remove');rows[#rows+1]={birth=birth,to=to,roll=roll,kind=kind,frames=frames};sim.queue_insert_entity=insert
end end end end
local f=assert(io.open('analysis/zefira-particles-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original Zefira main/particle traces exported')
