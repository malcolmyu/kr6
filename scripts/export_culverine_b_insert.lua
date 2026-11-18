EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local rows={}
for rank=1,3 do for _,kind in ipairs({'positive','zero','near-zero','over-cap','mod-banned','boss','dead','missing','raw-positive'})do
 local target=E:create_entity('enemy_bandit');target.health.armor=kind=='zero'and 0 or kind=='near-zero'and 0.01 or kind=='over-cap'and 1 or 0.2
 if kind=='over-cap'then target.health.raw_armor=1.2 elseif kind=='raw-positive'then target.health.raw_armor=0.7 end
 if kind=='mod-banned'then target.vis.bans=4 end;if kind=='boss'then target.vis.flags=32 end
 if kind=='dead'then target.health.hp=0;target.health.dead=true end
 local store={tick_ts=0,tick_length=1/30,entities=kind=='missing'and{}or{[target.id]=target}};local frames={}
 for tick=1,8 do
  store.tick_ts=tick*(1/30);local m=E:create_entity('mod_bullet_culverine_skill_b_lvl'..rank);m.modifier.target_id=target.id;m.modifier.level=0
  local result=m.main_script.insert(m,store)
  frames[#frames+1]={tick=tick,result=result,armor=target.health.armor,raw=target.health.raw_armor}
 end
 rows[#rows+1]={rank=rank,kind=kind,frames=frames}
end end
local f=assert(io.open('analysis/culverine-b-insert-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print('27 original insert traces /216 attempts; no health/death main supplied')
