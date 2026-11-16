EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db');local LU=require('level_utils');local J=require('dkjson')
local rows={}
for stage=1,3 do
 local data=dofile(string.format('reference/apk/assets/gc64/kr6/data/levels/level%02d_data.lua',stage))
 local store={level=data,hero_team={},entities={},tick_ts=0}
 simulation={queue_insert_entity=function(_,e)if e.hero then assert(e.main_script.insert(e,store));store.entities[e.id]=e end end}
 local row={stage=stage,heroes={}}
 for _,name in ipairs(require('game_settings').default_team)do
  local h=LU.insert_hero_kr5(store,name,nil,{xp=0,skills={}})
  row.heroes[#row.heroes+1]={name=name,pos=h.pos,hp=h.health.hp_max,armor=h.health.armor,melee_min=h.melee.attacks[1].damage_min,melee_max=h.melee.attacks[1].damage_max}
 end
 rows[#rows+1]=row
end
local f=assert(io.open('analysis/hero-team-oracle.json','w'));f:write(J.encode(rows));f:close()
