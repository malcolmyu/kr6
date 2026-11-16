EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db');local V=require('klua.vector');local U=require('utils');local J=require('dkjson')
local update=assert(loadfile('analysis/function-bytecode/level02_line88.lua'))
main={params={skip_cutscenes=false}};OVm=function(desktop,mobile)return desktop end
local store={tick_ts=0,tick_length=1/30,level_mode=GAME_MODE_CAMPAIGN,wave_group_number=0,selected_team_status={hero_zefira={xp=0,skills={}}},entities={}}
local events={};local zefira
local env={storage={load_slot=function()return {levels={}}end},level={zefira_equipped=true},V=V,U=U,LU={insert_hero_kr5=function(_,name,pos)local h=E:create_entity(name);h.pos=V.vclone(pos);zefira=h;return h end},signal={emit=function(name,a)events[#events+1]={name=name,id=type(a)=='string'and a or nil,at=store.tick_ts}end},log={debug=function()end}}
for i=1,30 do local name=debug.getupvalue(update,i);if not name then break end;assert(env[name],name);debug.setupvalue(update,i,env[name])end
local mage=E:create_entity('tower_wizard_lvl1_stage_02');mage.pos={x=367,y=271};store.entities[mage.id]=mage
local self={hero_1=E:create_entity('hero_gerald'),h1_vo='HeroGeraldTaunt'}
local co=coroutine.create(update)
for frame=0,300 do
 store.tick_ts=frame/30
 if zefira and zefira.nav_rally.new then zefira.pos=V.vclone(zefira.nav_rally.pos)end
 local ok,err=coroutine.resume(co,self,store);assert(ok,err)
end
local f=assert(io.open('analysis/zefira-intro-oracle.json','w'));f:write(J.encode(events));f:close()
