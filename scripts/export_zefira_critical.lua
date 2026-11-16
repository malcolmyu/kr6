EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6264 6348')==0)
local P,G=require('path_db'),require('grid_db');local oldP,oldG={},{};for k,v in pairs(P)do oldP[k]=v end;for k,v in pairs(G)do oldG[k]=v end;local oldIsFile,oldLoad=love.filesystem.isFile,love.filesystem.load
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
require('grid_db'):load('level01');require('path_db'):load('level01',{left=-512/3,right=1024+512/3,bottom=0,top=768})
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local original=E:get_template('hero_zefira').main_script.update;local helpers={}
for i=1,25 do local n,v=debug.getupvalue(original,i);if n=='y_hero_ranged_attacks'then helpers.ranged=v elseif n=='y_hero_melee_block_and_attacks'then helpers.melee=v end end
local oldRandom=math.random;local sound=require('sound_db');local oldQueue=sound.queue;sound.queue=function()end;local oldCrit=E:get_template('bullet_zefira').bullet.critical_chance
local rows={}
for _,kind in ipairs({'melee','ranged'})do for _,mode in ipairs({'base','blink','blink-expires'})do for _,roll in ipairs({.1,.2,.8})do for _,cancelFrame in ipairs({-1,6,18})do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};h.main_script.insert(h,{tick_ts=0});h.unit.damage_factor=mode=='base'and 1 or 1.3;h.melee.attacks[1].critical_chance=.2;E:get_template('bullet_zefira').bullet.critical_chance=.2
 local e=E:create_entity('enemy_bandit');e.pos={x=kind=='melee'and 530 or 620,y=350};e.health.hp=1000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;h.soldier.target_id=e.id;if kind=='melee'then e.enemy.blockers={h.id}end
 local store={tick_ts=0,tick_length=1/30,entities={[h.id]=h,[e.id]=e},damage_queue={}};local events={};math.random=function(a,b)return a and a+math.floor(roll*(b-a+1))or roll end
 simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),factor=o.bullet and o.bullet.damage_factor,pop=o.bullet and o.bullet.pop}end}
 local stubSU=setmetatable({soldier_pick_ranged_target_and_attack=function()return e,h.ranged.attacks[1]end,soldier_pick_melee_target=function()return e end,soldier_move_to_slot_step=function()return false end,soldier_pick_melee_attack=function()return h.melee.attacks[1]end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line'..(kind=='melee'and 6264 or 6348)..'.lua'));for i=1,25 do local n,v=debug.getupvalue(helpers[kind],i);if not n then break end;if n=='SU'then v=stubSU end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={}
 for frame=0,60 do store.tick_ts=frame/30;if frame==cancelFrame then h.nav_rally.new=true end;if mode=='blink-expires'and frame==6 then h.unit.damage_factor=h.unit.damage_factor/1.3 end
  local sprite=h.render.sprites[1];local duration=kind=='melee'and 34/30 or 28/30;sprite.runs=math.floor((store.tick_ts-sprite.ts)/duration+1e-9)
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,h);assert(ok,debug.traceback(co,tostring(err)))end
  local damage={};for _,d in ipairs(store.damage_queue)do damage[#damage+1]={value=d.value,pop=d.pop,chance=d.pop_chance,conds=d.pop_conds}end
  frames[#frames+1]={at=store.tick_ts,factor=h.unit.damage_factor,done=coroutine.status(co)=='dead',damage=damage}
 end
 rows[#rows+1]={kind=kind,mode=mode,roll=roll,cancelFrame=cancelFrame,frames=frames,events=events}
end end end end
math.random=oldRandom;sound.queue=oldQueue;E:get_template('bullet_zefira').bullet.critical_chance=oldCrit
local f=assert(io.open('analysis/zefira-critical-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original Zefira critical attack factors and interruption exported')
for k in pairs(P)do P[k]=nil end;for k,v in pairs(oldP)do P[k]=v end;for k in pairs(G)do G[k]=nil end;for k,v in pairs(oldG)do G[k]=v end;love.filesystem.isFile=oldIsFile;love.filesystem.load=oldLoad
