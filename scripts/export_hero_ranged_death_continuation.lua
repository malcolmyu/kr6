-- Observe the shipped ranged wrapper and its original idle continuation on death.
TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
require('grid_db'):load('level01');require('path_db'):load('level01',{left=-512/3,right=1024+512/3,bottom=0,top=768})
local E,SU,A,Sound=require('entity_db'),require('script_utils'),require('klove.animation_db'),require('sound_db')
local original=E:get_template('hero_zefira').main_script.update;local wrapper
for i=1,30 do local n,v=debug.getupvalue(original,i);if n=='y_hero_ranged_attacks'then wrapper=v end end;assert(wrapper)
Sound.queue=function()end
local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for _,birth in ipairs({0,19,4633})do for _,deathFrame in ipairs({1,3,11,12,13,18,27,28,29})do for _,roll in ipairs({.05,.95})do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};h.main_script.insert(h,{tick_ts=birth*TICK_LENGTH});h.ranged.attacks[1].ts=-10;h.nav_rally.new=false;h.render.sprites[1].name='idle';h.render.sprites[1].ts=-.27
 E:get_template('bullet_zefira').bullet.critical_chance=.2
 local e=E:create_entity('enemy_bandit');e.pos={x=620,y=350};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local store,events,calls={tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[h.id]=h,[e.id]=e}},{},0
 math.random=function(a,b)calls=calls+1;return a and a+math.floor(roll*(b-a+1))or roll end
 simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.clone(o.pos),factor=o.bullet.damage_factor}end}
 local stubSU=setmetatable({soldier_pick_ranged_target_and_attack=function()return e,h.ranged.attacks[1]end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6348.lua'))
 for i=1,30 do local n,v=debug.getupvalue(wrapper,i);if not n then break end;if n=='SU'then v=stubSU end;debug.setupvalue(fn,i,v)end
 local handled;local co=coroutine.create(function()handled=fn(store,h);if not handled then SU.soldier_idle(store,h)end end);local frames={}
 for frame=0,40 do
  store.tick_ts=(birth+frame)*TICK_LENGTH
  if frame==deathFrame then h.health.dead=true;h.health.hp=0 end
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)))end
  local p=h.render.sprites[1];local count;for _,a in ipairs(art.exos[p.prefix].animations)do if a.name==p.name then count=#a.frames end end;assert(count,p.name)
  local _,runs=A:fni({from=1,to=count,prefix='original'},store.tick_ts-p.ts,p.loop,p.fps,TICK_LENGTH);p.runs=runs
  frames[#frames+1]={tick=birth+frame,animation=p.name,at=p.ts,loop=p.loop,done=coroutine.status(co)=='dead',handled=handled,factor=h.unit.damage_factor,calls=calls,shots=#events,idle=table.deepclone(h.idle_flip)}
 end
 rows[#rows+1]={birth=birth,deathFrame=deathFrame,roll=roll,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/hero-ranged-death-continuation-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original ranged death continuation traces')
