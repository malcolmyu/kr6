-- Isolated original shield oracle; template export has its own distinct filename.
EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,P=require('entity_db'),require('dkjson'),require('path_db')
local oldValid,oldRandom=P.is_node_valid,math.random;P.is_node_valid=function()return true end;math.random=function(a,b)if a then return a end;return .5 end
local exo=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/go_hero_zefira/hero_zefira_skill2Def.exo3');local lengths={};for _,a in ipairs(exo.animations)do lengths[a.name]=#a.frames/30 end
local rows={}
for _,born in ipairs({0,19})do for level=1,3 do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};h.hero.skills.skill_b.level=level
 local store={tick_ts=born,tick_length=1/30,entities={},damage_queue={}};h.main_script.insert(h,store);store.entities[h.id]=h
 local enemy=E:create_entity('enemy_bandit');enemy.pos={x=510,y=350};enemy.health.hp=1000;store.entities[enemy.id]=enemy
 local aura=E:create_entity('aura_zefira_skill_b');aura.aura.source_id=h.id;aura.aura.target_id=h.id;aura.aura.level=level;if level>=2 then aura.aura.mod='mod_zefira_skill_b_slow' end;if level==3 then aura.aura.duration=6 end
 local effects,removed={},false;simulation={queue_insert_entity=function(_,e)effects[#effects+1]={name=e.template_name,at=store.tick_ts}end,queue_remove_entity=function(_,e)if e==aura then removed=true end end}
 assert(aura.main_script.insert(aura,store));local co=coroutine.create(aura.main_script.update);local frames={};local cleaned=false
 for frame=0,240 do store.tick_ts=born+frame/30;local s=aura.render.sprites[1];s.runs=s.name and lengths[s.name] and math.floor((store.tick_ts-s.ts)/lengths[s.name]+1e-9)or 0
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,aura,store);assert(ok,debug.traceback(co,tostring(err)))end
  if removed and not cleaned then aura.main_script.remove(aura,store);cleaned=true end
  frames[#frames+1]={at=store.tick_ts,damage=#store.damage_queue,done=coroutine.status(co)=='dead',armor=h.health.armor,magic=h.health.magic_armor,name=s.name,ts=s.ts}
 end
 rows[#rows+1]={born=born,level=level,frames=frames,effects=effects}
end end
P.is_node_valid=oldValid;math.random=oldRandom
local f=assert(io.open(arg[1]or'analysis/zefira-shield-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original isolated shield coroutine traces exported')
