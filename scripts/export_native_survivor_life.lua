TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,A,Sound,J=require('entity_db'),require('script_utils'),require('klove.animation_db'),require('sound_db'),require('dkjson')
local original=E:get_template('hero_gerald').main_script.update;local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local counts={}
for _,a in ipairs(art.exos.hero_geraldDef.animations)do counts[a.name]=#a.frames end
require('path_db').is_node_valid=function()return true end
local rows={}
for level=1,3 do for _,birth in ipairs({0,6079})do for _,targetState in ipairs({'alive','dead','missing'})do for _,again in ipairs({false,true})do
 local h=E:create_entity('hero_gerald');h.pos={x=500,y=350};h.health.hp_max=220;h.health.hp=220;h.hero.skills.skill_c.level=level
 for _,a in ipairs(h.timed_attacks.list)do a.disabled=true end
 local attack=h.timed_attacks.list[3];attack.disabled=false;attack.hp_ptg=({.4,.7,1})[level];attack.cooldown=level==3 and 40 or 50
 h.soldier.target_id=200
 local enemy=E:create_entity('enemy_bandit');enemy.id=200;enemy.health.dead=targetState=='dead';enemy.pos={x=530,y=350}
 local store={tick=birth,tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,wave_group_number=1,entities={[h.id]=h}}
 if targetState~='missing'then store.entities[200]=enemy end
 local events={};simulation={queue_insert_entity=function(_,e)events[#events+1]={tick=store.tick,name=e.template_name,target=e.modifier and e.modifier.target_id,source=e.modifier and e.modifier.source_id,sharedPos=e.pos==h.pos}end}
 Sound.queue=function(_,name)if name then events[#events+1]={tick=store.tick,sound=name}end end
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line6532.lua'))
 -- Isolate the death branch: ordinary melee/growth/movement/regen are not the
 -- subject of this helper fixture. Death, waits, animation and sound stay native.
 local stub=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_regen=function()end},{__index=SU})
 for i=1,40 do local name,value=debug.getupvalue(original,i);if not name then break end;if name=='SU'then value=stub elseif name=='y_hero_melee_block_and_attacks'then value=function()return false,A_NO_TARGET end end;debug.setupvalue(fn,i,value)end
 local co=coroutine.create(fn);local frames={}
 for relative=1,(again and 1100 or 180)do
  store.tick=birth+relative;store.tick_ts=store.tick*TICK_LENGTH
  local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)))
  if relative==6 or again and relative==82 then h.health.hp=0;h.health.dead=true;h.health.death_ts=store.tick_ts end
  local s=h.render.sprites[1];local _,runs,frame=A:fni({from=1,to=assert(counts[s.name],s.name),prefix='original'},store.tick_ts-s.ts,s.loop,s.fps,TICK_LENGTH);s.runs=runs;s.frame_idx=frame
  frames[#frames+1]={tick=store.tick,hp=h.health.hp,dead=h.health.dead,ignore=h.health.ignore_damage,xp=h.hero.xp_queued,name=s.name,ts=s.ts,loop=s.loop,click=h.ui.can_click,hidden=h.health_bar.hidden}
 end
 rows[#rows+1]={level=level,birth=birth,targetState=targetState,again=again,frames=frames,events=events}
end end end end
local f=assert(io.open('analysis/native-survivor-life-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original survivor own-main/death fallback traces')
