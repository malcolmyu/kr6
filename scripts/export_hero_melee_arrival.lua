TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,S,P,G,A,Sound,J=require('entity_db'),require('script_utils'),require('systems'),require('path_db'),require('grid_db'),require('klove.animation_db'),require('sound_db'),require('dkjson');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});G.cell_type=function()return TERRAIN_LAND end
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
Sound.queue=function()end;Sound.stop=function()end
for _,entry in ipairs({{'hero_gerald',1},{'hero_gerald',2},{'hero_zefira',1}})do
 for _,birth in ipairs({0,19,1314,1315,1316,1349})do for _,distance in ipairs({0,1,5,25})do
  local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,wave_group_number=1,level_mode=3}
  local h=E:create_entity(entry[1]);h.pos={x=600-30-h.soldier.melee_slot_offset.x-distance,y=350};assert(h.main_script.insert(h,store));h.nav_rally.center=table.clone(h.pos);h.nav_rally.new=false;h.motion.arrived=false
  local e=E:create_entity('enemy_bandit');e.pos={x=600,y=350};e.heading={angle=math.pi};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.motion.speed={x=-40,y=0};e.health.hp=1000;e.enemy.gold=0;e.enemy.gems=0
  store.entities[h.id]=h;store.entities[e.id]=e
  local attack=h.melee.attacks[entry[2]];local frames,damageEvents={},{}
  math.random=function(a,b)if a then return a+math.floor(.25*(b-a+1))end;return .25 end
  simulation={queue_insert_entity=function()end,queue_remove_entity=function()end,queue_damage=function(_,d)store.damage_queue[#store.damage_queue+1]=d;damageEvents[#damageEvents+1]={tick=store.tick,value=d.value}end}
  local co=coroutine.create(function()
   while SU.soldier_move_to_slot_step(store,h,e)do coroutine.yield()end
   SU.y_soldier_do_single_melee_attack(store,h,e,attack)
  end)
  for relative=1,90 do
   store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
   local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)))
   for _,d in ipairs(store.damage_queue)do damageEvents[#damageEvents+1]={tick=store.tick,value=d.value}end
   S.health:on_update(1/30,store.tick_ts,store)
   local p=h.render.sprites[1];local a=art.animations[p.prefix..'_'..p.name];local count=a and(a.to-a.from+1);if not count then for _,an in ipairs(art.exos[p.prefix].animations)do if an.name==p.name then count=#an.frames end end end;assert(count,p.prefix..'_'..p.name);local _,runs,frame=A:fni({from=1,to=count,prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,store.tick_length);p.runs=runs;p.frame_idx=frame
   frames[#frames+1]={tick=store.tick,pos=table.clone(h.pos),animation=p.name,ts=p.ts,enemyHp=e.health.hp,arrived=h.motion.arrived}
   if #damageEvents>0 then break end
  end
  assert(#damageEvents==1)
  rows[#rows+1]={name=entry[1],attack=entry[2],birth=birth,distance=distance,frames=frames,damage=damageEvents[1]}
 end end
end
local f=assert(io.open('analysis/hero-melee-arrival-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original preselected hero move-to-slot and first-strike traces exported')
