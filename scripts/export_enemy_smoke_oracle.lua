EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local U=require('utils');local V=require('klua.vector');local J=require('dkjson')
local out={casts={},areas={},cycles={}}
for _,case in ipairs({{hp=13,nodes=35},{hp=14,nodes=35},{hp=13,nodes=34},{hp=0,nodes=100}})do
 local e=E:create_entity('enemy_shadow_blades');e.health.hp=case.hp;e.health.dead=case.hp<=0;e.health.hp_max=70;e.pos={x=600,y=350}
 local store={tick_ts=0,tick_length=1/30,entities={[e.id]=e}};local events={}
 local fn=assert(loadfile('analysis/function-bytecode/scripts_game_line1935.lua'))
 local env={P={nodes_to_goal=function()return case.nodes end},SU={y_enemy_death=function()end,y_enemy_stun=function()coroutine.yield()end,y_enemy_mixed_walk_melee_ranged=function()coroutine.yield();return true end},U=U,V=V,E=E,S={queue=function(_,name)events[#events+1]={name=name,at=store.tick_ts}end},queue_insert=function(_,smoke)events[#events+1]={name=smoke.template_name,at=store.tick_ts}end,queue_remove=function()events[#events+1]={name='remove',at=store.tick_ts}end}
 for i=1,30 do local n=debug.getupvalue(fn,i);if not n then break end;assert(env[n],n);debug.setupvalue(fn,i,env[n])end
 local co=coroutine.create(fn)
 for frame=0,60 do
  store.tick_ts=frame/30;local s=e.render.sprites[1];if s.name=='smokebomb'and store.tick_ts-s.ts>=44/30 then s.runs=1 end
  local ok,err=coroutine.resume(co,e,store);assert(ok,err);if coroutine.status(co)=='dead'then break end
 end
 out.casts[#out.casts+1]={case=case,events=events,hp=e.health.hp,immune=e.health.ignore_damage,visBans=e.vis.bans}
end
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local G=require('grid_db');local P=require('path_db');local bounds={left=-512/3,right=1024+512/3,bottom=0,top=768}
for stage=2,3 do
 G:load(string.format('level%02d',stage));P:load(string.format('level%02d',stage),bounds)
 for _,pos in ipairs({{x=600,y=350},{x=800,y=500}})do
  local e=E:create_entity('aura_shadow_blades_smoke');e.pos=V.vclone(pos)
  local decals={};simulation={queue_insert_entity=function(_,decal)decals[#decals+1]={pos=V.vclone(decal.pos),name=decal.template_name}end,queue_remove_entity=function()end}
  local store={tick_ts=20/30,tick_length=1/30,level_difficulty=DIFFICULTY_NORMAL,entities={}}
  assert(e.main_script.insert(e,store));out.areas[#out.areas+1]={stage=stage,from=pos,pos=e.pos,decals=decals,duration=e.actual_duration}
 end
end
for _,baseFrame in ipairs({0,20})do
 local aura=E:create_entity('aura_shadow_blades_smoke');aura.pos={x=600,y=350}
 local target=E:create_entity('enemy_bandit');target.health.hp=30
 local store={tick_ts=baseFrame/30,tick_length=1/30,level_difficulty=DIFFICULTY_NORMAL,entities={[target.id]=target}}
 local calls={}
 simulation={queue_insert_entity=function(_,e)if e.modifier then calls[#calls+1]=store.tick_ts end end,queue_remove_entity=function()end}
 assert(aura.main_script.insert(aura,store));target.pos=V.vclone(aura.pos)
 local co=coroutine.create(aura.main_script.update);local endedAt
 for frame=0,110 do store.tick_ts=(baseFrame+frame)/30;local ok,err=coroutine.resume(co,aura,store);assert(ok,err);if coroutine.status(co)=='dead'then endedAt=store.tick_ts;break end end
 out.cycles[#out.cycles+1]={born=baseFrame/30,pos=aura.pos,applied=calls,endedAt=endedAt}
end
local f=assert(io.open('analysis/enemy-smoke-oracle.json','w'));f:write(assert(J.encode(out)));f:close()
