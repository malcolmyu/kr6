EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,J,S,A=require('entity_db'),require('utils'),require('dkjson'),require('sound_db'),require('klove.animation_db')
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local durations={};for name,exo in pairs(art.exos)do durations[name]={};for _,a in ipairs(exo.animations)do durations[name][a.name]=#a.frames/exo.fps end end
local rows={}
for level=1,3 do for _,birth in ipairs({0,19})do for _,kind in ipairs({'only-copies','combined','no-copy-target','empty-window','move-start','blocked-start','purchase-during-basic','upgrade-windup'})do
 local t=E:create_entity('tower_wizard_lvl4');t.pos={x=500,y=350};local p=t.powers.skill_c;p.level=(kind=='purchase-during-basic')and 0 or(kind=='upgrade-windup'and 1 or level);p.changed=p.level>0
 local e=E:create_entity('enemy_bandit');e.pos={x=600,y=350};e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local store={tick_ts=birth/30,tick_length=1/30,wave_group_number=1,entities={[t.id]=t,[e.id]=e}};local frame=0;local events={}
 U.find_foremost_enemy=function(_,_,_,_,_,_,bans,filter)
  local _,attack=debug.getupvalue(filter,1);local copies=attack.ignored_terrains~=nil
  if kind=='only-copies'and not copies or kind=='no-copy-target'and copies or kind=='empty-window'and(frame<101 or frame>=201 and frame<301)then return end
  return e,{e},table.deepclone(e.pos)
 end
 math.random=function(a,b)return a or .25 end
 simulation={queue_insert_entity=function(_,o)if o then events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),to=o.bullet and table.deepclone(o.bullet.to),min=o.bullet and o.bullet.damage_min,max=o.bullet and o.bullet.damage_max,level=o.bullet and o.bullet.level}end end,queue_remove_entity=function()end}
 S.queue=function(_,name)if name then events[#events+1]={at=store.tick_ts,sound=name}end end
 local co=coroutine.create(t.main_script.update);local frames={}
 for relative=1,850 do frame=relative;store.tick_ts=(birth+relative)*(1/30)
  if kind=='move-start'then e.pos.y=frame>=8 and 500 or 350 end
  if kind=='blocked-start'then t.tower.blocked=frame>=8 and frame<55 end
  if kind=='purchase-during-basic'then if frame==40 then p.level=1;p.changed=true elseif frame==48 and level~=1 then p.level=level;p.changed=true end end
  if kind=='upgrade-windup'and frame==20 and level~=1 then p.level=level;p.changed=true end
  local ok,err=coroutine.resume(co,t,store);assert(ok,debug.traceback(co,tostring(err)))
  local parts={};for _,s in ipairs(t.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop,offset=table.deepclone(s.offset)}end
  frames[#frames+1]={at=store.tick_ts,parts=parts,attackTs=t.attacks.list[1].ts,bookTs=t.attacks.list[4].ts,loading=t._loading,bobTime=t.time}
  for _,s in ipairs(t.render.sprites)do local d=durations[s.prefix or'']and durations[s.prefix][s.name];if d then local _,runs=A:fni({prefix=s.prefix..'_'..s.name,from=1,to=math.floor(d*30+.5)},store.tick_ts-s.ts,s.loop,s.fps,store.tick_length);s.runs=runs end end
 end
 rows[#rows+1]={level=level,birth=birth,kind=kind,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/wizard-copies-tower-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original copies/basic tower cases exported')
