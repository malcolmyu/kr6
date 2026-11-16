EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,P,G,S,A,J,UP=require('entity_db'),require('utils'),require('path_db'),require('grid_db'),require('sound_db'),require('klove.animation_db'),require('dkjson'),require('upgrades');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local input=J.decode(assert(io.open('analysis/catapult-opening-input.json')):read('*a'));math.random=function()return input.wizardPairRoll end;assert(input.actorPhase=='before-enemy-main','opening capture phase is missing or outdated');local level=string.format('level%02d',input.stage);G:load(level);P:load(level,{left=-512/3,right=1024+512/3,bottom=0,top=768})
local apply;for i=1,20 do local n,fn=debug.getupvalue(UP.patch_templates,i);if n=='patch_upgrades'then apply=fn end end;assert(apply);UP.max_level=10;UP.levels=input.profile.globalUpgrades;apply(UP,{})
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local counts={};for prefix,def in pairs(art.exos)do counts[prefix]={};for _,a in ipairs(def.animations)do counts[prefix][a.name]=#a.frames end end
local sources,actors,walkers={},{},{};local shots,frames,walkErrors={},{},{};local currentSource
local store={tick_ts=0,tick=0,tick_length=1/30,wave_group_number=0,entities={}}
simulation={queue_insert_entity=function(_,e)if e and e.bullet then local target;for id,actor in pairs(actors)do if actor.id==e.bullet.target_id then target=id;break end end;shots[#shots+1]={at=store.tick_ts,site=currentSource,name=e.template_name,from=table.deepclone(e.pos),target=target,sign=e.force_motion.v.x/100}end end,queue_remove_entity=function()end};S.queue=function()end
local walkSamples=0
for _,frame in ipairs(input.frames)do
 store.tick_ts=frame.at;store.tick=math.floor(frame.at*30+.5);store.wave_group_number=frame.wave;store.entities={}
 local order={}
 for _,site in ipairs(frame.wizardSources)do
  local source=sources[site.id]
  if not source then local t=E:create_entity(site.name);t.pos=table.deepclone(site.pos);source={entity=t,co=coroutine.create(t.main_script.update)};sources[site.id]=source;if t.main_script.insert then assert(t.main_script.insert(t,store))end end
  store.entities[#store.entities+1]=source.entity;order[#order+1]=site.id
 end
 for _,actor in ipairs(frame.actors)do
  local e=actors[actor.id]
  if not e then e=E:create_entity(actor.name);actors[actor.id]=e end
  e.pos=table.deepclone(actor.pos);e.nav_path.pi=actor.pi;e.nav_path.spi=actor.spi;e.nav_path.ni=actor.ni;e.motion.speed=table.deepclone(actor.motion);e.motion.max_speed=actor.maxSpeed;e.health.hp=actor.hp;e.health.dead=false;e.vis.flags=actor.flags;e.vis.bans=actor.bans
  store.entities[#store.entities+1]=e
  -- Independent native walking starts from the first prescribed actor frame;
  -- this does not validate spawn/insert timing or collision/teleport decisions.
  local w=walkers[actor.id]
  if not w then w=E:create_entity(actor.name);w.pos=table.deepclone(actor.pos);w.nav_path.pi=actor.pi;w.nav_path.spi=actor.spi;w.nav_path.ni=actor.ni;walkers[actor.id]=w
  else
   w.motion.max_speed=w.webPreviousSpeed
   if w.webPreviousMoving then local dest=P:next_entity_node(w,store.tick_length);if dest then U.set_destination(w,dest);U.walk(w,store.tick_length)end end
   local distance=math.sqrt((w.pos.x-actor.pos.x)^2+(w.pos.y-actor.pos.y)^2);walkSamples=walkSamples+1
   if distance>1e-7 or w.nav_path.pi~=actor.pi or w.nav_path.ni~=actor.ni then walkErrors[#walkErrors+1]={at=frame.at,id=actor.id,distance=distance,expected={pi=actor.pi,ni=actor.ni,pos=actor.pos},actual={pi=w.nav_path.pi,ni=w.nav_path.ni,pos=table.deepclone(w.pos)}}end
  end
  w.webPreviousMoving=actor.moving;w.webPreviousSpeed=actor.maxSpeed
 end
 local states={}
 for _,id in ipairs(order)do
  currentSource=id;local source=sources[id];local t=source.entity
  local ok,err=coroutine.resume(source.co,t,store);assert(ok,debug.traceback(source.co,tostring(err)))
  local parts={};for _,sprite in ipairs(t.render.sprites)do parts[#parts+1]={name=sprite.name,ts=sprite.ts,flip=sprite.flip_x or false,loop=sprite.loop or false,offset=table.deepclone(sprite.offset)}end
  states[#states+1]={id=id,parts=parts,attackTs=t.attacks.list[1].ts,loading=t._loading,bobTime=t.time}
  for _,sprite in ipairs(t.render.sprites)do if sprite.prefix and counts[sprite.prefix]and counts[sprite.prefix][sprite.name]then local seq={prefix=sprite.prefix..'_'..sprite.name,from=1,to=counts[sprite.prefix][sprite.name]};local _,runs,index=A:fni(seq,store.tick_ts-sprite.ts,sprite.loop,sprite.fps,store.tick_length);sprite.runs=runs;sprite.frame_idx=index end end
 end
 frames[#frames+1]={at=frame.at,states=states}
end
local f=assert(io.open('analysis/wizard-opening-native.json','w'));f:write(J.encode({frames=frames,shots=shots,walkSamples=walkSamples,walkErrors=walkErrors}));f:close();print(#frames..' original wizard/FFE/path/animation frames; '..#shots..' shots; '..#walkErrors..' walking differences in '..walkSamples..' post-initial samples')
