TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,S,P,G,A,Sound,J=require('entity_db'),require('script_utils'),require('systems'),require('path_db'),require('grid_db'),require('klove.animation_db'),require('sound_db'),require('dkjson');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768})
local animations=J.decode(assert(io.open('public/data/enemies-animations.json')):read('*a'));local towerArt=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));for k,v in pairs(towerArt.animations)do animations[k]=v end
local crow=arg[1]=='--crow';local rows={};local originalDeath=SU.y_enemy_death
for _,name in ipairs(crow and{'enemy_crow'}or{'enemy_bandit','enemy_blackguard','enemy_shadow_archer','enemy_shadow_blades'})do for _,birth in ipairs({0,19})do for _,fatal in ipairs({1,31,32,35,38,39,49,50,51,70})do for _,damageType in ipairs({2,4,8,2048,4096})do for _,terrain in ipairs({1,2})do
 E.last_id=1
 local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,wave_group_number=1,level_mode=3,level_difficulty=2};local events,frames,pending,removes={},{},{},{}
 G.cell_type=function()return store.tick>birth+fatal and terrain or TERRAIN_LAND end
 Sound.queue=function(_,sound)if sound then events[#events+1]={tick=store.tick,kind='sound',name=sound}end end;Sound.stop=function()end
 simulation={queue_insert_entity=function(_,o)pending[#pending+1]=o;events[#events+1]={tick=store.tick,kind='effect',name=o.template_name,pos=table.clone(o.pos),sprite=o.render.sprites[1].name}end,queue_remove_entity=function(_,o)if not o.pending_removal then o.pending_removal=true;removes[#removes+1]=o;events[#events+1]={tick=store.tick,kind='queueRemove',name=o.template_name}end end}
 local e=E:create_entity(name);e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.pos=table.clone(P:node_pos(1,1,100));e.health.hp=10000;e.health.hp_max=10000;e.render.sprites[1].ts=store.tick_ts;assert(e.main_script.insert(e,store));e.ranged=nil;store.entities[e.id]=e
 local s=E:create_entity('soldier_knights_lvl1');s.main_script=nil;s.health.hp=100000;s.health.hp_max=100000;s.pos={x=e.pos.x-34,y=e.pos.y};s.motion.arrived=true;store.entities[s.id]=s;if not crow then s.soldier.target_id=e.id;e.enemy.blockers={s.id}end
 local initial={pos=table.clone(e.pos),soldierPos=table.clone(s.pos)}
 SU.y_enemy_death=function(st,actor)events[#events+1]={tick=store.tick,kind='deathStart',name=actor.template_name};return originalDeath(st,actor)end
 math.random=function(a,b)if a and not b then return 1+math.floor(.25*a)elseif a then return a+math.floor(.25*(b-a+1))end;return .25 end
 local co=coroutine.create(e.main_script.update)
 for relative=1,230 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  for _,o in ipairs(pending)do store.entities[o.id]=o;S.tween:on_insert(o,store)end;pending={}
  for _,o in ipairs(removes)do store.entities[o.id]=nil;events[#events+1]={tick=store.tick,kind='remove',name=o.template_name}end;removes={}
  if store.entities[e.id]and coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,e,store);assert(ok,debug.traceback(co,tostring(err)))end
  S.tween:on_update(1/30,store.tick_ts,store)
  if relative==fatal then local d=E:create_entity('damage');d.target_id=e.id;d.damage_type=damageType;d.value=100000;table.insert(store.damage_queue,d)end
  S.health:on_update(1/30,store.tick_ts,store);S.pops:on_update(1/30,store.tick_ts,store)
  for _,o in pairs(store.entities)do if o.render then for _,p in ipairs(o.render.sprites)do if p.animated~=false and p.prefix then local a=animations[p.prefix..'_'..p.name];if a then local _,runs,frame=A:fni({from=1,to=a.to-a.from+1,prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,store.tick_length);p.runs=runs;p.frame_idx=frame end end end end end
  local p=e.render.sprites[1];local blood={};for _,o in pairs(store.entities)do if o.template_name=='decal_blood_pool'then blood[#blood+1]={pos=table.clone(o.pos),at=o.render.sprites[1].ts,alpha=o.render.sprites[1].alpha}end end
  frames[#frames+1]={pos=table.clone(e.pos),heading=e.heading and e.heading.angle,tick=store.tick,hp=e.health.hp,soldierHp=s.health.hp,inTable=store.entities[e.id]~=nil,animation=p.name,ts=p.ts,frame=p.frame_idx,flip=p.flip_x,alpha=p.alpha,hidden=p.hidden_count,ignoreDelete=e.health.ignore_delete_after,deathFinished=e.health.death_finished_ts,blood=blood}
 end
 rows[#rows+1]={name=name,birth=birth,fatal=fatal,damageType=damageType,terrain=terrain,initial=initial,events=events,frames=frames};SU.y_enemy_death=originalDeath
end end end end end
local f=assert(io.open(crow and'analysis/crow-death-oracle.json'or'analysis/enemy-death-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original enemy main/death/health/tween traces exported; ranged disabled, stationary blocker, controlled death terrain')
