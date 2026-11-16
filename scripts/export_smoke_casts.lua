TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,U,V,J,A=require('entity_db'),require('utils'),require('klua.vector'),require('dkjson'),require('klove.animation_db')
local rows={}
for _,start in ipairs({0,1,7,120,1262})do for _,scenario in ipairs({'cast','threshold','near-exit','stun','death','deadline-death','deadline-stun'})do
 local e=E:create_entity('enemy_shadow_blades');e.health.hp_max=70;e.health.hp=scenario=='threshold'and 14 or 13;e.pos={x=600,y=350}
 local store,events={tick_ts=start*(1/30),tick_length=1/30,entities={[e.id]=e}},{}
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line1935.lua'))
 local done=false
 local env={P={nodes_to_goal=function()return scenario=='near-exit'and 34 or 100 end},SU={y_enemy_death=function()end,y_enemy_stun=function()coroutine.yield()end,y_enemy_mixed_walk_melee_ranged=function()coroutine.yield();return true end},U=U,V=V,E=E,S={queue=function(_,name)events[#events+1]={kind='sound',name=name,tick=store.tick}end},queue_insert=function(_,smoke)events[#events+1]={kind='aura',tick=store.tick}end,queue_remove=function()events[#events+1]={kind='remove',tick=store.tick};done=true end}
 for i=1,30 do local n=debug.getupvalue(fn,i);if not n then break end;assert(env[n],n);debug.setupvalue(fn,i,env[n])end
 local co=coroutine.create(fn)
 for tick=start,start+90 do
  store.tick=tick;store.tick_ts=tick*(1/30)
  local offset=tick-start;e.unit.is_stunned=scenario=='stun'and offset>=10 and offset<15 or scenario=='deadline-stun'and offset==20
  if (scenario=='death'and offset==10)or(scenario=='deadline-death'and offset==20)then e.health.hp=0;e.health.dead=true end
  local ok,err=coroutine.resume(co,e,store);assert(ok,err)
  local s=e.render.sprites[1];if s.name=='smokebomb'then local _,runs=A:fni({from=1,to=44,prefix='probe'},store.tick_ts-s.ts,s.loop,30,1/30);s.runs=runs end
  if done or coroutine.status(co)=='dead'then break end
 end
 rows[#rows+1]={start=start,scenario=scenario,events=events,hp=e.health.hp,immune=not not e.health.ignore_damage}
end end
local f=assert(io.open('analysis/smoke-casts-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original own-main smoke casts/birth clocks/stun/death/boundaries')
