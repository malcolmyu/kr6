EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local SU=require('script_utils');local J=require('dkjson');local oldRandom=math.random;local rows={}
local patterns={{.5,.1,.5,.8,.5},{.5,.1,.5,.1,.5},{.5,.8,.5,.8,.5},{.5,.35,.5,.35,.5}}
for _,born in ipairs({0,.1,19})do for _,chance in ipairs({0,.35})do for _,pattern in ipairs(patterns)do
 local h=E:create_entity('hero_gerald');h.main_script.insert(h,{tick_ts=born});h.pos={x=530,y=350};h.dodge.chance=chance
 local e=E:create_entity('enemy_bandit');e.pos={x=500,y=350};e.melee.order={1};e.melee.attacks[1].ts=born-10;e.enemy.blockers={h.id}
 local store={tick_ts=born,tick_length=1/30,entities={[h.id]=h,[e.id]=e},damage_queue={}};local pops,randoms,frames={},{},{};local index=0
 math.random=function(a,b)index=index+1;local r=pattern[(index-1)%#pattern+1];local result=a and a+math.floor(r*(b-a+1))or r;randoms[#randoms+1]={at=store.tick_ts,a=a,b=b,result=result};return result end
 simulation={queue_insert_entity=function(_,o)if o.template_name=='pop_block'then pops[#pops+1]={at=store.tick_ts,pos=table.deepclone(o.pos),rotation=o.render.sprites[1].r}end end}
 local co=coroutine.create(SU.y_enemy_melee_attacks)
 for frame=0,45 do store.tick_ts=born+frame/30;local s=e.render.sprites[1];s.runs=math.floor((store.tick_ts-s.ts)/(.8)+1e-9)
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,store,e,h);assert(ok,debug.traceback(co,tostring(err)))end
  local damage={};for _,d in ipairs(store.damage_queue)do damage[#damage+1]=d.value end
  frames[#frames+1]={at=store.tick_ts,active=h.dodge.active,lastCheck=h.dodge.last_check_ts,damage=damage}
 end
 rows[#rows+1]={born=born,chance=chance,pattern=pattern,pops=pops,randoms=randoms,frames=frames}
end end end
math.random=oldRandom
local f=assert(io.open('analysis/gerald-dodge-melee-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original Gerald melee dodge and pop traces exported')
local checks={}
for _,roll in ipairs({0,.35,.35001})do for _,scenario in ipairs({'normal','zero','stun','no-dodge','melee-only','cooldown-boundary','cooldown-ready','requires-magic'})do
 local h=E:create_entity('hero_gerald');h.dodge.chance=scenario=='zero'and 0 or .35;h.unit.is_stunned=scenario=='stun';h.dodge.ranged=scenario~='melee-only';h.dodge.requires_magic=scenario=='requires-magic'
 if scenario=='cooldown-boundary'or scenario=='cooldown-ready'then h.dodge.cooldown=scenario=='cooldown-boundary'and 3 or 2.9 end
 local attack={damage_type=scenario=='no-dodge'and 33554434 or 2};local calls=0;math.random=function()calls=calls+1;return roll end
 local result=SU.unit_dodges({tick_ts=3},h,true,attack)
 checks[#checks+1]={roll=roll,scenario=scenario,result=result,calls=calls,active=h.dodge.active,lastCheck=h.dodge.last_check_ts,lastDodge=h.dodge.last_doge_ts}
end end
math.random=oldRandom
local f=assert(io.open('analysis/gerald-dodge-check-oracle.json','w'));f:write(J.encode(checks));f:close()
