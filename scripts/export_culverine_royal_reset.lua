EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local rows={}
for _,kind in ipairs({'default','A-static','C-basic','all-static'})do
 local t=E:create_entity('tower_culverine_lvl4');local m=E:create_entity('mod_power_royal_edict_towerbuff');m.modifier.target_id=t.id;m.reset_skills_cd=true
 for i,a in ipairs(t.attacks.list)do a.ts=100+i end
 for i,a in ipairs(t.timed_attacks.list)do a.ts=200+i;if kind=='all-static'or kind=='A-static'and i==1 then a.static_cooldown=true end;if kind=='C-basic'and i==2 then a.basic_attack=true end end
 local before={attacks=table.deepclone(t.attacks.list),timed=table.deepclone(t.timed_attacks.list)}
 assert(m.main_script.insert(m,{tick_ts=0,entities={[t.id]=t}}))
 rows[#rows+1]={kind=kind,before=before,after={attacks=table.deepclone(t.attacks.list),timed=table.deepclone(t.timed_attacks.list)}}
end
local f=assert(io.open('analysis/culverine-royal-reset-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close()
