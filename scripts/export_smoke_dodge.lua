TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,J=require('entity_db'),require('script_utils'),require('dkjson')
local rows={}
for _,roll in ipairs({0,.5,.999})do for _,stunned in ipairs({false,true})do for _,ranged in ipairs({false,true})do for _,damageType in ipairs({2,33554432})do for _,prior in ipairs({false,true})do
 local e=E:create_entity('enemy_bandit');e.pos={x=500,y=350};e.health.hp=30;e.unit.is_stunned=stunned
 if prior then E:add_comps(e,'dodge');e.dodge.chance=.2 end
 local mod=E:create_entity('mod_shadow_blades_smoke');mod.modifier.target_id=e.id
 local store={tick_ts=1,tick_length=1/30,entities={[e.id]=e}}
 local draws,pops={},{}
 math.random=function(a,b)draws[#draws+1]={min=a,max=b};return a and a+math.floor(roll*(b-a+1))or roll end
 simulation={queue_insert_entity=function(_,p)pops[#pops+1]={name=p.template_name,pos=table.clone(p.pos),rotation=p.render.sprites[1].r}end}
 assert(mod.main_script.insert(mod,store));store.tick_ts=1.1
 local dodged=SU.unit_dodges(store,e,ranged,{damage_type=damageType})
 if e.dodge.active and e.dodge.show_pop then SU.show_dodge_pop(store,e)end
 local d=e.dodge
 local state={chance=d.chance,active=d.active,ts=d.ts,lastCheck=d.last_check_ts,lastDodge=d.last_doge_ts,ranged=d.ranged,silent=d.silent,showPop=d.show_pop}
 assert(mod.main_script.remove(mod,store))
 rows[#rows+1]={roll=roll,stunned=stunned,ranged=ranged,damageType=damageType,prior=prior,dodged=dodged,draws=draws,pops=pops,state=state,restoredChance=e.dodge and e.dodge.chance}
end end end end end
local f=assert(io.open('analysis/smoke-dodge-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original smoke dodge component/RNG/pop/restoration cases')
