-- Execute the shipped level bootstrap. Only resource loading is replaced;
-- level/deck/template/path/wave/entity logic remains the original bytecode.
if not arg[1]or arg[1]=='--insert-all'then
 local interpreter=arg[-1]or'luajit'
 local phase=arg[1]=='--insert-all'and' normal insert'or''
 for stage=1,3 do for _,mode in ipairs({'campaign','iron'})do for _,profile in ipairs({'default','entry','cleared'})do
  local command=string.format('%s scripts/export_level_entity_bootstrap.lua %d %s %s%s',interpreter,stage,mode,profile,phase)
  assert(os.execute(command)==0,command)
 end end end
 for _,variant in ipairs({'restarted','skip-cutscenes','zefira-first','zefira-only'})do
  local command=string.format('%s scripts/export_level_entity_bootstrap.lua 2 campaign entry %s%s',interpreter,variant,phase~=''and' insert'or'')
  assert(os.execute(command)==0,command)
 end
 return
end
TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end
love.filesystem.load=loadfile
love.filesystem.read=function(path)local f=assert(io.open(path));local text=f:read('*a');f:close();return text end
IS_MOBILE=true;IS_DESKTOP=false;DEBUG=false
TICK_LENGTH=1/30
game={game_scale=1,ref_h=768,camera={}}
main={params={}}
local E,J,sim=require('entity_db'),require('dkjson'),require('klove.simulation');simulation=sim
local LU,GS=require('level_utils'),require('game_settings')
local systems=require('systems');local init=systems.level.init
local slot=dofile('reference/apk/assets/gc64/kr6/data/slot_template.lua')
local stage,mode,profile=assert(tonumber(arg[1])),assert(arg[2]),assert(arg[3])
local variant=arg[4]or'normal'
local runtimePhase=arg[5]=='runtime'
local insertionPhase=arg[5]=='insert'or runtimePhase
local randomDraws={}
local phase,activeInsert='setup',nil
if insertionPhase then
 require('sound_db'):init('reference/apk/assets/kr6-phone/sounds')
 math.randomseed(1234)
 local random=math.random
 if runtimePhase and arg[8]=='constant'then random=function(a,b)
  if a==nil then return .5 elseif b==nil then return 1+math.floor(.5*a)else return a+math.floor(.5*(b-a+1))end
 end end
 if runtimePhase and arg[8]=='lcg104' then
  local seed=104
  random=function(a,b)seed=(1664525*seed+1013904223)%4294967296;local v=seed/4294967296;if a==nil then return v elseif b==nil then return 1+math.floor(v*a)else return a+math.floor(v*(b-a+1))end end
 end
 if runtimePhase and arg[8]=='sequence'then
  local values={.11,.83,.29,.71,.43,.59,.19,.97,.37,.61,.07,.89,.47,.53,.23,.79};local draw=0
  random=function(a,b)draw=draw+1;local v=values[(draw-1)%#values+1];if a==nil then return v elseif b==nil then return 1+math.floor(v*a)else return a+math.floor(v*(b-a+1))end end
 end
 math.random=function(...)
  local value=random(...);local caller=debug.getinfo(2,'Sl')
  randomDraws[#randomDraws+1]={args={...},value=value,source=caller.source,line=caller.currentline,phase=phase,callback=activeInsert and table.deepclone(activeInsert),stack=arg[9]=='trace'and debug.traceback('',2)or nil}
  return value
 end
end
assert(stage>=1 and stage<=3 and(mode=='campaign'or mode=='iron')and(profile=='default'or profile=='entry'or profile=='cleared'))
if profile=='cleared'or(profile=='entry'and stage>1)then
 for index=1,profile=='cleared'and 3 or stage-1 do slot.levels[index]={[1]=2,stars=3,[3]=2}end
 slot.heroes.team={'hero_gerald','hero_zefira'}
 slot.towers.selected={'archers','knights','catapult','wizard'}
 slot.powers.selected={'reinforcements','rain_of_fire','royal_edict'}
end
if variant=='zefira-first'then slot.heroes.team={'hero_zefira','hero_gerald'}elseif variant=='zefira-only'then slot.heroes.team={'hero_zefira'}end
-- Optional real save profile, consumed by the shipped level init/upgrade code.
local runtimeProfile
if arg[10]then
 local file=assert(io.open(arg[10]));runtimeProfile=assert(J.decode(file:read('*a')));file:close()
 for kind,xp in pairs(runtimeProfile.powerXp or{})do assert(slot.powers.status[kind]);slot.powers.status[kind].xp=xp end
 for kind,nodes in pairs(runtimeProfile.powerUpgrades or{})do slot.upgrades_trees['power_'..kind]=nodes end
 for name,xp in pairs(runtimeProfile.heroXp or{})do assert(slot.heroes.status[name]);slot.heroes.status[name].xp=xp end
 for name,nodes in pairs(runtimeProfile.heroUpgrades or{})do slot.upgrades_trees[name]=nodes end
 for kind,nodes in pairs(runtimeProfile.globalUpgrades or{})do slot.upgrades_trees[kind]=nodes end
end
main.params.skip_cutscenes=variant=='skip-cutscenes'
require('storage').load_slot=function()return slot end
local saveRequests=0
local fixtureStorage={load_slot=function()return slot end,save_slot=function()saveRequests=saveRequests+1;return true end}
require('storage').save_slot=fixtureStorage.save_slot
local bindings={features=require('features'),storage=fixtureStorage,log=require('klua.log'):new('bootstrap'),UP=require('upgrades'),DI=require('difficulty'),GR=require('grid_db'),P=require('path_db'),W=require('wave_db'),A={load=function()end},I={db_atlas={}},E=E,EXO={load_groups=function()end,load=function()end},GS=GS,LU=LU,MO=require('modes'),U=require('utils')}
-- Recover the exact XP helper captured by the shipped systems module.
for i=1,100 do local name,fn=debug.getupvalue(systems.level.init,i);if not name then break end;if name=='apply_starting_xp'then bindings[name]=fn end end
local strings=dofile('reference/apk/assets/kr6-phone/strings/zh-Hans.lua');_=function(key)return strings[key]or key end
local originalCreate=E.create_entity
local events={}
local damageTrace={}
local currentStore,activeUpdate
local acquisitions,activeWizard,activeTower,activeActor={},nil,nil,nil
if runtimePhase then
 local originalHealth=systems.health.on_update
 systems.health.on_update=function(self,dt,ts,store)
  local incoming={};for _,d in ipairs(store.damage_queue)do if d.damage_applied==nil then incoming[#incoming+1]=d end end
  originalHealth(self,dt,ts,store)
  for _,d in ipairs(incoming)do damageTrace[#damageTrace+1]={tick=store.tick,id=d.id,source=d.source_id,target=d.target_id,value=d.value,applied=d.damage_applied,result=d.damage_result}end
 end
 local original=E.filter_iter
 E.filter_iter=function(self,entities,c1,c2,c3)
  local iterator,state,key=original(self,entities,c1,c2,c3)
  if c1~='main_script'then return iterator,state,key end
  return function(t,k)
   activeWizard=nil;activeTower=nil;activeActor=nil
   local id,entity=iterator(t,k);activeActor=entity
   if entity and entity.tower then activeTower=entity end
   if entity and entity.template_name:match('^tower_wizard_')then activeWizard=entity end
   return id,entity
  end,state,key
 end
 local U=require('utils');local find=U.find_foremost_enemy
 U.find_foremost_enemy=function(...)
  local function pack(...)return{n=select('#',...),...}end
  local args=pack(...);local result=pack(find(...))
  if activeTower and currentStore and currentStore.tick>=450 and currentStore.tick<=930 then
   local actors={};for id,e in pairs(currentStore.entities)do if e.enemy and e.health and not e.health.dead then actors[#actors+1]={id=id,pos=table.clone(e.pos),node=table.clone(e.nav_path),speed=e.motion and table.clone(e.motion.speed)}end end
   local targets={};for _,e in ipairs(result[2]or{})do targets[#targets+1]=e.id end
   acquisitions[#acquisitions+1]={tick=currentStore.tick,source=activeTower.id,holder=activeTower.tower.holder_id,prediction=args[5],predicted=result[3],first=result[1]and result[1].id,targets=targets,actors=actors}
  end
  return unpack(result,1,result.n)
 end
end
local function record(event)
 if runtimePhase then
  event.tick=currentStore and currentStore.tick or 0
  event.system=activeInsert and activeInsert.system or activeUpdate or phase
 end
 events[#events+1]=event
end
local cloneEvents={};local originalClone=E.clone_entity
E.clone_entity=function(self,entity)
 local before=entity.id;local result=originalClone(self,entity)
 cloneEvents[#cloneEvents+1]={before=before,after=entity.id,result=result.id,template=entity.template_name}
 return result
end
local templateDefaults={}
E.create_entity=function(self,template)
 local entity=originalCreate(self,template)
 local components={}
 for _,name in ipairs({'main_script','enemy','health','death_spawns','spawner','picked_enemies','tunnel','graveyard','modifier','tower'})do
  local value=entity[name];if value~=nil then components[name]=type(value)=='table'and{}or value end
 end
 if entity.spawner then components.spawner.eternal=entity.spawner.eternal end
 templateDefaults[entity.template_name]={hasEditor=entity.editor~=nil,gameMode=entity.editor and entity.editor.game_mode,controllerT=entity.controller_t,indexComponents=components}
 local event={kind='create',id=entity.id,template=entity.template_name}
 if runtimePhase then local caller=debug.getinfo(2,'Sl');event.source=caller.source;event.line=caller.currentline;event.holder=activeTower and activeTower.tower.holder_id;event.owner=activeActor and activeActor.id end
 record(event)
 return entity
end
local store={level_idx=stage,level_name=string.format('level%02d',stage),level_mode=mode=='campaign'and GAME_MODE_CAMPAIGN or GAME_MODE_IRON,level_difficulty=1,visible_coords={left=-512/3,right=1024+512/3,bottom=0,top=768},screen_scale={x=1,y=1},texture_size='ipadhd',ephemeral={}}
if runtimePhase then store.level_difficulty=2 end
store.restarted=variant=='restarted'
currentStore=store
if runtimeProfile then
 -- The simulation does not install game_gui's signal handlers. Execute the
 -- shipped got-gold handler too; only its visual widgets are replaced here.
 local gotGold=assert(loadfile('analysis/function-bytecode/game_gui_line1262.lua'))
 local gui={game={store=store},w2u=function(_,p)return p.x,p.y end}
 local guiBindings={game_gui=gui,S=require('sound_db'),wid=function(name)if name=='layer_gui_world'then return{add_child=function()end}end end,timer={tween=function()end},V=require('klua.vector')}
 WaveRewardFx={new=function()return{pos={},anchor={},size={y=0}}end}
 for i=1,20 do local name=debug.getupvalue(gotGold,i);if not name then break end;local value=assert(guiBindings[name],name);debug.setupvalue(gotGold,i,value)end
 require('hump.signal').register('got-gold',gotGold)
end
store.level=assert(LU.load_level(store,store.level_name))
local runtimeResources
if runtimePhase then
 runtimeResources=dofile('scripts/native_runtime_resources.lua')(store.level,slot)
 for _,name in ipairs({'A','I','EXO'})do bindings[name]=runtimeResources[name]end
 game.store=store;game.simulation=sim
end
for i=1,100 do local name=debug.getupvalue(init,i);if not name then break end;assert(bindings[name]~=nil,name);debug.setupvalue(init,i,bindings[name])end
local probe={on_queue=function(_,entity,_,inserting)
 local event={kind=inserting and'queueInsert'or'queueRemove',id=entity.id,template=entity.template_name}
 if runtimePhase and not inserting and entity.id==4638 and store.tick==7063 then print(debug.traceback('MOD_REMOVE_TRACE'));print('MOD_SPRITE '..J.encode(entity.render.sprites[1]))end
 if runtimePhase and entity.modifier then event.target=entity.modifier.target_id end
 if runtimePhase and entity.bullet then event.holder=activeTower and activeTower.tower.holder_id;event.from=table.deepclone(entity.bullet.from);event.to=table.deepclone(entity.bullet.to);event.target=entity.bullet.target_id end
 record(event)
end}
local callbackEvents,systemOrder={},{}
if insertionPhase then
 local source=assert(io.open('analysis/game-system-order.json'));local data=J.decode(source:read('*a'));source:close()
 for index=1,24 do
  local name=data.slots[tostring(index)]
  if index==5 then name=require('klove.sso')and'sso'or''end
  if index==14 then name=GS.power_xp_tracking_system and'power_xp_tracking'or''end
  systemOrder[#systemOrder+1]=name
 end
 systemOrder[#systemOrder+1]=require('klove.sso')and'sso_post'or''
 if runtimePhase then
  for _,name in ipairs(systemOrder)do local system=systems[name];if system and system.on_update then
   local original=system.on_update;system.on_update=function(self,dt,time,s)activeUpdate=name;local result=original(self,dt,time,s);activeUpdate=nil;return result end
  end end
 end
 local insertionStack,removalStack={},{}
 if runtimePhase then
  for _,spec in ipairs({{method='insert_entity',kind='insert',stack=insertionStack},{method='remove_entity',kind='remove',stack=removalStack}})do
   local original=sim[spec.method]
   sim[spec.method]=function(self,entity)
    local context={rejected=false};spec.stack[#spec.stack+1]=context
    local result=original(self,entity);table.remove(spec.stack)
    record({kind=spec.kind..(context.rejected and'Rejected'or''),id=entity.id,template=entity.template_name})
    return result
   end
  end
  for _,name in ipairs(systemOrder)do local system=systems[name];if system and system.on_remove then
   local original=system.on_remove;system.on_remove=function(self,entity,s)
    local result=original(self,entity,s);if(result==false or result==nil)and removalStack[#removalStack]then removalStack[#removalStack].rejected=true end;return result
   end
  end end
 end
 for _,name in ipairs(systemOrder)do local system=systems[name];if system and system.on_insert then
  local original=system.on_insert
  system.on_insert=function(self,entity,s)
   activeInsert={system=name,id=entity.id,template=entity.template_name}
   local result=original(self,entity,s)
   if runtimePhase and(result==false or result==nil)and insertionStack[#insertionStack]then insertionStack[#insertionStack].rejected=true end
   callbackEvents[#callbackEvents+1]={system=name,id=entity.id,template=entity.template_name,result=result==nil and'nil'or result}
   activeInsert=nil
   return result
  end
 end end
 systems.bootstrap_probe=probe;local order={'bootstrap_probe'};for _,name in ipairs(systemOrder)do order[#order+1]=name end
 E.last_id=123456
 phase='init'
 sim:init(store,systems,order,1/30)
 -- Isolate the first real insertion flush; do not claim the subsequent game
 -- update phases have run. Every registered insertion callback stays native.
 if not runtimePhase then sim.systems_on_update={}end
else
 sim:init(store,{probe=probe},{'probe'},1/30)
 -- A previous scene's allocator must never leak into this level.
 E.last_id=123456
 init({},store)
end
local pending={};for _,entity in ipairs(store.pending_inserts)do pending[#pending+1]={id=entity.id,template=entity.template_name}end
-- Deliberately a registry-only flush: no main/render/health insertion hooks.
-- Full game-system insertion side effects are a separate, still-open step.
local runtimeFrames={}
local function heroParticles(entity)
 if entity.template_name~='ps_bullet_zefira'and entity.template_name~='ps_power_rain_of_fire'then return nil end
 local c=entity.particle_system;local particles={}
 for _,p in ipairs(c.particles)do local f=p.f;particles[#particles+1]={at=p.ts,lifetime=p.lifetime,pos=table.clone(p.pos),rotation=p.r,frame=f.ss and f.ss.webName,alpha=f.alpha,scale=table.clone(f.scale),drawOrder=f.draw_order}end
 return {source=c.track_id,at=c.ts,emit=c.emit,emitTs=c.emit_ts,particles=particles}
end
local function archerParts(entity)
 if not entity.template_name:match('^tower_archers_')and not entity.template_name:match('^decal_archers_miss_')then return nil end
 local parts={};for _,s in ipairs(entity.render.sprites)do parts[#parts+1]={name=s.name,ts=s.ts,loop=s.loop,flip=s.flip_x,hidden=s.hidden,alpha=s.alpha,frame=s.frame_idx,runs=s.runs}end;return parts
end
local function snapshotRuntime()
 local entities,inserts,removals={},{},{}
 for key,entity in pairs(store.entities)do entities[#entities+1]={key=key,id=entity.id,template=entity.template_name,archerParts=archerParts(entity),archer=entity.tower_ref and {tower=entity.tower_ref.id,sid=entity.shooter_sid,shooter=entity.shooter_id,idleTs=entity.idle_ts,shoot=entity.shoot,predPos=entity.pred_pos and table.clone(entity.pred_pos),target=entity.trigger_enemy and entity.trigger_enemy.id},gems=entity.enemy and entity.enemy.gems,particles=heroParticles(entity),idleState=entity.idle_flip and {ts=entity.idle_flip.ts,counter=entity.idle_flip.ts_counter,animation=entity.idle_flip.last_animation},flipX=entity.idle_flip and entity.render.sprites[1].flip_x,ambientFrame=(entity.template_name:find('sheep')or entity.template_name=='decal_stage_03_cow')and entity.render.sprites[1].frame_idx,soldierInfo=entity.soldier and entity.info and entity.info.i18n_key,meleeFx=(entity.template_name=='fx_zefira_hit'or entity.template_name=='fx_gerald_hit')and {frame=entity.render.sprites[1].frame_idx,runs=entity.render.sprites[1].runs},holder=entity.tower and entity.tower.holder_id,hp=entity.health and entity.health.hp,vis=entity.vis and table.clone(entity.vis),immune=entity.health and entity.health.immune_to,ignoreDamage=entity.health and entity.health.ignore_damage,stunCount=entity.unit and entity.unit.stun_count,stunned=entity.unit and not not entity.unit.is_stunned,armor=entity.health and entity.health.armor,magicArmor=entity.health and entity.health.magic_armor,pos=entity.pos and table.clone(entity.pos),hero=entity.hero and{xp=entity.hero.xp,level=entity.hero.level},heroAttacks=entity.template_name=='hero_gerald' and entity.timed_attacks and {a=entity.timed_attacks.list[1].ts,b=entity.timed_attacks.list[2].ts},node=entity.nav_path and table.clone(entity.nav_path),blockers=entity.enemy and table.clone(entity.enemy.blockers),target=entity.soldier and entity.soldier.target_id,rally=entity.nav_rally and table.clone(entity.nav_rally.center),motion=entity.motion and table.clone(entity.motion.speed),animation=entity.render and entity.render.sprites[1]and entity.render.sprites[1].name,auraTs=entity.aura and entity.aura.ts,auraDuration=entity.aura and entity.aura.duration,modifierTs=entity.modifier and entity.modifier.ts,modifierTarget=entity.modifier and entity.modifier.target_id,modifierDuration=entity.modifier and entity.modifier.duration,towerFactor=entity.tower and entity.tower.damage_factor,spriteLoop=entity.render and entity.render.sprites[1]and entity.render.sprites[1].loop,spriteFrame=entity.render and entity.render.sprites[1]and entity.render.sprites[1].frame_idx,spriteRuns=entity.render and entity.render.sprites[1]and entity.render.sprites[1].runs,spriteTs=entity.render and entity.render.sprites[1]and entity.render.sprites[1].ts,spriteOffset=entity.render and entity.render.sprites[1]and entity.render.sprites[1].offset and table.clone(entity.render.sprites[1].offset),spriteFlip=entity.render and entity.render.sprites[1]and entity.render.sprites[1].flip_x,spriteAlpha=entity.render and entity.render.sprites[1]and entity.render.sprites[1].alpha,spriteScale=entity.render and entity.render.sprites[1]and entity.render.sprites[1].scale and table.clone(entity.render.sprites[1].scale),death=entity.enemy and entity.health and{dead=entity.health.dead,at=entity.health.death_ts,finished=entity.health.death_finished_ts,ignoreDelete=entity.health.ignore_delete_after,types=entity.health.last_damage_types,alpha=entity.render.sprites[1].alpha,flip=entity.render.sprites[1].flip_x},bullet=type(entity.bullet)=='table'and{ts=entity.bullet.ts,speed=entity.bullet.speed and table.clone(entity.bullet.speed),hidden=entity.render.sprites[1].hidden,target=entity.bullet.target_id,to=table.deepclone(entity.bullet.to),from=table.deepclone(entity.bullet.from)},velocity=entity.force_motion and table.clone(entity.force_motion.v),hiddenCount=entity.render and entity.render.sprites[1]and entity.render.sprites[1].hidden_count,rotation=entity.render and entity.render.sprites[1]and entity.render.sprites[1].r}end
 for _,entity in ipairs(store.pending_inserts)do inserts[#inserts+1]=entity.id end
 for _,entity in ipairs(store.pending_removals)do removals[#removals+1]=entity.id end
 runtimeFrames[#runtimeFrames+1]={tick=store.tick,at=store.tick_ts,nextId=E.last_id,count=store.entity_count,max=store.entity_max,gold=store.player_gold,gems=store.gems_collected,lives=store.lives,wave=store.wave_group_number,outcome=store.game_outcome,paused=store.paused,eventBoundary=#events,randomBoundary=#randomDraws,entities=entities,inserts=inserts,removals=removals}
end
phase='flush';sim:do_tick()
if runtimePhase then
 snapshotRuntime()
 local input={};if arg[7]then local file=assert(io.open(arg[7]));input=J.decode(file:read('*a'));file:close()end
 for tick=2,tonumber(arg[6])or 30 do
  if store.paused then break end
  for _,command in ipairs(input)do if command.tick==tick then
   if command.kind=='send_wave'then store.send_next_wave=true
   elseif command.kind=='power'then
    local names={reinforcements='power_reinforcements_control',rain_of_fire='power_rain_of_fire_control',royal_edict='power_royal_edict_control'}
    local e=E:create_entity(assert(names[command.power]));e.pos=table.clone(command.pos);sim:queue_insert_entity(e)
   elseif command.kind=='hero-rally'then
    local hero;for _,e in pairs(store.entities)do if e.template_name==command.name then hero=e;break end end;assert(hero,'Missing input hero')
    local move=assert(loadfile('analysis/function-bytecode/game_gui_line5113.lua'));debug.setupvalue(move,1,require('klua.vector'));move(hero,command.pos.x,command.pos.y,0,nil)
   elseif command.kind=='rally'then
    local tower;for _,e in pairs(store.entities)do if e.tower and e.tower.holder_id==command.holder then tower=e;break end end;assert(tower and tower.barrack,'Missing input barracks');tower.barrack.rally_pos=table.clone(command.pos);tower.barrack.rally_new=true
   elseif command.kind=='upgrade'then
    local target;for _,entity in pairs(store.entities)do if entity.tower and entity.tower.holder_id==command.holder then target=entity;break end end
    assert(target and not target.tower_holder,'Missing upgrade tower '..command.holder);local nextTemplate=assert(E:get_template(command.tower));assert(nextTemplate.tower.type==target.tower.type and nextTemplate.tower.level==target.tower.level+1,'Invalid upgrade target');assert(store.player_gold>=nextTemplate.tower.price,'Unaffordable upgrade at tick '..tick);target.tower.upgrade_to=command.tower
   elseif command.kind=='build'then
    local target;for _,entity in pairs(store.entities)do if entity.tower and entity.tower.holder_id==command.holder then target=entity;break end end
    assert(target,'Missing scripted build holder '..command.holder);local name='tower_build_'..command.tower;local price=assert(E:get_template('tower_'..command.tower..'_lvl1').tower.price);assert(store.player_gold>=price,'Unaffordable scripted build at tick '..tick..': '..store.player_gold..' < '..price);target.tower.upgrade_to=name
   else error('Unknown runtime input '..tostring(command.kind))end
  end end
  sim:do_tick();snapshotRuntime()
 end
end
local queueOnlyFlush={};for id,entity in pairs(store.entities)do queueOnlyFlush[#queueOnlyFlush+1]={id=id,template=entity.template_name}end
local persistentLists
if insertionPhase then
 persistentLists={};for name,list in pairs(require('klove.sso').persistent_lists)do local ids={};for id in pairs(list)do ids[#ids+1]=id end;persistentLists[name]=ids end
end
local path=string.format('analysis/level-entity-bootstrap-%d-%s-%s.json',stage,mode,profile)
if variant~='normal'then path=path:gsub('%.json$','-'..variant..'.json')end
if insertionPhase then path=path:gsub('%.json$','-insertion.json')end
if runtimePhase then path=path:gsub('%-insertion%.json$','-runtime.json')end
if runtimePhase and arg[8]=='constant'then path=path:gsub('%.json$','-constant.json')end
if runtimePhase and arg[8]=='sequence'then path=path:gsub('%.json$','-sequence.json')end
if runtimePhase and arg[8]=='lcg104'then path=path:gsub('%.json$','-lcg104.json')end
local result={runtime=jit.version,stage=stage,mode=mode,profile=profile,variant=variant,events=events,pending=pending,queueOnlyFlush=not insertionPhase and queueOnlyFlush or nil,insertedEntities=insertionPhase and queueOnlyFlush or nil,nextId=E.last_id,count=store.entity_count,max=store.entity_max,gold=store.player_gold,lives=store.lives,team=store.selected_team,manualHeroInsertion=store.level.manual_hero_insertion or false,insertionPhase=insertionPhase,systemOrder=systemOrder,callbackEvents=callbackEvents,randomDraws=randomDraws,cloneEvents=cloneEvents,persistentLists=persistentLists}
if runtimePhase then result.profileOverrides=runtimeProfile;result.damageTrace=damageTrace;result.frames=runtimeFrames;result.acquisitions=acquisitions;result.difficulty=store.level_difficulty;result.randomMode=arg[8]=='lcg104'and'lcg104'or arg[8]=='sequence'and'sequence-v1'or arg[8]=='constant'and'constant-half'or'native-seed1234';result.playerLevel=store.player_level;result.resources={groups=runtimeResources.groups,missing=runtimeResources.missing,missingAnimations=runtimeResources.A.missing_animations};result.saveRequests=saveRequests end
if runtimePhase then
 local function precise(value)
  if type(value)=='number'and(value~=math.floor(value)or value==0 and 1/value<0)then return'@f64:'..string.format('%.17g',value)
  elseif type(value)=='table'then local out={};for k,v in pairs(value)do out[k]=precise(v)end;return out end
  return value
 end
 result=precise(result);result.format='float64-tagged'
end
local f=assert(io.open(path,'w'));f:write(J.encode(result));f:close()
f=assert(io.open(path:gsub('%.json$','-templates.json'),'w'));f:write(J.encode(templateDefaults));f:close()
print(path..': '..#events..' events, next ID '..E.last_id)
