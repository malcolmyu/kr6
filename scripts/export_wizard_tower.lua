EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,J=require('entity_db'),require('utils'),require('dkjson');local originalFind=U.find_foremost_enemy;local sound=require('sound_db');local oldSound=sound.queue;local oldSimulation=simulation;local oldRandom=math.random
local times={};for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/go_towers_wizard -name "*.exo3"'):lines()do local e=dofile(file);local a={};for _,v in ipairs(e.animations)do a[v.name]=#v.frames/e.fps end;times[file:match('([^/]+)%.exo3$')]=a end
local tf=assert(io.open('public/data/wizard-exo-times.json','w'));tf:write(J.encode(times));tf:close()
local A=require('klove.animation_db')
local rows={}
for level=1,4 do for _,birth in ipairs({0,19})do for _,kind in ipairs({'continuous','empty-move-block','pair','move-during-charge','pair-boundary','pair-other-choice','blocked-during-charge'})do
 local t=E:create_entity('tower_wizard_lvl'..level);t.pos={x=500,y=350};local e=E:create_entity('enemy_bandit');e.pos={x=600,y=350};e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local e2=E:create_entity('enemy_bandit');e2.pos={x=kind=='pair-boundary'and 650 or 610,y=kind=='pair-boundary'and 350 or 360};e2.health.hp=5000;e2.nav_path.pi=1;e2.nav_path.spi=1;e2.nav_path.ni=101
 local store={tick_ts=birth/30,tick_length=1/30,wave_group_number=1,entities={[t.id]=t,[e.id]=e,[e2.id]=e2}};local frame=0
 local events={};U.find_foremost_enemy=function()
  if kind=='empty-move-block'and(frame<31 or frame>=161 and frame<291 or frame>=501)then return nil end
  return e,kind:match('^pair')and{e,e2}or{e},table.deepclone(e.pos)
 end
 math.random=function(a,b)if a then return kind=='pair-other-choice'and b or a end;return .25 end
 simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),to=o.bullet and table.deepclone(o.bullet.to),factor=o.bullet and o.bullet.damage_factor,target=o.bullet and(o.bullet.target_id==e.id and'first'or'second'),angle=o.initial_impulse_angle_abs,velocity=o.force_motion and table.deepclone(o.force_motion.v)}end,queue_remove_entity=function()end}
 sound.queue=function(_,name,args)if name then events[#events+1]={at=store.tick_ts,sound=name,args=args}end end
 local co=coroutine.create(t.main_script.update);local frames={}
 for relative=1,660 do frame=relative;store.tick_ts=(birth+relative)*(1/30)
  if kind=='move-during-charge'then e.pos.y=frame>=16 and 380 or 350 end
  if kind=='blocked-during-charge'then t.tower.blocked=frame>=16 and frame<62 end
  if kind=='empty-move-block'then t.tower.blocked=frame>=351 and frame<411;e.pos.y=frame>=291 and 450 or 350 end
  local ok,err=coroutine.resume(co,t,store);assert(ok,debug.traceback(co,tostring(err)))
  local parts={};for _,s in ipairs(t.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop,offset=table.deepclone(s.offset)}end
  frames[#frames+1]={at=store.tick_ts,parts=parts,attackTs=t.attacks.list[1].ts,loading=t._loading,bobTime=t.time}
  for _,s in ipairs(t.render.sprites)do if s.prefix and times[s.prefix]and times[s.prefix][s.name]then local count=math.floor(times[s.prefix][s.name]*30+.5);local _,runs=A:fni({prefix=s.prefix..'_'..s.name,from=1,to=count},store.tick_ts-s.ts,s.loop,s.fps,store.tick_length);s.runs=runs end end
 end
 rows[#rows+1]={level=level,birth=birth,kind=kind,frames=frames,events=events}
end end end
U.find_foremost_enemy=originalFind;sound.queue=oldSound;simulation=oldSimulation;math.random=oldRandom
local f=assert(io.open('analysis/wizard-tower-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original wizard tower basic coroutine exported: '..#rows..' cases; target selection/prediction isolated; original animation_db.fni completion')
