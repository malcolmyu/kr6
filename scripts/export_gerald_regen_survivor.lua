EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local P=require('path_db');local oldValid=P.is_node_valid;P.is_node_valid=function()return true end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6532')==0)
local times=J.decode(assert(io.open('analysis/gerald-skills-data.json')):read('*a')).exos.hero_geraldDef;local original=E:get_template('hero_gerald').main_script.update;local rows={}
for level=1,3 do
 local h=E:create_entity('hero_gerald');h.main_script.insert(h,{tick_ts=0});h.pos={x=500,y=350};h.hero.skills.skill_c.level=level;h.hero.skills.talent_2.disabled=false
 local a=h.timed_attacks.list[3];a.disabled=false;a.hp_ptg=({.4,.7,1})[level];h.timed_attacks.list[1].disabled=true;h.timed_attacks.list[2].disabled=true;h.timed_attacks.list[4].disabled=true
 local store={tick_ts=0,tick_length=1/30,wave_group_number=1,entities={[h.id]=h}};local pending,auras={},{}
 simulation={queue_insert_entity=function(_,o)if o.template_name=='aura_gerald_talent_2_regeneration'then pending[#pending+1]=o end end,queue_remove_entity=function(_,o)o.oracleRemoved=true end}
 local stubSU=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_idle=function()end,soldier_regen=function()end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6532.lua'));for i=1,30 do local n,v=debug.getupvalue(original,i);if not n then break end;if n=='SU'then v=stubSU elseif n=='S'then v={queue=function()end} elseif n=='y_hero_melee_block_and_attacks'then v=function()return false,A_NO_TARGET end end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={}
 for frame=0,240 do store.tick_ts=frame/30;if frame==3 then h.health.hp=0;h.health.dead=true end
  local s=h.render.sprites[1];s.runs=math.floor((store.tick_ts-s.ts)/(times[s.name]or 1)+1e-9)
  local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)))
  for _,o in ipairs(auras)do if not o.oracleRemoved then local good,e=coroutine.resume(o.oracleCoroutine,o,store);assert(good,e)end end
  for _,o in ipairs(pending)do assert(o.main_script.insert(o,store));o.oracleCoroutine=coroutine.create(o.main_script.update);auras[#auras+1]=o;store.entities[o.id]=o end;pending={}
  frames[#frames+1]={at=store.tick_ts,hp=h.health.hp,auras=#auras,name=s.name}
 end
 rows[#rows+1]={level=level,frames=frames}
end
P.is_node_valid=oldValid
local f=assert(io.open('analysis/gerald-regen-survivor-oracle.json','w'));f:write(J.encode(rows));f:close();print('Native recovery plus regeneration insertion traces exported')
