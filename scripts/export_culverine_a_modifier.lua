-- Exact original insert/remove callbacks. Full registry replacement/refresh is
-- deliberately not simulated by this focused callback oracle.
EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local rows={}
local function state(t,m,result)return{result=result,armor=t.health.magic_armor,raw=t.health.raw_magic_armor,lost=m._magic_armor_lost}end
for rank=1,3 do for _,kind in ipairs({'positive','zero','over-cap','raw-positive','dead','missing','no-magic','mod-banned','boss','remove-missing','overlap-forward','overlap-reverse'})do
 local t=E:create_entity('enemy_bandit');t.health.magic_armor=kind=='zero'and 0 or kind=='over-cap'and 1 or .4
 if kind=='over-cap'then t.health.raw_magic_armor=1.2 elseif kind=='raw-positive'then t.health.raw_magic_armor=.8 end
 if kind=='dead'then t.health.dead=true end;if kind=='no-magic'then t.enemy.can_accept_magic=false end
 if kind=='mod-banned'then t.vis.bans=4 end;if kind=='boss'then t.vis.flags=32 end
 local store={tick_ts=0,tick_length=1/30,entities=kind=='missing'and{}or{[t.id]=t}}
 local m=E:create_entity('mod_bullet_culverine_skill_a_lvl'..rank);m.modifier.target_id=t.id
 local initial={armor=t.health.magic_armor,raw=t.health.raw_magic_armor};local inserted=m.main_script.insert(m,store);local result={rank=rank,kind=kind,initial=initial,insert=state(t,m,inserted)}
 if inserted then
  if kind:match('^overlap')then
   local second=E:create_entity('mod_bullet_culverine_skill_a_lvl'..rank);second.modifier.target_id=t.id
   result.secondInsert=state(t,second,second.main_script.insert(second,store))
   local first,last=m,second;if kind=='overlap-reverse'then first,last=second,m end
   result.firstRemove=state(t,first,first.main_script.remove(first,store));result.lastRemove=state(t,last,last.main_script.remove(last,store))
  else
   if kind=='remove-missing'then store.entities[t.id]=nil end
   result.remove=state(t,m,m.main_script.remove(m,store))
  end
 end
 rows[#rows+1]=result
end end
local f=assert(io.open('analysis/culverine-a-modifier-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print('36 original A magic armor insert/remove cases, including raw overflow and overlapping callback removal orders; no full registry main supplied')
