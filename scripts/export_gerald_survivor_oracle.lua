EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local SU=require('script_utils');local U=require('utils');local J=require('dkjson');local original=E:get_template('hero_gerald').main_script.update
local originalNodeValid=require('path_db').is_node_valid
require('path_db').is_node_valid=function()return true end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/scripts_game.lua 6532')==0)
local exo=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/go_hero_gerald/hero_geraldDef.exo3');local durations={};for _,a in ipairs(exo.animations)do durations[a.name]=#a.frames/exo.fps end
local cases={}
for level=1,3 do for _,targetAlive in ipairs({true,false})do
 local hero=E:create_entity('hero_gerald');hero.health.hp=220;hero.health.hp_max=220;hero.health.armor=.05;hero.health.magic_armor=0;hero.pos={x=500,y=350};hero.soldier.target_id=200
 hero.timed_attacks.list[4].disabled=true;hero.hero.skills.skill_c.level=level;local a=hero.timed_attacks.list[3];a.disabled=false;a.hp_ptg=({.4,.7,1})[level];a.cooldown=({50,50,40})[level]
 local enemy=E:create_entity('enemy_bandit');enemy.id=200;enemy.pos={x=530,y=350};enemy.health.dead=not targetAlive
 local store={tick_ts=0,tick_length=1/30,wave_group_number=1,entities={[hero.id]=hero,[enemy.id]=enemy}}
 local events={};simulation={queue_insert_entity=function(_,e)events[#events+1]={at=store.tick_ts,name=e.template_name,target=e.modifier and e.modifier.target_id}end}
 local stubSU=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_idle=SU.soldier_idle,soldier_regen=function()end},{__index=SU})
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6532.lua'))
 for i=1,20 do local n,v=debug.getupvalue(original,i);if not n then break end;if n=='SU'then v=stubSU elseif n=='S'then v={queue=function(_,name)events[#events+1]={at=store.tick_ts,sound=name}end} elseif n=='y_hero_melee_block_and_attacks'then v=function()return false,A_NO_TARGET end end;debug.setupvalue(fn,i,v)end
 local frames={};local co=coroutine.create(fn)
 for frame=0,160 do store.tick_ts=frame/30;if frame==3 then hero.health.dead=true;hero.health.hp=0 end
  local s=hero.render.sprites[1];if durations[s.name]then s.runs=math.floor((store.tick_ts-s.ts)/durations[s.name]+1e-9)end
  local ok,err=coroutine.resume(co,hero,store);assert(ok,debug.traceback(co,tostring(err)))
  frames[#frames+1]={at=store.tick_ts,name=s.name,ts=s.ts,xp=hero.hero.xp_queued,hp=hero.health.hp,dead=hero.health.dead,ignore=hero.health.ignore_damage,click=hero.ui.can_click}
 end
 cases[#cases+1]={level=level,targetAlive=targetAlive,frames=frames,events=events}
end end
local f=assert(io.open('analysis/gerald-survivor-oracle.json','w'));f:write(J.encode(cases));f:close();print('Native Gerald survivor: six death/revive traces')
-- The dead survivor remains an arrived blocker during the rewind coroutine.
local enemy=E:create_entity('enemy_bandit');local hero=E:create_entity('hero_gerald');hero.health.dead=true;hero.health.hp=0;hero.motion.arrived=true;hero.pos={x=500,y=350};hero.soldier.target_id=enemy.id;enemy.pos={x=530,y=350};enemy.enemy.blockers={hero.id};enemy.nav_path.pi=1;enemy.nav_path.ni=35
local originalCellType=require('grid_db').cell_type
require('grid_db').cell_type=function()return TERRAIN_LAND end
local store={tick_ts=0,tick_length=1/30,entities={[enemy.id]=enemy,[hero.id]=hero}};local result=SU.y_enemy_mixed_walk_melee_ranged(store,enemy,false)
local f=assert(io.open('analysis/gerald-dead-blocker-oracle.json','w'));f:write(J.encode({result=result,blockers=#enemy.enemy.blockers,target=hero.soldier.target_id==enemy.id,pos=enemy.pos}));f:close()

require('path_db').is_node_valid=originalNodeValid
require('grid_db').cell_type=originalCellType
