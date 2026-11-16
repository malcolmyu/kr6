TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,U,A,J=require('entity_db'),require('script_utils'),require('utils'),require('klove.animation_db'),require('dkjson');local original=E:get_template('hero_gerald').main_script.update
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local exo=art.exos.hero_geraldDef;local counts={};for _,a in ipairs(exo.animations)do counts[a.name]=#a.frames end
local rows={}
for _,kind in ipairs({'skill_a','skill_b'})do for _,birth in ipairs({0,19,12232})do for _,offset in ipairs({1,15,16,17,18,19,20,21,30})do
 local h=E:create_entity('hero_gerald');h.health.hp=220;h.health.hp_max=220;h.pos={x=500,y=350};h.motion.arrived=true;h.soldier.target_id=200;h.hero.skills[kind].level=1;h.timed_attacks.list[4].disabled=true;h.timed_attacks.list[kind=='skill_a'and 1 or 2].disabled=false
 local ally=E:create_entity('soldier_knights_lvl1');ally.pos={x=530,y=350};ally.soldier.target_id=200
 local enemy=E:create_entity('enemy_bandit');enemy.id=200;enemy.pos={x=530,y=350}
 local store={tick_ts=birth*TICK_LENGTH,tick_length=TICK_LENGTH,entities={[h.id]=h,[ally.id]=ally,[enemy.id]=enemy},wave_group_number=1};local events={}
 simulation={queue_insert_entity=function(_,m)events[#events+1]={tick=store.tick,name=m.template_name,target=m.modifier and(m.modifier.target_id==h.id and'hero'or'ally')}end}
 local stubSU=setmetatable({hero_level_up=function()return false end,soldier_go_back_step=function()return false end,soldier_idle=function()end,soldier_regen=function()end},{__index=SU})
 local fn=assert(loadstring(string.dump(original)));for i=1,30 do local n,v=debug.getupvalue(original,i);if not n then break end;if n=='SU'then v=stubSU elseif n=='S'then v={queue=function(_,name)if name then events[#events+1]={tick=store.tick,sound=name}end end}elseif n=='y_hero_melee_block_and_attacks'then v=function()return true,A_DONE end end;debug.setupvalue(fn,i,v)end
 local co=coroutine.create(fn);local frames={};local kill=1+offset
 for relative=0,kill do
  store.tick=birth+relative;store.tick_ts=store.tick*TICK_LENGTH;if relative==kill then h.health.hp=0;h.health.dead=true end
  local ok,err=coroutine.resume(co,h,store);assert(ok,debug.traceback(co,tostring(err)));local s=h.render.sprites[1]
  frames[#frames+1]={tick=store.tick,name=s.name,at=s.ts,loop=s.loop,xp=h.hero.xp_queued,hp=h.health.hp}
  local _,runs,frame=A:fni({from=1,to=counts[s.name]},store.tick_ts-s.ts,s.loop,s.fps,TICK_LENGTH);s.runs=runs;s.frame_idx=frame
 end
 rows[#rows+1]={kind=kind,birth=birth,kill=birth+kill,frames=frames,events=events}
end end end
local f=assert(io.open('analysis/gerald-cast-death-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original Gerald A/B pre/due/post-cast death continuations')
