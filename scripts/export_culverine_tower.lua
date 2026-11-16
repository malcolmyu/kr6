EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,J=require('entity_db'),require('utils'),require('dkjson');local originalFind=U.find_foremost_enemy;local sound=require('sound_db');local oldSound=sound.queue;local oldSimulation=simulation
local times={};for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/go_towers_culverine -name "*.exo3"'):lines()do local e=dofile(file);local a={};for _,v in ipairs(e.animations)do a[v.name]=#v.frames/e.fps end;times[file:match('([^/]+)%.exo3$')]=a end
local tf=assert(io.open('public/data/culverine-exo-times.json','w'));tf:write(J.encode(times));tf:close()
local A=require('klove.animation_db');local rows={}
for level=1,4 do for _,born in ipairs({0,19})do for _,offset in ipairs({{120,0},{0,120},{-120,0},{0,-120}})do
 local t=E:create_entity('tower_culverine_lvl'..level);t.pos={x=500,y=350};local e=E:create_entity('enemy_bandit');e.pos={x=500+offset[1],y=350+offset[2]};e.health.hp=1000;e.health.hp_max=1000;e.health.armor=0;e.health.magic_armor=0;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local store={tick_ts=born,tick_length=1/30,wave_group_number=1,entities={[t.id]=t,[e.id]=e}}
 local events={};U.find_foremost_enemy=function()return e,{e},table.deepclone(e.pos)end
 simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),to=o.bullet and table.deepclone(o.bullet.to),factor=o.bullet and o.bullet.damage_factor,towerRef=o.tower_ref~=nil}end,queue_remove_entity=function()end}
 sound.queue=function(_,name,args)if name then events[#events+1]={at=store.tick_ts,sound=name,args=args}end end
 if t.main_script.insert then t.main_script.insert(t,store)end
 local co=coroutine.create(t.main_script.update);local frames={}
 for frame=0,240 do store.tick_ts=born+frame/30
  local ok,err=coroutine.resume(co,t,store);assert(ok,debug.traceback(co,tostring(err)))
  local parts={};for _,s in ipairs(t.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,hidden=not not s.hidden,loop=s.loop}end
  frames[#frames+1]={at=store.tick_ts,parts=parts,attackTs=t.attacks.list[1].ts}
  for _,s in ipairs(t.render.sprites)do if s.prefix and times[s.prefix]and times[s.prefix][s.name]then local _,runs=A:fni({prefix=s.prefix..'_'..s.name,from=1,to=math.floor(times[s.prefix][s.name]*30+.5)},store.tick_ts-s.ts,s.loop,30,store.tick_length);s.runs=runs end end
 end
 rows[#rows+1]={level=level,born=born,offset=offset,frames=frames,events=events}
end end end
U.find_foremost_enemy=originalFind;sound.queue=oldSound;simulation=oldSimulation
local f=assert(io.open('analysis/culverine-tower-oracle.json','w'));f:write(J.encode(rows));f:close();print('7712 original Culverine tower frames exported; only target choice/prediction isolated')
