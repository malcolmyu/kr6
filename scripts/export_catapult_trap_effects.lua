EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,U,A,P,S=require('entity_db'),require('dkjson'),require('utils'),require('klove.animation_db'),require('path_db'),require('sound_db');local systems=require('systems');local sim=require('klove.simulation');local previous={sim=simulation,node=P.is_node_valid,random=math.random,sound=S.queue};simulation=sim;P.is_node_valid=function()return true end
math.random=function(a,b)if not a then return .5 end;return a+math.floor(.5*(b-a+1))end
local qInsert,qRemove,health=sim.queue_insert_entity,sim.queue_remove_entity,systems.health.on_update;local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local rows={}
for _,birth in ipairs({0,19})do for level=1,3 do for mode=1,16 do
 local store={player_gold=0};sim:init(store,systems,{'mod_lifecycle','main_script','health'},1/30);for i=1,birth do sim:do_tick()end
 local known,auras,queued,damage,sounds,seen,removed={}, {},{},{},{},{},{};local seq=0
 sim.queue_insert_entity=function(self,e)if e.modifier then seq=seq+1;e.webKey=seq;queued[#queued+1]={at=store.tick_ts,key=seq,name=e.template_name,level=e.modifier.level}end;qInsert(self,e)end
 sim.queue_remove_entity=function(self,e)removed[e.id]=true;qRemove(self,e)end
 systems.health.on_update=function(...)for _,d in ipairs(store.damage_queue)do if not seen[d]then seen[d]=true;damage[#damage+1]={at=store.tick_ts,value=d.value,type=d.damage_type}end end;return health(...)end
 S.queue=function(_,name)sounds[#sounds+1]={at=store.tick_ts,name=name}end
 local source=E:create_entity('tower_catapult_lvl4');source.main_script=nil;source.pos={x=500,y=350};source.active_traps={};if mode~=14 then sim:queue_insert_entity(source)end
 local e=E:create_entity('enemy_bandit');e.main_script=nil;e.pos={x=600,y=350};e.health.hp=mode==15 and 15 or 5000;e.health.hp_max=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100
 if mode==2 then e.pos.x=900 end;if mode==5 then e.vis.flags=bit.bor(e.vis.flags,128)end;if mode==6 then e.vis.bans=bit.bor(e.vis.bans,8)end;if mode==7 then e.vis.bans=bit.bor(e.vis.bans,4194308)end;if mode==8 then e.vis.flags=bit.bor(e.vis.flags,32);e.health.armor=.5 end;if mode==9 then e.unit.ignore_stun=true end
 sim:queue_insert_entity(e)
 local function add(rank)local a=E:create_entity('aura_catapult_skill_c_trap');a.pos={x=600,y=350};a.aura.level=rank;a.source_id=source.id;a.webKey=#auras+1;auras[#auras+1]=a;sim:queue_insert_entity(a);return a end
 add(level)
 if mode==16 then local m=E:create_entity('mod_zefira_skill_a_stun');m.modifier.target_id=e.id;m.modifier.duration=5;sim:queue_insert_entity(m)end
 local frames={}
 for tick=1,190 do
  if mode==2 and tick==61 then e.pos.x=600 end
  if mode==3 and tick==20 then e.pos.x=900 end
  if mode==4 and tick==20 then e.health.dead=true;e.health.hp=0 end
  if mode==6 and tick==61 then e.vis.bans=bit.band(e.vis.bans,bit.bnot(8))end
  if mode>=10 and mode<=12 and tick==31 then add(mode==10 and level or mode==11 and math.min(3,level+1)or math.max(1,level-1))end
  if mode==13 and tick==5 then sim:queue_remove_entity(source)end
  for _,a in ipairs(auras)do local s=a.render.sprites[1];local animation=art.animations[s.prefix..'_'..s.name];local _,runs=A:fni(animation,(store.tick+1)*(1/30)-s.ts,s.loop,s.fps,1/30);s.runs=runs end
  sim:do_tick();local traps,mods={},{}
  for _,a in ipairs(auras)do local s=a.render.sprites[1];traps[#traps+1]={key=a.webKey,level=a.aura.level,active=store.entities[a.id]~=nil,name=s.name,at=a.aura.ts,spriteAt=s.ts,loop=s.loop,runs=s.runs,hidden=s.hidden or false,pending=a.pending_removal or false};assert(not store.entities[a.id]or a.main_script.co or removed[a.id],'native trap coroutine failed')end
  for _,m in pairs(store.entities)do if m.modifier and m.template_name=='mod_catapult_skill_c_stun'then local s=m.render.sprites[1];mods[#mods+1]={level=m.modifier.level,at=m.modifier.ts,duration=m.modifier.duration,spriteAt=s.ts,prefix=s.prefix,name=s.name,pending=m.pending_removal or false}end end
  table.sort(mods,function(a,b)return a.level<b.level end)
  frames[#frames+1]={at=store.tick_ts,traps=traps,mods=mods,hp=e.health.hp,stunCount=e.unit.stun_count,stunned=e.unit.is_stunned or false,ownerCount=#source.active_traps,ownerExists=store.entities[source.id]~=nil}
 end
 rows[#rows+1]={birth=birth,level=level,mode=mode,frames=frames,queued=queued,damage=damage,sounds=sounds}
 sim.queue_insert_entity,sim.queue_remove_entity,systems.health.on_update=qInsert,qRemove,health
end end end
simulation,P.is_node_valid,math.random,S.queue=previous.sim,previous.node,previous.random,previous.sound
local f=assert(io.open('analysis/catapult-trap-effects-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original trap/stun/health traces,18240 frames including requery, immune/dead/escape, same/higher/lower ranks and independent stun')
