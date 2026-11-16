EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6348')==0)
local P,G=require('path_db'),require('grid_db');local oldP,oldG={},{};for k,v in pairs(P)do oldP[k]=v end;for k,v in pairs(G)do oldG[k]=v end;local oldIsFile,oldLoad=love.filesystem.isFile,love.filesystem.load
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
require('grid_db'):load('level01');require('path_db'):load('level01',{left=-512/3,right=1024+512/3,bottom=0,top=768})
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local original=E:get_template('hero_zefira').main_script.update;local helper
for i=1,25 do local n,v=debug.getupvalue(original,i);if n=='y_hero_ranged_attacks'then helper=v;break end end;assert(helper)
local rows={}
for _,cancelFrame in ipairs({3,6,11,12,13,18})do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};h.main_script.insert(h,{tick_ts=0});h.ranged.attacks[1].ts=-10;local e=E:create_entity('enemy_bandit');e.pos={x=620,y=350};e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 local store={tick_ts=0,tick_length=1/30,entities={[h.id]=h,[e.id]=e}}
 local events={};simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),factor=o.bullet and o.bullet.damage_factor}end}
 local stubSU=setmetatable({soldier_pick_ranged_target_and_attack=function()return e,h.ranged.attacks[1] end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6348.lua'));for i=1,25 do local n,v=debug.getupvalue(helper,i);if not n then break end;if n=='SU'then v=stubSU end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={}
 for frame=0,30 do store.tick_ts=frame/30;if frame==cancelFrame then h.nav_rally.new=true end;if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,h);assert(ok,debug.traceback(co,tostring(err)))end;frames[#frames+1]={at=store.tick_ts,done=coroutine.status(co)=='dead',cooldownTs=h.ranged.attacks[1].ts}end
 rows[#rows+1]={cancelFrame=cancelFrame,frames=frames,events=events}
end
local f=assert(io.open('analysis/zefira-ranged-cancel-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original ranged windup rally interruption exported')
for k in pairs(P)do P[k]=nil end;for k,v in pairs(oldP)do P[k]=v end;for k in pairs(G)do G[k]=nil end;for k,v in pairs(oldG)do G[k]=v end;love.filesystem.isFile=oldIsFile;love.filesystem.load=oldLoad
