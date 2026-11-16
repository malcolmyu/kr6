EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local S=require('systems');local J=require('dkjson');local rows={}
for _,born in ipairs({0,19})do for _,mode in ipairs({'normal','move','death','immune'})do
 local h=E:create_entity('hero_zefira');h.pos={x=500,y=350};h.main_script.insert(h,{tick_ts=born});local e=E:create_entity('enemy_blackguard');e.pos={x=530,y=350};e.health.hp=1000;e.health.armor=.3;e.health.magic_armor=.4
 local a=E:create_entity('aura_zefira_talent_1');a.aura.source_id=h.id;local store={tick_ts=born,tick_length=1/30,entities={[h.id]=h,[e.id]=e}};local mods,pending,events={}, {},{};simulation={queue_insert_entity=function(_,o)pending[#pending+1]=o;events[#events+1]={at=store.tick_ts,name=o.template_name}end,queue_remove_entity=function(_,o)o.oracleRemoved=true end}
 assert(a.main_script.insert(a,store));local co=coroutine.create(a.main_script.update);local frames={}
 for frame=0,180 do store.tick_ts=born+frame/30
  if mode=='move'then h.pos.x=frame>=35 and frame<75 and 100 or 500 end
  if mode=='death'then h.health.dead=frame>=35 and frame<105;a.aura.cycle_time=h.health.dead and 1e99 or .5 end
  if mode=='immune'then e.vis.bans=frame<60 and 4 or 0;e.enemy.can_accept_magic=frame<120 end
  for _,m in ipairs(pending)do if S.mod_lifecycle:on_insert(m,store)and m.main_script.insert(m,store)then m.oracleCoroutine=coroutine.create(m.main_script.update);mods[#mods+1]=m;store.entities[m.id]=m end end;pending={}
  local ok,err=coroutine.resume(co,a,store);assert(ok,debug.traceback(co,tostring(err)))
  for _,m in ipairs(mods)do if not m.oracleRemoved then local good,msg=coroutine.resume(m.oracleCoroutine,m,store);assert(good,msg);if m.oracleRemoved then m.main_script.remove(m,store);store.entities[m.id]=nil end end end
  local active=0;for _,m in ipairs(mods)do if not m.oracleRemoved then active=active+1 end end
  frames[#frames+1]={at=store.tick_ts,armor=e.health.armor,magic=e.health.magic_armor,raw=e.health.raw_armor,rawMagic=e.health.raw_magic_armor,active=active}
 end
 rows[#rows+1]={born=born,mode=mode,frames=frames,events=events}
end end
local f=assert(io.open('analysis/zefira-weakness-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original Zefira weakening aura and raw armour lifecycle exported')
local cases={}
for _,config in ipairs({{x=50,y=0},{x=50.01,y=0},{x=0,y=35},{x=0,y=34.99},{x=20,y=0,boss=true},{x=20,y=0,air=true},{x=20,y=0,immune=true},{x=20,y=0,noMagic=true},{x=20,y=0,raw=1.4,magicRaw=.7,big=true},{x=20,y=0,raw=-.2,magicRaw=-.1}})do
 local e=E:create_entity('enemy_blackguard');e.pos={x=500+config.x,y=350+config.y};e.health.hp=1000;e.health.armor=config.raw and math.max(0,math.min(1,config.raw))or .3;e.health.magic_armor=config.magicRaw and math.max(0,math.min(1,config.magicRaw))or .4;e.health.raw_armor=config.raw;e.health.raw_magic_armor=config.magicRaw
 if config.big then e.unit.size=2 end;if config.boss then e.vis.flags=bit.bor(e.vis.flags,32)end;if config.air then e.vis.flags=bit.bor(e.vis.flags,128)end;if config.immune then e.vis.bans=4 end;if config.noMagic then e.enemy.can_accept_magic=false end
 local m=E:create_entity('mod_zefira_talent');m.modifier.target_id=e.id;local store={tick_ts=0,entities={[e.id]=e}}
 local inRange=require('utils').is_inside_ellipse(e.pos,{x=500,y=350},50)and bit.band(e.vis.flags,1184)==0
 local inserted=inRange and m.main_script.insert(m,store)or false;local armor,magic=e.health.armor,e.health.magic_armor;if inserted then m.main_script.remove(m,store)end
 cases[#cases+1]={config=config,inserted=inserted,armor=armor,magic=magic,afterArmor=e.health.armor,afterMagic=e.health.magic_armor,prefix=m.render.sprites[1].prefix}
end
local f=assert(io.open('analysis/zefira-weakness-eligibility.json','w'));f:write(J.encode(cases));f:close()
