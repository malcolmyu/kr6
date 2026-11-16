TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,S,P,G,A,Sound=require('entity_db'),require('dkjson'),require('systems'),require('path_db'),require('grid_db'),require('klove.animation_db'),require('sound_db');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});G.cell_type=function()return TERRAIN_LAND end
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local counts={}
for name,t in pairs(E.entities)do if t.soldier and t.render then local s=t.render.sprites[1];local prefix=s.prefix;if prefix then counts[prefix]={};for an,a in pairs(art.animations)do if an:sub(1,#prefix+1)==prefix..'_'then counts[prefix][an:sub(#prefix+2)]=a.to-a.from+1 end end end end end
local f=assert(io.open('public/data/soldier-animation-frames.json','w'));f:write(J.encode(counts));f:close()
local tweenCases=arg[1]=='--death-tween'
local deathCases=arg[1]=='--death'or tweenCases
local encode=dofile('scripts/precise_json.lua');local rows={}
for rank=1,4 do for _,birth in ipairs({0,19})do for scenario=1,6 do
 E.last_id=1
 local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,wave_group_number=1,level_mode=3}
 local pendingRemoves={}
 local events,inputs,draws,frames={},{},{},{};local soldiers,enemies,cos={},{},{}
 Sound.queue=function(_,name)if name then events[#events+1]={tick=store.tick,kind='sound',name=name}end end
 Sound.stop=function(_,name)if name then events[#events+1]={tick=store.tick,kind='stop',name=name}end end
 simulation={queue_insert_entity=function()end,queue_remove_entity=function(_,e)if e and not pendingRemoves[e.id]then pendingRemoves[e.id]=store.tick;events[#events+1]={tick=store.tick,kind='queueRemove',key=e.webKey}end end,queue_damage=function(_,d)store.damage_queue[#store.damage_queue+1]=d;events[#events+1]={tick=store.tick,kind='damage',source=store.entities[d.source_id].webKey,target=store.entities[d.target_id].webKey,value=d.value}end}
 for i=1,3 do
  local s=E:create_entity('soldier_knights_lvl'..rank);s.webKey='s'..i;s.pos={x=590+i*5,y=350+(i-2)*8};s.nav_rally.center={x=600,y=350};s.nav_rally.pos=table.clone(s.pos);s.nav_rally.new=false;s.health.hp=s.health.hp_max;assert(s.main_script.insert(s,store));s.vis.bans=s.vis._bans;s.vis._bans=nil
  store.entities[s.id]=s;soldiers[i]=s;cos[i]=coroutine.create(s.main_script.update)
 end
 for i=1,(deathCases and 1 or 3) do local e=E:create_entity('enemy_bandit');e.webKey='e'..i;e.main_script=nil;e.pos={x=650+i*3,y=350+(i-2)*12};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=101-i;e.health.hp=10000;e.health.hp_max=10000;e.enemy.gold=0;e.enemy.gems=0;e.heading={angle=math.pi};e.motion.speed={x=-40,y=0};store.entities[e.id]=e;enemies[i]=e end
 local calls=0;math.random=function(a,b)calls=calls+1;local roll=not deathCases and scenario==6 and({.91,.21,.81,.31,.71,.41,.61,.51})[(calls-1)%8+1]or .25;local result=a and a+math.floor(roll*((b or a)-(b and a or 1)+1))or roll;if a and not b then result=1+math.floor(roll*a)end;draws[#draws+1]={tick=store.tick,min=a,max=b,value=result};return result end
 for relative=1,(deathCases and 450 or 360) do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  for id,queuedAt in pairs(pendingRemoves)do if store.tick>queuedAt and store.entities[id]then events[#events+1]={tick=store.tick,kind='remove',key=store.entities[id].webKey};store.entities[id]=nil end end
  if not deathCases and (scenario==2 and relative==50 or scenario==3 and relative==70) then enemies[1].health.hp=0;enemies[1].health.dead=true;inputs[#inputs+1]={tick=store.tick,kind='dead',target='e1'}end
  if not deathCases and scenario==4 then for i,e in ipairs(enemies)do e.pos.x=relative<50 and 750+i*3 or 650+i*3 end end
  if not deathCases and scenario==5 then enemies[1].enemy.max_blockers=1;enemies[2].enemy.max_blockers=1 end
  for i,s in ipairs(soldiers)do if store.entities[s.id]and coroutine.status(cos[i])~='dead'then local ok,err=coroutine.resume(cos[i],s,store);assert(ok,debug.traceback(cos[i],tostring(err)))end end
  if deathCases and relative==({1,25,35,40,45,52})[scenario]then local d=E:create_entity('damage');d.target_id=soldiers[2].id;d.value=100000;d.damage_type=DAMAGE_PHYSICAL;table.insert(store.damage_queue,d);inputs[#inputs+1]={tick=store.tick,kind='fatal',target='s2'}end
  S.health:on_update(1/30,store.tick_ts,store)
  S.pops:on_update(1/30,store.tick_ts,store)
  if tweenCases then S.tween:on_update(1/30,store.tick_ts,store)end
  local units,actors={},{}
  for _,s in ipairs(soldiers)do local p=s.render.sprites[1];local count=assert(counts[p.prefix][p.name],p.prefix..'/'..p.name);local _,runs,frame=A:fni({from=1,to=count,prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,store.tick_length);p.runs=runs;p.frame_idx=frame;units[#units+1]={key=s.webKey,inTable=store.entities[s.id]~=nil,hp=s.health.hp,dead=s.health.dead,deathTs=s.health.death_ts,deleteAfter=s.health.delete_after,alpha=p.alpha,tween=s.tween and{ts=s.tween.ts,keys=s.tween.props[1].keys},pos=table.clone(s.pos),target=s.soldier.target_id and store.entities[s.soldier.target_id].webKey,animation=p.name,ts=p.ts,frame=frame,loop=p.loop,flip=p.flip_x,attackTs=s.melee.attacks[1].ts}end
  for _,e in ipairs(enemies)do local blockers={};for _,id in ipairs(e.enemy.blockers)do blockers[#blockers+1]=store.entities[id].webKey end;actors[#actors+1]={key=e.webKey,pos=table.clone(e.pos),hp=e.health.hp,dead=e.health.dead,blockers=blockers}end
  frames[#frames+1]={tick=store.tick,units=units,enemies=actors,calls=calls,eventCount=#events}
 end
 rows[#rows+1]={rank=rank,birth=birth,scenario=scenario,inputs=inputs,draws=draws,events=events,frames=frames}
end end end
local f=assert(io.open(tweenCases and 'analysis/soldier-death-tween-oracle.json'or deathCases and 'analysis/soldier-death-oracle.json'or'analysis/soldier-combat-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original live three-knight '..(deathCases and 'death /21600' or 'combat /17280')..' frames exported')
