TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,P,G,S,sim,A=require('entity_db'),require('dkjson'),require('path_db'),require('grid_db'),require('systems'),require('klove.simulation'),require('klove.animation_db');simulation=sim;SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});require('difficulty'):set_level(2);require('difficulty'):patch_templates();require('sound_db').queue=function()end
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local name='ps_tower_wizard_bolt_trail';local config={template=name,system=E:create_entity(name).particle_system,animation=art.animations.wizardproyectiletrail_run};A.db.wizardproyectiletrail_run=config.animation
for i=1,20 do local n,v=debug.getupvalue(S.particle_system.on_update,i);if n=='I'then v.s=function(_,n)return {webName=n}end end end
if not arg[1]then local cf=assert(io.open('public/data/wizard-bolt-trail.json','w'));cf:write(J.encode(config));cf:close()end
local insert=sim.queue_insert_entity;local rows={}
local pairedSequence=arg[1]=='--paired-sequence'
local particleOrder,mainOrder,entityMutations
if pairedSequence then local original=E.filter_iter;E.filter_iter=function(self,entities,c1,c2,c3)local iterator,state,key=original(self,entities,c1,c2,c3);if c1~='particle_system'and c1~='main_script'then return iterator,state,key end;return function(t,k)local id,e=iterator(t,k);if id then local order=c1=='particle_system'and particleOrder or mainOrder;if order then order[#order+1]={source=e.webShot,id=id}end end;return id,e end,state,key end end
if pairedSequence then
 local insert,remove=sim.insert_entity,sim.remove_entity
 sim.insert_entity=function(self,e)local result=insert(self,e);if entityMutations and self.store.entities[e.id]==e then entityMutations[#entityMutations+1]={op='set',id=e.id,source=e.webShot,role=e.template_name==name and'particle'or e.template_name:match('^bolt_tower_wizard')and'bolt'or'other'}end;return result end
 sim.remove_entity=function(self,e)local before=self.store.entities[e.id];local result=remove(self,e);if entityMutations and before and not self.store.entities[e.id]then entityMutations[#entityMutations+1]={op='delete',id=e.id}end;return result end
end
local kinds=pairedSequence and {'paired-sequence'}or{'normal','moving','ban-impact','removed-return','immune','sequence','insert-ban','two-lethal'}
for rank=1,4 do for _,birth in ipairs({0,19})do for _,kind in ipairs(kinds)do
 local store={level_mode=3,level_difficulty=2};sim:init(store,S,{'main_script','health','pops','particle_system'},1/30);store.render_frames={};store.player_gold=0;store.gems_collected=0
 for i=1,birth do sim:do_tick()end
 local enemy=E:create_entity('enemy_bandit');local enemyInsert=enemy.main_script.insert;enemy.main_script=nil;enemy.pos={x=620,y=350};enemy.nav_path.pi=1;enemy.nav_path.spi=1;enemy.nav_path.ni=100;enemy.motion.speed={x=0,y=0};enemy.enemy.gems=0;assert(enemyInsert(enemy,store));enemy.health.hp=nil
 if kind=='immune'then enemy.health.immune_to=4 end;if kind=='insert-ban'then enemy.vis.bans=2 end
 local calls=0;math.random=function(a,b)calls=calls+1;local v=(kind=='sequence'or kind=='paired-sequence')and({.9,.1,.8,.2,.7,.3,.6,.4})[(calls-1)%8+1]or .25;return a and a+math.floor(v*(b-a+1))or v end
 local bolts,emitters,pops,ids={},{},{},{}
 sim.queue_insert_entity=function(self,e)
  if not e then return end
  if e.pop_y_offset then pops[#pops+1]={at=store.tick_ts,frame=e.render.sprites[1].name,pos=table.deepclone(e.pos),rotation=e.render.sprites[1].r}end
  if e.template_name==name then e.webShot=ids[e.particle_system.track_id];emitters[#emitters+1]=e;insert(self,e)
  elseif e==enemy or e.template_name:match('^bolt_tower_wizard')then insert(self,e)end
 end
 sim:queue_insert_entity(enemy)
 for hand=1,(kind=='two-lethal'or kind=='paired-sequence')and 2 or 1 do local sign=kind=='two-lethal'and hand==2 and 1 or -1;local b=E:create_entity('bolt_tower_wizard_lvl'..rank);b.webShot=hand;ids[b.id]=hand;b.pos={x=sign==1 and 525 or 475,y=405};b.bullet.from=table.deepclone(b.pos);b.bullet.to=table.deepclone(enemy.pos);b.bullet.target_id=enemy.id;b.bullet.damage_factor=hand==2 and 1.75 or 1;b.force_motion.v.x=100*sign;b.initial_impulse_angle_abs=b.initial_impulse_angle_abs-math.pi/4*sign;bolts[#bolts+1]=b;sim:queue_insert_entity(b)end
 local frames={}
 for tick=1,105 do
  local time=(birth+tick)*(1/30)
  enemy.pos.x=620+(kind=='moving'and(tick-1)*40/30 or 0)
  enemy.vis.bans=(kind=='insert-ban'or kind=='ban-impact'and tick>=6)and 2 or 0
  if kind=='removed-return'then if tick>=6 and tick<13 then store.entities[enemy.id]=nil elseif tick==13 then store.entities[enemy.id]=enemy end end
  particleOrder={};mainOrder={};entityMutations={};sim:do_tick();local shots,ps={},{ }
  for _,b in ipairs(bolts)do shots[#shots+1]={active=store.entities[b.id]~=nil,pos=table.deepclone(b.pos),to=table.deepclone(b.bullet.to),rotation=b.render.sprites[1].r,hidden=b.render.sprites[1].hidden or false,bound=b.bullet.target_id~=nil}end
  for _,e in ipairs(emitters)do local c=e.particle_system;local particles={};for _,p in ipairs(c.particles)do particles[#particles+1]={at=p.ts,lifetime=p.lifetime,pos=table.deepclone(p.pos),rotation=p.r,frame=p.f.ss and p.f.ss.webName,alpha=p.f.alpha,scale=table.deepclone(p.f.scale),drawOrder=p.f.draw_order}end;ps[#ps+1]={source=e.webShot,active=store.entities[e.id]~=nil,emit=c.emit,emitTs=c.emit_ts,at=c.ts,particles=particles}end
  frames[#frames+1]={entityMutations=pairedSequence and table.deepclone(entityMutations)or nil,mainOrder=pairedSequence and table.deepclone(mainOrder)or nil,particleOrder=pairedSequence and table.deepclone(particleOrder)or nil,at=store.tick_ts,hp=enemy.health.hp,dead=enemy.health.dead,gold=store.player_gold,calls=calls,shots=shots,trails=ps}
 end
 if kind~='insert-ban'then assert(#emitters>0,'native coroutine did not queue particles')end
 rows[#rows+1]={runtime=jit.version,nativeIds=pairedSequence and {bolts[1].id,bolts[2].id}or nil,rank=rank,birth=birth,kind=kind,frames=frames,pops=pops};sim.queue_insert_entity=insert
end end end
local f=assert(io.open(arg[2]or(pairedSequence and 'analysis/wizard-bolt-paired-sequence-oracle.json'or 'analysis/wizard-bolt-particles-oracle.json'),'w'));f:write(J.encode(rows));f:close();print(#rows..' original wizard bolt/health/pops/particle/retained-entity cases exported')
