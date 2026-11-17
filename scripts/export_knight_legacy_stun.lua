TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,S,sim=require('entity_db'),require('systems'),require('klove.simulation');simulation=sim;SSO=nil
local rows={}
for _,roll in ipairs({0,.1,.100000001,.2,.200000001,.3,.300000001,.9})do for rank=1,3 do for _,birth in ipairs({0,1795})do for _,kind in ipairs({'normal','refresh','upgrade','lower','other-stun','dead','removed','missing','vis-ban','boss','ignore-stun','move'})do
 local calls=0;math.random=function(a,b)calls=calls+1;if not a then return roll elseif not b then return 1+math.floor(roll*a)else return a+math.floor(roll*(b-a+1))end end
 local store={};sim:init(store,S,{'mod_lifecycle','main_script'},TICK_LENGTH);store.tick=birth;store.tick_ts=birth*TICK_LENGTH
 local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=500,y=350};e.health.hp=1000;e.unit.mod_offset={x=7,y=13}
 if kind=='boss'then e.vis.flags=bit.bor(e.vis.flags,F_BOSS)end;if kind=='vis-ban'then e.vis.bans=bit.bor(e.vis.bans,F_MOD)end;if kind=='ignore-stun'then e.unit.ignore_stun=true end
 if kind~='missing'then sim:queue_insert_entity(e)end;sim:do_tick()
 local function add(r,other)local m=E:create_entity(other and'mod_zefira_skill_a_stun'or'mod_knights_skill_c_stun_lvl'..r);m.modifier.target_id=e.id;sim:queue_insert_entity(m)end
 local frames={}
 for tick=1,280 do
  if tick==1 then add(rank)end
  if tick==31 then if kind=='refresh'then add(rank)elseif kind=='upgrade'then add(math.min(3,rank+1))elseif kind=='lower'then add(math.max(1,rank-1))elseif kind=='other-stun'then add(1,true)end end
  if tick==61 and kind=='dead'then e.health.dead=true;e.health.hp=0 end
  if tick==61 and kind=='removed'then sim:queue_remove_entity(e)end
  if kind=='move'then e.pos.x=e.pos.x+1;e.render.sprites[1].flip_x=tick%60>=30;e.unit.mod_offset.x=tick%40>=20 and 11 or 7 end
  sim:do_tick();local mods={}
  for _,m in pairs(store.entities)do if m.modifier then local s=m.render and m.render.sprites[1];mods[#mods+1]={key=m.template_name,ts=m.modifier.ts,duration=m.modifier.duration,pos=table.clone(m.pos),name=s and s.name,spriteTs=s and s.ts,flip=s and s.flip_x,offset=s and table.clone(s.offset),pending=not not m.pending_removal}end end
  table.sort(mods,function(a,b)return a.key<b.key end)
  frames[#frames+1]={tick=store.tick,at=store.tick_ts,calls=calls,count=e.unit.stun_count,stunned=not not e.unit.is_stunned,mods=mods}
 end
 rows[#rows+1]={rank=rank,birth=birth,kind=kind,roll=roll,frames=frames}
end end end end
local f=assert(io.open('analysis/knight-legacy-stun-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original knight C chance/lifecycle cases')
