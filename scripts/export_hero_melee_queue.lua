TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,S,Sound=require('entity_db'),require('script_utils'),require('systems'),require('sound_db');SSO=nil
local rows={}
for _,entry in ipairs({{'hero_gerald',1},{'hero_gerald',2},{'hero_zefira',1}})do for _,birth in ipairs({0,19,1316})do for _,side in ipairs({-1,1})do for _,kind in ipairs({'normal','immune','armor','lethal','unblocked'})do for _,roll in ipairs({.05,.5,.95})do
 local store={tick=birth,tick_ts=birth*(1/30),tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,wave_group_number=1,level_mode=3}
 local h=E:create_entity(entry[1]);h.pos={x=500,y=350};assert(h.main_script.insert(h,store));h.nav_rally.new=false
 local e=E:create_entity('enemy_bandit');e.pos={x=500+side*30,y=350};e.health.hp=kind=='lethal'and 3 or 1000;e.health.hp_max=1000;e.health.armor=kind=='armor'and .5 or 0;e.health.ignore_damage=kind=='immune';e.enemy.blockers={h.id};e.enemy.gold=0;e.enemy.gems=0
 h.soldier.target_id=e.id;store.entities[h.id]=h;store.entities[e.id]=e
 local a=h.melee.attacks[entry[2]];a.pop=nil
 local calls,events,sounds=0,{},{}
 math.random=function(min,max)calls=calls+1;return min and min+math.floor(roll*(max-min+1))or roll end
 simulation={queue_insert_entity=function(_,fx)events[#events+1]={tick=store.tick,name=fx.template_name,pos=table.clone(fx.pos)}end}
 Sound.queue=function(_,name)if name then sounds[#sounds+1]={tick=store.tick,name=name}end end;Sound.stop=function()end
 local co=coroutine.create(function()SU.y_soldier_do_single_melee_attack(store,h,e,a)end);local frames={}
 for relative=1,23 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  if kind=='unblocked'and relative==2 then e.enemy.blockers={}end
  local ok,err=coroutine.resume(co);assert(ok,debug.traceback(co,tostring(err)))
  local pending={};for _,d in ipairs(store.damage_queue)do if d.damage_applied==nil then pending[#pending+1]={value=d.value,damage_type=d.damage_type,xp=d.xp_gain_factor}end end
  local before=e.health.hp;S.health:on_update(1/30,store.tick_ts,store)
  frames[#frames+1]={tick=store.tick,before=before,hp=e.health.hp,pending=pending,calls=calls}
 end
 rows[#rows+1]={name=entry[1],attack=entry[2],birth=birth,side=side,kind=kind,roll=roll,frames=frames,effects=events,sounds=sounds}
end end end end end
local f=assert(io.open('analysis/hero-melee-queue-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original preselected hero melee queue/health traces exported')
