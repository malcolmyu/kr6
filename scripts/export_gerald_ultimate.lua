EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6532')==0)
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local P=require('path_db');local oldValid=P.is_node_valid;P.is_node_valid=function()return true end
local times=J.decode(assert(io.open('analysis/gerald-skills-data.json')):read('*a')).exos.hero_geraldDef;local original=E:get_template('hero_gerald').main_script.update;local rows={}
for _,born in ipairs({0,19})do for _,flip in ipairs({false,true})do for _,mode in ipairs({'normal','target-dead','cancel-early','cancel-late'})do
 local h=E:create_entity('hero_gerald');h.hero.skills.ultimate.active=true;h.main_script.insert(h,{tick_ts=born});h.pos={x=500,y=350};h.motion.arrived=true;h.render.sprites[1].flip_x=flip;for i=1,3 do h.timed_attacks.list[i].disabled=true end
 local store={tick_ts=born,tick_length=1/30,wave_group_number=1,entities={[h.id]=h},damage_queue={}};local names,enemyList={},{}
 for i,p in ipairs({{30,0},{50,0},{70,5},{70.01,5},{20,5},{20,5},{20,5},{20,5}})do local e=E:create_entity(i==5 and'enemy_crow'or'enemy_bandit');e.pos={x=500+(flip and-p[1]or p[1]),y=350+p[2]};e.health.hp=1000;e.health.hp_max=1000;if i==6 then e.vis.flags=bit.bor(e.vis.flags,32)elseif i==7 then e.vis.bans=4 elseif i==8 then e.vis.bans=8 end;enemyList[i]=e;names[e.id]=i;store.entities[e.id]=e end
 h.soldier.target_id=enemyList[1].id
 local events,pending,auras={},{},{};simulation={queue_insert_entity=function(_,o)events[#events+1]={at=store.tick_ts,name=o.template_name,target=o.modifier and names[o.modifier.target_id],pos=o.pos and table.deepclone(o.pos)};if o.template_name=='aura_gerald_ultimate'then pending[#pending+1]=o end end,queue_remove_entity=function(_,o)o.oracleRemoved=true end}
 local stubSU=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_idle=function()end,soldier_regen=function()end,y_hero_new_rally=function(_,hero)hero.nav_rally.new=false;hero.soldier.target_id=nil;return false end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6532.lua'));for i=1,30 do local n,v=debug.getupvalue(original,i);if not n then break end;if n=='SU'then v=stubSU elseif n=='S'then v={queue=function(_,s)events[#events+1]={at=store.tick_ts,sound=s}end}elseif n=='y_hero_melee_block_and_attacks'then v=function()return false,A_NO_TARGET end end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={};local damageIndex=1
 for frame=0,(mode=='normal'and not flip and 900 or 120)do store.tick_ts=born+frame/30
  if mode=='target-dead'and frame==30 then enemyList[1].health.dead=true;enemyList[1].health.hp=0 end
  if mode=='cancel-early'and frame==8 or mode=='cancel-late'and frame==30 then h.nav_rally.new=true end
  local s=h.render.sprites[1];s.runs=math.floor((store.tick_ts-s.ts)/(times[s.name]or 1)+1e-9)
  local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)))
  for _,o in ipairs(auras)do if not o.oracleRemoved then local good,e=coroutine.resume(o.oracleCoroutine,o,store);assert(good,e)end end
  for _,o in ipairs(pending)do o.oracleCoroutine=coroutine.create(o.main_script.update);auras[#auras+1]=o;store.entities[o.id]=o end;pending={}
  for i=damageIndex,#store.damage_queue do local d=store.damage_queue[i];local target=store.entities[d.target_id];if not target.health.dead then target.health.hp=target.health.hp-d.value end end;damageIndex=#store.damage_queue+1
  local hp={};for _,e in ipairs(enemyList)do hp[#hp+1]=e.health.hp end
  frames[#frames+1]={at=store.tick_ts,name=s.name,ts=s.ts,xp=h.hero.xp_queued,cooldown=h.timed_attacks.list[4].ts,hp=hp}
 end
 rows[#rows+1]={born=born,flip=flip,mode=mode,frames=frames,events=events}
end end end
P.is_node_valid=oldValid
local f=assert(io.open('analysis/gerald-ultimate-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original Gerald ultimate cast and area pulse traces exported')
