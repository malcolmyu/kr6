EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,P,G,S,systems=require('entity_db'),require('dkjson'),require('path_db'),require('grid_db'),require('sound_db'),require('systems');SSO=nil
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
G:load('level03');P:load('level03',{left=-512/3,right=1024+512/3,bottom=0,top=768});require('difficulty'):set_level(2);require('difficulty'):patch_templates()
local withPops=arg[1]=='--pops'
local cases={}
for rank=1,4 do for _,kind in ipairs({'stationary','moving','ban-temporary','ban-impact','removed','removed-return','teleport-limit','teleport-outside','dead','dead-revive','insert-ban','ignore-offset','ignore-damage','immune-magic','sequence','two-lethal'})do cases[#cases+1]={rank=rank,kind=kind}end end
for _,roll in ipairs({.49,.5,.50001})do cases[#cases+1]={rank=1,kind='magic-penetration',roll=roll}end
cases[#cases+1]={rank=3,kind='reverse-no-kill'}
if withPops then for rank=1,4 do cases[#cases+1]={rank=rank,kind='lethal-pop'} end end
local rows={};S.queue=function()end
for _,case in ipairs(cases)do
 local store={tick_ts=0,tick_length=1/30,entities={},damage_queue={},player_gold=0,gems_collected=0,level_mode=3,level_difficulty=2}
 local target=E:create_entity('enemy_bandit');local enemyInsert=target.main_script.insert;target.main_script=nil;target.pos={x=620,y=350};target.nav_path.pi=1;target.nav_path.spi=1;target.nav_path.ni=100;target.motion.speed={x=0,y=0};target.enemy.gems=0
 assert(enemyInsert(target,store));target.health.hp=nil;assert(target.health.hp_max==40);assert(systems.health:on_insert(target,store));if case.kind=='magic-penetration'then target.health.magic_armor=.5 end
 if case.kind=='ignore-damage'then target.health.ignore_damage=true end;if case.kind=='immune-magic'then target.health.immune_to=DAMAGE_MAGICAL end
 if case.kind=='lethal-pop'then target.health.hp=1 end
 local randomCalls=0;math.random=function(a,b)if a then randomCalls=randomCalls+1;return a+math.floor((case.roll or .25)*(b-a+1))end;randomCalls=randomCalls+1;if case.kind=='sequence'then return({.9,.1,.8,.2})[(randomCalls-1)%4+1]end;return case.roll or .25 end
 local effects,damages,projectiles,seen={},{},{},{}
 simulation={queue_insert_entity=function(_,e)if e then effects[#effects+1]={at=store.tick_ts,name=e.template_name,pos=table.deepclone(e.pos),rotation=e.pop_y_offset and e.render.sprites[1].r or nil,frame=e.pop_y_offset and e.render.sprites[1].name or nil}end end,queue_remove_entity=function(_,e)if e then e.webRemoved=true end end}
 local frames={}
 for tick=0,100 do
  store.tick_ts=tick*(1/30);local kind=case.kind
  local ban=kind=='insert-ban'or kind=='ban-temporary'and tick>=5 and tick<12 or kind=='ban-impact'and tick>=5
  target.vis.bans=ban and F_RANGED or 0
  target.pos.x=620+(kind=='moving'and tick*40/30 or 0)+(kind=='teleport-limit'and tick>=4 and 128 or kind=='teleport-outside'and tick>=4 and 128.001 or 0)
  if (kind=='dead'or kind=='dead-revive')and tick==5 then target.health.hp=0;target.health.dead=true end
  if kind=='dead-revive'and tick==12 then target.health.hp=40;target.health.dead=false end
  local removed=(kind=='removed'and tick>=5)or(kind=='removed-return'and tick>=5 and tick<12)
  store.entities[target.id]=not removed and target or nil
  if tick==0 then for hand=1,((kind=='two-lethal'or kind=='reverse-no-kill')and 2 or 1)do
   local rank=kind=='reverse-no-kill'and hand==2 and 4 or case.rank;local b=E:create_entity('bolt_tower_wizard_lvl'..rank);local sign=-1;b.pos={x=500+sign*25,y=405};b.bullet.from=table.deepclone(b.pos);b.bullet.to=table.deepclone(target.pos);b.bullet.target_id=target.id;b.bullet.damage_factor=kind=='two-lethal'and hand==2 and 1.75 or 1;if kind=='reverse-no-kill'and hand==1 then b.bullet.damage_type=bit.bor(DAMAGE_MAGICAL,DAMAGE_NO_KILL)end;b.bullet.particles_name=nil;if not withPops then b.bullet.pop=nil end;b.force_motion.v.x=100*sign;b.initial_impulse_angle_abs=b.initial_impulse_angle_abs-math.pi/4*sign
   if kind=='ignore-offset'then b.bullet.ignore_hit_offset=true end
   if kind=='magic-penetration'then b.bullet.chance_to_ignore_mr=.5;b.bullet.reduce_magic_armor=.4 end
   local accepted=b.main_script.insert(b,store);local entry={entity=b,accepted=accepted};if accepted then entry.co=coroutine.create(b.main_script.update);store.entities[b.id]=b end;projectiles[#projectiles+1]=entry
  end end
  for _,p in ipairs(projectiles)do if p.co and coroutine.status(p.co)~='dead'then local ok,err=coroutine.resume(p.co,p.entity,store);assert(ok,debug.traceback(p.co,tostring(err)))end end
  local fresh={};for _,d in ipairs(store.damage_queue)do if not seen[d]then seen[d]=true;fresh[#fresh+1]=d end end
  systems.health:on_update(store.tick_length,store.tick_ts,store)
  if withPops then systems.pops:on_update(store.tick_length,store.tick_ts,store)end
  for _,d in ipairs(fresh)do damages[#damages+1]={at=store.tick_ts,value=d.value,applied=d.damage_applied,reduceMagicArmor=d.reduce_magic_armor,type=d.damage_type}end
  local shots={};for _,p in ipairs(projectiles)do local b=p.entity;shots[#shots+1]={accepted=p.accepted,active=p.co and coroutine.status(p.co)~='dead'or false,pos=table.deepclone(b.pos),velocity=table.deepclone(b.force_motion.v),to=table.deepclone(b.bullet.to),bound=b.bullet.target_id~=nil}end
  frames[#frames+1]={at=store.tick_ts,hp=target.health.hp,dead=target.health.dead,gold=store.player_gold,randomCalls=randomCalls,shots=shots}
 end
 rows[#rows+1]={case=case,frames=frames,damages=damages,effects=effects}
end
local f=assert(io.open(withPops and 'analysis/wizard-bolt-pops-oracle.json'or 'analysis/wizard-bolt-health-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original wizard moving-bolt + health-phase cases exported')
