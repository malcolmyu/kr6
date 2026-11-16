TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,S,P,G,A,Sound,U=require('entity_db'),require('dkjson'),require('systems'),require('path_db'),require('grid_db'),require('klove.animation_db'),require('sound_db'),require('utils');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});G.cell_type=function()return TERRAIN_LAND end
local art=J.decode(assert(io.open('public/data/enemies-animations.json')):read('*a'));local counts={}
for _,name in ipairs({'enemy_bandit','enemy_blackguard','enemy_shadow_archer','enemy_shadow_blades'})do local prefix=E:get_template(name).render.sprites[1].prefix;counts[prefix]={};for an,a in pairs(art)do if an:sub(1,#prefix+1)==prefix..'_'then counts[prefix][an:sub(#prefix+2)]=a.to-a.from+1 end end end
local f=assert(io.open('public/data/enemy-melee-frames.json','w'));f:write(J.encode(counts));f:close()
local rows={};local encode=dofile('scripts/precise_json.lua')
for _,name in ipairs({'enemy_bandit','enemy_blackguard','enemy_shadow_archer','enemy_shadow_blades'})do for _,birth in ipairs({0,19})do for scenario=1,13 do
 E.last_id=1
 local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,wave_group_number=1,level_mode=3,level_difficulty=2}
 local events,frames,draws,seen={},{},{},{}
 Sound.queue=function(_,name)if name then events[#events+1]={tick=store.tick,kind='sound',name=name}end end;Sound.stop=function()end
 simulation={queue_insert_entity=function(_,e)events[#events+1]={tick=store.tick,kind='effect',name=e.template_name}end,queue_remove_entity=function()end}
 local e=E:create_entity(name);e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.pos=table.clone(P:node_pos(1,1,100));e.health.hp=10000;e.health.hp_max=10000;e.render.sprites[1].ts=store.tick_ts
 assert(e.main_script.insert(e,store));e.ranged=nil;store.entities[e.id]=e
 local units={};for i=1,2 do local s=E:create_entity('soldier_knights_lvl1');s.webKey='s'..i;s.main_script=nil;s.health.hp=10000;s.health.hp_max=10000;s.pos={x=e.pos.x-34,y=e.pos.y+(i-1)*6};s.motion.arrived=true;store.entities[s.id]=s;units[i]=s end
 local first=units[1];first.soldier.target_id=e.id;e.enemy.blockers={first.id};if scenario==7 or scenario==12 then first.motion.arrived=false;first.motion.dest=table.clone(first.pos)end
 local initial={pos=table.clone(e.pos),units={table.clone(units[1].pos),table.clone(units[2].pos)}}
 local calls=0;math.random=function(a,b)calls=calls+1;local roll=.25;local value=a and a+math.floor(roll*((b or a)-(b and a or 1)+1))or roll;if a and not b then value=1+math.floor(roll*a)end;draws[#draws+1]={tick=store.tick,min=a,max=b,value=value};return value end
 local co=coroutine.create(e.main_script.update)
 for relative=1,240 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  if scenario==2 and relative==35 or scenario==3 and relative==40 or scenario==4 and relative==50 or scenario==5 and relative==100 or scenario==9 and relative==50 then U.unblock_target(store,first)end
  if scenario==5 and relative==150 then U.block_enemy(store,first,e)end
  if scenario==6 and relative==40 then U.unblock_target(store,first);U.block_enemy(store,units[2],e)end
  if scenario==7 and relative==10 or scenario==12 and relative==50 then first.motion.arrived=true end
  if scenario==8 then e.unit.is_stunned=relative>=45 and relative<65 end
  local ok,err=coroutine.resume(co,e,store);assert(ok,debug.traceback(co,tostring(err)))
  for _,d in ipairs(store.damage_queue)do if not seen[d]then seen[d]=true;events[#events+1]={tick=store.tick,kind='damage',target=store.entities[d.target_id].webKey,value=d.value}end end
  if scenario>=9 and relative==({[9]=35,[10]=40,[11]=50})[scenario]then local d=E:create_entity('damage');d.target_id=first.id;d.damage_type=DAMAGE_PHYSICAL;d.value=100000;seen[d]=true;table.insert(store.damage_queue,d)end
  S.health:on_update(1/30,store.tick_ts,store);S.pops:on_update(1/30,store.tick_ts,store)
  local sprite=e.render.sprites[1];local count=assert(counts[sprite.prefix][sprite.name],sprite.prefix..'/'..sprite.name);local _,runs,frame=A:fni({from=1,to=count,prefix='original'},store.tick_ts-sprite.ts,sprite.loop,sprite.fps,store.tick_length);sprite.runs=runs;sprite.frame_idx=frame
  local blockers={};for _,id in ipairs(e.enemy.blockers)do blockers[#blockers+1]=store.entities[id].webKey end
  frames[#frames+1]={tick=store.tick,pos=table.clone(e.pos),ni=e.nav_path.ni,speed=table.clone(e.motion.speed),animation=sprite.name,ts=sprite.ts,loop=sprite.loop,frame=frame,attackTs=e.melee.attacks[1].ts,hp={units[1].health.hp,units[2].health.hp},blockers=blockers,calls=calls}
 end
 rows[#rows+1]={name=name,birth=birth,scenario=scenario,initial=initial,events=events,frames=frames,draws=draws}
end end end
local f=assert(io.open('analysis/enemy-melee-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original full enemy main-script cases /'..#rows*240 ..'frames exported; ranged disabled and stationary blocker inputs declared')
