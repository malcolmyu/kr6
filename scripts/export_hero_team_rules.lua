EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local GS,J=require('game_settings'),require('dkjson');local levels=GS.heroes_starting_level
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');local heroes={}
for _,name in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do local portrait=require('entity_db').entities[name].info.hero_portrait;heroes[name]={name=strings[name:upper()..'_NAME'],portrait=tonumber(portrait:match('(%d+)$'))}end
local f=assert(io.open('public/data/hero-team.json','w'));f:write(dofile('scripts/precise_json.lua')({startingLevels=levels,slots=GS.number_of_heroes,heroes=heroes}));f:close()
local write=assert(loadfile('analysis/function-bytecode/storage_line425.lua'));local equip=assert(loadfile('analysis/function-bytecode/screen_map_line2208.lua'));local slot
local storage={load_slot=function()return slot end,save_slot=function()return true end};storage.equip_unit=write
local values={GS=GS,EQUIP_GROUP_STARTING_LEVELS={heroes='heroes_starting_level'},EQUIP_GROUP_XP_THRESHOLDS={heroes='hero_xp_thresholds'},storage=storage}
for i=1,20 do local name=debug.getupvalue(equip,i);if not name then break end;assert(values[name],name);debug.setupvalue(equip,i,values[name])end
local rows={};for _,team in ipairs({{}, {'hero_gerald'},{'hero_zefira'},{'hero_gerald','hero_zefira'},{'hero_zefira','hero_gerald'}})do for _,name in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do if not table.contains(team,name)then for index=1,2 do for _,xp in ipairs({0,500,4000})do
 slot={heroes={team=table.deepclone(team),status={[name]={xp=xp}}}};equip({},'heroes',name,index)
 rows[#rows+1]={team=team,name=name,index=index,xp=xp,result=slot.heroes}
end end end end end
f=assert(io.open('analysis/hero-team-equip-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original hero room/storage equipment calls including starting XP exported')
