TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,S,sim,A,G,UP=require('entity_db'),require('dkjson'),require('systems'),require('klove.simulation'),require('klove.animation_db'),require('grid_db'),require('upgrades');simulation=sim;SSO=nil
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));A.db.wizardfireballtrail_run=art.animations.wizardfireballtrail_run
for i=1,20 do local n,v=debug.getupvalue(S.particle_system.on_update,i);if n=='I'then v.s=function(_,name)return {webName=name}end end end
-- Isolated synthetic targets prescribe valid navigation; path filtering has its own native oracle.
require('path_db').is_node_valid=function()return true end
G.cell_type=function()return 1 end;UP.get_upgrade=function()end;require('sound_db').queue=function()end
local config={template='ps_firebook_wizard',system=E:create_entity('ps_firebook_wizard').particle_system,animation=art.animations.wizardfireballtrail_run}
if not arg[1]then local cf=assert(io.open('public/data/firebook-trail.json','w'));cf:write(J.encode(config));cf:close()end
local lateMain=arg[1]=='--late-main'
local combined=arg[1]=='--combined'or lateMain
if lateMain then local update=S.particle_system.on_update;S.particle_system.on_update=function(self,dt,time,store)math.random();return update(self,dt,time,store)end end
local originalInsert=sim.queue_insert_entity;local rows={}
for _,birth in ipairs({0,19})do for _,to in ipairs({{x=620,y=350},{x=380,y=430},{x=620,y=470}})do for _,roll in ipairs({.05,.5,.95,'sequence'})do for _,kind in ipairs({'normal','removed'})do
 local store={};sim:init(store,S,combined and {'mod_lifecycle','main_script','health','pops','particle_system'}or{'main_script','particle_system'},1/30);store.render_frames={}
 for i=1,birth do sim:do_tick()end
 local calls=0;math.random=function(a,b)calls=calls+1;local value=roll=='sequence'and({.01,.91,.19,.81,.39,.61,.59,.41})[(calls-1)%8+1]or roll;return a and a+math.floor(value*(b-a+1))or value end
 local b=E:create_entity('bullet_firebook_wizard');b.pos={x=500,y=390};b.bullet.from=table.deepclone(b.pos);b.bullet.to=to;b.bullet.damage_min=40;b.bullet.damage_max=40;b.bullet.level=1;if not combined then b.bullet.pop=nil end
 local enemy,pops=nil,{}
 if combined then enemy=E:create_entity('enemy_bandit');enemy.pos=table.deepclone(to);enemy.health.hp=1000;enemy.health.hp_max=1000;enemy.enemy.gold=0;enemy.enemy.gems=0;enemy.main_script=nil end
 local emitter,queued
 sim.queue_insert_entity=function(self,e)if e and e.pop_y_offset then pops[#pops+1]={at=store.tick_ts,pos=table.deepclone(e.pos),rotation=e.render.sprites[1].r,frame=e.render.sprites[1].name}end;if e==b or e==enemy or e and(e.modifier or e.template_name=='ps_firebook_wizard')then if e~=b and e~=enemy and not e.modifier then emitter=e;queued=store.tick_ts end;originalInsert(self,e)end end
 if enemy then sim:queue_insert_entity(enemy)end;sim:queue_insert_entity(b);local frames={}
 for tick=1,100 do
  if kind=='removed'and tick==12 then sim:queue_remove_entity(b)end
  sim:do_tick();local particles={}
  if emitter then for _,p in ipairs(emitter.particle_system.particles)do local f=p.f;particles[#particles+1]={at=p.ts,lifetime=p.lifetime,pos=table.deepclone(p.pos),rotation=p.r,frame=f.ss and f.ss.webName,alpha=f.alpha,scale=table.deepclone(f.scale),drawOrder=f.draw_order,paint={x=f.pos.x,y=f.sort_y or f.pos.y+(f.sort_y_offset or 0),z=f.z,draw=f.draw_order}}end end
  frames[#frames+1]={hp=enemy and enemy.health.hp,at=store.tick_ts,calls=calls,source=store.entities[b.id]~=nil,queued=queued,emitter=emitter and store.entities[emitter.id]~=nil or false,emit=emitter and emitter.particle_system.emit,emitTs=emitter and emitter.particle_system.emit_ts,emitterAt=emitter and emitter.particle_system.ts,particles=particles}
 end
 if combined and kind=='normal'then assert(enemy.health.hp<1000,'native projectile/health coroutine did not run')end
 rows[#rows+1]={birth=birth,to=to,roll=roll,kind=kind,frames=frames,pops=pops};sim.queue_insert_entity=originalInsert
end end end end
local f=assert(io.open(arg[1]=='--painter'and'analysis/firebook-particles-painter-oracle.json'or lateMain and 'analysis/firebook-particles-late-main-oracle.json'or combined and 'analysis/firebook-particles-combined-oracle.json'or 'analysis/firebook-particles-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original main_script + particle_system firebook trails exported')
