EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local originalNodeValid=require('path_db').is_node_valid
require('path_db').is_node_valid=function()return true end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6532')==0)
local E=require('entity_db');local SU=require('script_utils');local U=require('utils');local J=require('dkjson');local original=E:get_template('hero_gerald').main_script.update
local durations=J.decode(assert(io.open('analysis/gerald-skills-data.json')):read('*a')).exos.hero_geraldDef
local cases={}
for _,kind in ipairs({'skill_a','skill_b'})do
 local hero=E:create_entity('hero_gerald');hero.health.hp=220;hero.health.hp_max=220;hero.health.armor=.05;hero.pos={x=500,y=350};hero.motion.arrived=true;hero.soldier.target_id=200
 hero.timed_attacks.list[4].disabled=true;hero.hero.skills[kind].level=1;hero.timed_attacks.list[kind=='skill_a'and 1 or 2].disabled=false
 local ally=E:create_entity('soldier_knights_lvl1');ally.pos={x=530,y=350};ally.soldier.target_id=200
 local enemy=E:create_entity('enemy_bandit');enemy.id=200;enemy.pos={x=530,y=350}
 local store={tick_ts=0,tick_length=1/30,wave_group_number=1,entities={[hero.id]=hero,[ally.id]=ally,[enemy.id]=enemy}}
 local events={};simulation={queue_insert_entity=function(_,e)events[#events+1]={at=store.tick_ts,name=e.template_name,target=e.modifier and e.modifier.target_id==hero.id and 'hero'or e.modifier and 'ally'or nil}end}
 local stubSU=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_idle=function()end,soldier_regen=function()end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6532.lua'))
 for i=1,20 do local n,v=debug.getupvalue(original,i);if not n then break end
  if n=='SU'then v=stubSU elseif n=='S'then v={queue=function(_,name)events[#events+1]={at=store.tick_ts,sound=name}end} elseif n=='y_hero_melee_block_and_attacks'then v=function()return true,A_DONE end end
  debug.setupvalue(fn,i,v)
 end
 local frames={};local co=coroutine.create(fn)
 for frame=0,900 do store.tick_ts=frame/30;local s=hero.render.sprites[1];if durations[s.name]then s.runs=math.floor((store.tick_ts-s.ts)/durations[s.name]+1e-9)end
  local ok,err=coroutine.resume(co,hero,store);assert(ok,debug.traceback(co,tostring(err)))
  frames[#frames+1]={at=store.tick_ts,name=s.name,ts=s.ts,xp=hero.hero.xp_queued}
 end
 cases[#cases+1]={kind=kind,heroId=hero.id,allyId=ally.id,frames=frames,events=events}
end
local f=assert(io.open('analysis/gerald-casts-oracle.json','w'));f:write(J.encode(cases));f:close()

require('path_db').is_node_valid=originalNodeValid
