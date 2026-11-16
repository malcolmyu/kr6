EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6979')==0)
local E,SU,P,G,J=require('entity_db'),require('script_utils'),require('path_db'),require('grid_db'),require('dkjson')
local oldP,oldG={},{};for k,v in pairs(P)do oldP[k]=v end;for k,v in pairs(G)do oldG[k]=v end
local oldFile,oldLoad=love.filesystem.isFile,love.filesystem.load;love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local times=J.decode(assert(io.open('public/data/zefira-exo-times.json')):read('*a'));local original=E:get_template('hero_zefira').main_script.update;local oldRandom=math.random;local rows={}
for stage=1,3 do G:load(string.format('level%02d',stage));P:load(string.format('level%02d',stage),{left=-512/3,right=1024+512/3,bottom=0,top=768})
 for _,born in ipairs({0,19})do for _,mode in ipairs({'normal','insufficient','ahead','cancel-early','cancel-late','air','boss','damage-ban','min-boundary','max-boundary','outside-max','target-dies','blink-factor','cancel-release','battle-start'})do
 local h=E:create_entity('hero_zefira');h.hero.skills.ultimate.active=true;h.main_script.insert(h,{tick_ts=born});h.pos=P:node_pos(1,1,150);local heroPos=table.deepclone(h.pos)
 local entities={[h.id]=h};local enemies={};for i=1,(mode=='insufficient'and 2 or 3)do local e=E:create_entity('enemy_bandit');e.nav_path.pi=1;e.nav_path.spi=i;e.nav_path.ni=mode=='ahead'and 157+i*2 or 135+i*2;e.pos=P:node_pos(1,i,e.nav_path.ni);e.health.hp=1000;entities[e.id]=e;enemies[#enemies+1]=e end
 if mode=='air'then enemies[1].vis.flags=bit.bor(enemies[1].vis.flags,128)elseif mode=='boss'then enemies[1].vis.flags=bit.bor(enemies[1].vis.flags,256)elseif mode=='damage-ban'then enemies[1].vis.bans=bit.bor(enemies[1].vis.bans,8)end
 if mode=='min-boundary'or mode=='max-boundary'or mode=='outside-max'then local offset=mode=='min-boundary'and 50 or mode=='max-boundary'and 150 or 150.001;for _,e in ipairs(enemies)do e.pos={x=h.pos.x+offset,y=h.pos.y}end end
 if mode=='blink-factor'then h.unit.damage_factor=1.5 end
 local initial={};for _,e in ipairs(enemies)do initial[#initial+1]={pos=table.deepclone(e.pos),pi=e.nav_path.pi,spi=e.nav_path.spi,ni=e.nav_path.ni,flags=e.vis.flags,bans=e.vis.bans}end
 local store={tick_ts=born,tick_length=1/30,wave_group_number=mode=='battle-start'and 0 or 1,entities=entities,damage_queue={}};local events,pending,spears={},{},{}
 local oldSimulation=simulation;simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,pos=table.deepclone(o.pos),flip=o.render.sprites[1].flip_x};if o.template_name=='decal_zefira_ultimate_spear'then pending[#pending+1]=o end end,queue_remove_entity=function(_,o)o.oracleRemoved=true end}
 local stubSU=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_idle=function()end,soldier_regen=function()end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6979.lua'));for i=1,30 do local n,v=debug.getupvalue(original,i);if not n then break end;if n=='SU'then v=stubSU elseif n=='S'then v={queue=function(_,s)if s then events[#events+1]={at=store.tick_ts,sound=s}end end}elseif n=='y_hero_melee_block_and_attacks'or n=='y_hero_ranged_attacks'then v=function()return false,A_NO_TARGET end end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={};local damageIndex=1;math.random=function(a,b)return a and a+math.floor(.5*(b-a+1))or .5 end
 for frame=0,150 do store.tick_ts=born+frame/30;if mode=='battle-start'and frame==60 then store.wave_group_number=1 end;if mode=='target-dies'and frame==20 then enemies[1].health.hp=0;enemies[1].health.dead=true end;h.nav_rally.new=(mode=='cancel-early'and frame==8 or mode=='cancel-late'and frame==30 or mode=='cancel-release'and frame==18)
  local sprite=h.render.sprites[1];sprite.runs=math.floor((store.tick_ts-sprite.ts)/(times.hero_zefiraDef[sprite.name]or 1)+1e-9)
  local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)))
  for _,s in ipairs(spears)do if not s.oracleRemoved then local r=s.render.sprites[1];r.runs=math.floor((store.tick_ts-r.ts)/(times[r.prefix][r.name]or 1)+1e-9);local good,e=coroutine.resume(s.oracleCoroutine,s,store);assert(good,debug.traceback(s.oracleCoroutine,tostring(e)))end end
  for _,s in ipairs(pending)do s.oracleCoroutine=coroutine.create(s.main_script.update);spears[#spears+1]=s;entities[s.id]=s end;pending={}
  for i=damageIndex,#store.damage_queue do local d=store.damage_queue[i];entities[d.target_id].health.hp=entities[d.target_id].health.hp-d.value end;damageIndex=#store.damage_queue+1
  local hp={};for _,e in ipairs(enemies)do hp[#hp+1]=e.health.hp end;local effects={};for _,s in ipairs(spears)do local r=s.render.sprites[1];effects[#effects+1]={removed=not not s.oracleRemoved,name=r.name,ts=r.ts}end
  frames[#frames+1]={at=store.tick_ts,name=sprite.name,ts=sprite.ts,flip=sprite.flip_x,xp=h.hero.xp_queued,cooldown=h.timed_attacks.list[1].ts,hp=hp,spears=effects}
 end
 rows[#rows+1]={stage=stage,born=born,mode=mode,pos=heroPos,enemies=initial,frames=frames,events=events};simulation=oldSimulation
 end end
end
math.random=oldRandom;love.filesystem.isFile=oldFile;love.filesystem.load=oldLoad
for k in pairs(P)do P[k]=nil end;for k,v in pairs(oldP)do P[k]=v end;for k in pairs(G)do G[k]=nil end;for k,v in pairs(oldG)do G[k]=v end
local f=assert(io.open('analysis/zefira-ultimate-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows*151 ..' original Zefira ultimate frames and independent spear coroutines exported')
