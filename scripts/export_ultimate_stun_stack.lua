EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local S=require('systems');local J=require('dkjson');local rows={}
for _,born in ipairs({0,19})do
 local e=E:create_entity('enemy_bandit');e.health.hp=1000;e.pos={x=500,y=350};local store={tick_ts=born,tick_length=1/30,entities={[e.id]=e}};local mods={};local frames={};simulation={queue_remove_entity=function(_,m)m.oracleRemoved=true end}
 for frame=0,60 do store.tick_ts=born+frame/30
  local name=frame==0 and'mod_zefira_skill_a_stun'or (frame==3 or frame==6)and'mod_gerald_ultimate_initial_stun'or frame==12 and'mod_gerald_ultimate_hit_stun'
  if name then local m=E:create_entity(name);m.modifier.target_id=e.id;if S.mod_lifecycle:on_insert(m,store)and m.main_script.insert(m,store)then store.entities[m.id]=m;mods[#mods+1]=m;m.oracleCoroutine=coroutine.create(m.main_script.update)end end
  for _,m in ipairs(mods)do if not m.oracleRemoved then local ok,err=coroutine.resume(m.oracleCoroutine,m,store);assert(ok,err);if m.oracleRemoved then m.main_script.remove(m,store);store.entities[m.id]=nil end end end
  frames[#frames+1]={at=store.tick_ts,count=e.unit.stun_count,stunned=e.unit.is_stunned or false}
 end
 rows[#rows+1]={born=born,frames=frames}
end
local f=assert(io.open('analysis/ultimate-stun-stack-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original distinct stun templates and same-template refresh exported')
