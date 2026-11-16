EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local U=require('utils');local V=require('klua.vector')
local update=assert(loadfile('analysis/function-bytecode/scripts_game_line35018.lua'))
local store={tick_ts=0,tick_length=1/30,entities={}};local events={}
local function event(name)events[#events+1]={name=name,at=store.tick_ts}end
local env={E=E,V=V,U=U,fts=function(f)return f/30 end,S={queue=function(_,name)event(name)end},signal={emit=function(name)event(name)end},LU={queue_insert=function(_,e)event(e.template_name)end,insert_hero_kr5=function()event('insert-hero')end}}
for i=1,30 do local name=debug.getupvalue(update,i);if not name then break end;assert(env[name],name);debug.setupvalue(update,i,env[name])end
local e=E:create_entity('controller_stage_01_gerald_intro');e.pos={x=628,y=352}
local co=coroutine.create(update)
for frame=0,300 do store.tick_ts=frame/30;local ok,err=coroutine.resume(co,e,store);assert(ok,err);if coroutine.status(co)=='dead'then break end end
local f=assert(io.open('analysis/hero-intro-oracle.json','w'));f:write(assert(J.encode(events)));f:close()
