EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local previousSimulation=simulation
local E,J=require('entity_db'),require('dkjson');local systems=require('systems');local sim=require('klove.simulation');simulation=sim;local S=require('sound_db');local P=require('path_db');local previousNode=P.is_node_valid;P.is_node_valid=function()return true end
local previousRandom,previousQueue=math.random,S.queue;math.random=function()return .5 end
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local durations={};for name,exo in pairs(art.exos)do durations[name]={};for _,a in ipairs(exo.animations)do durations[name][a.name]=#a.frames/exo.fps end end
local cases={}
for _,birth in ipairs({0,19})do for level=1,3 do cases[#cases+1]={name='level'..level..'-birth'..birth,birth=birth,startLevel=level,frames=250,events={}}end end
cases[#cases+1]={name='upgrade-and-sale',birth=0,startLevel=0,frames=720,events={{tick=1,preview=true},{tick=16,preview=false},{tick=31,power=1},{tick=151,power=2},{tick=271,power=3},{tick=331,upgrade='wizard'},{tick=451,newTower=true},{tick=601,sell='source'}}}
cases[#cases+1]={name='equal-source-owner-removal',birth=0,startLevel=1,secondLevel=1,frames=330,events={{tick=121,sell='source'},{tick=241,sell='second'}}}
cases[#cases+1]={name='stronger-source-owner-removal',birth=0,startLevel=1,secondLevel=3,frames=450,events={{tick=181,sell='second'},{tick=361,sell='source'}}}
cases[#cases+1]={name='blocked-purchase',birth=0,startLevel=0,frames=240,events={{tick=1,blocked=true},{tick=31,power=1},{tick=91,blocked=false}}}
cases[#cases+1]={name='idle-eagle-repeat',birth=0,startLevel=1,frames=900,events={}}
cases[#cases+1]={name='existing-range-factor',birth=0,startLevel=1,initialRangeFactor=1.2,frames=250,events={{tick=151,sell='source'}}}
local qInsert,qRemove=sim.queue_insert_entity,sim.queue_remove_entity
local output={}
for _,case in ipairs(cases)do
 local store={wave_group_number=1};sim:init(store,systems,{'mod_lifecycle','main_script','timed','tween'},1/30)
 local known,all,ids={}, {},{};local queued,removed,sounds={}, {},{};local entityCounter=0
 local function create(key,name,x,y,active)
  local entity=E:create_entity(name);entity.pos={x=x,y=y};entity.webKey=key;if case.initialRangeFactor and entity.attacks then entity.attacks.range=entity.attacks.range*case.initialRangeFactor end;if case.initialRangeFactor and entity.barrack then entity.barrack.rally_range=entity.barrack.rally_range*case.initialRangeFactor end;if not active then entity.main_script=nil end;known[key]=entity;all[key]=entity;ids[entity.id]=key;sim:queue_insert_entity(entity);return entity
 end
 sim.queue_insert_entity=function(self,e)
  if not e.webKey then entityCounter=entityCounter+1;e.webKey='effect'..entityCounter end;ids[e.id]=e.webKey
  e.webQueuedAt=store.tick_ts
  queued[#queued+1]={at=store.tick_ts,key=e.webKey,name=e.template_name,source=e.modifier and ids[e.modifier.source_id],target=e.modifier and ids[e.modifier.target_id],level=e.modifier and e.modifier.level,factor=e.range_factor,pos=e.pos and table.deepclone(e.pos)}
  qInsert(self,e)
 end
 sim.queue_remove_entity=function(self,e)removed[#removed+1]={at=store.tick_ts,key=e.webKey,name=e.template_name};qRemove(self,e)end
 S.queue=function(_,name)sounds[#sounds+1]={at=store.tick_ts,name=name}end
 for frame=1,case.birth do sim:do_tick()end
 local source=create('source','tower_archers_lvl4',500,350,true);source.powers.skill_b.level=case.startLevel;source.powers.skill_b.changed=case.startLevel>0
 if case.secondLevel then local second=create('second','tower_archers_lvl4',550,350,true);second.powers.skill_b.level=case.secondLevel;second.powers.skill_b.changed=true end
 create('wizard','tower_wizard_lvl1',600,350);create('archers','tower_archers_lvl1',500,450);create('knights','tower_knights_lvl1',550,350);create('culverine','tower_culverine_lvl1',650,350);create('edgeX','tower_wizard_lvl1',755,350);create('edgeY','tower_catapult_lvl1',500,535);create('far','tower_wizard_lvl1',850,350);create('holder','tower_holder_terrain_1_1',450,350)
 local fixed=create('unmodifiable','tower_wizard_lvl1',480,350);fixed.tower.can_be_mod=false
 local trace={}
 for relative=1,case.frames do
  for _,action in ipairs(case.events)do if action.tick==relative then
   if action.power then source.powers.skill_b.level=action.power;source.powers.skill_b.changed=true end
   if action.preview~=nil then source.ui.hover_active=action.preview;source.ui.args=action.preview and'skill_b'or nil end
   if action.blocked~=nil then source.tower.blocked=action.blocked end
   if action.sell then sim:queue_remove_entity(known[action.sell]);known[action.sell]=nil end
   if action.upgrade then local old=known[action.upgrade];local new=E:create_entity('tower_wizard_lvl2');new.pos=old.pos;new.webKey=action.upgrade;new.main_script=nil;ids[new.id]=new.webKey
    for _,e in pairs(store.entities)do if e.modifier and e.modifier.target_id==old.id then e.modifier.target_id=new.id end end
    sim:queue_remove_entity(old);sim:queue_insert_entity(new);known[action.upgrade]=new;all[action.upgrade]=new
   end
   if action.newTower then create('new','tower_wizard_lvl1',700,350)end
  end end
  -- Native rendering supplies completed animation runs; all logic/queue/tween/timed systems below are original.
  for _,e in pairs(store.entities)do for _,sprite in ipairs(e.render and e.render.sprites or{})do local duration=durations[sprite.prefix or'']and durations[sprite.prefix][sprite.name];if duration then sprite.runs=math.floor(math.max(0,(store.tick+1)*store.tick_length-sprite.ts)/duration)end end end
  sim:do_tick();assert(not known.source or source.main_script.co,'native archer source coroutine failed');assert(not known.second or known.second.main_script.co,'native archer second coroutine failed')
  local row={at=store.tick_ts,ranges={},mods={},previews={},eagles={}}
  for key,e in pairs(known)do row.ranges[key]=e.attacks and e.attacks.range or e.barrack and e.barrack.rally_range or 0 end
  for _,e in pairs(store.entities)do
   if e.template_name=='mod_archers_skill_b_range'then row.mods[#row.mods+1]={key=e.webKey,source=ids[e.modifier.source_id],target=ids[e.modifier.target_id],level=e.modifier.level,factor=e.range_factor,at=e.modifier.ts,tweenAt=e.tween.ts,sprites=table.deepclone(e.render.sprites)}
   elseif e.template_name=='decal_archers_skill_b_eagle'then row.eagles[#row.eagles+1]={key=e.webKey,queued=e.webQueuedAt,draw=e.render.sprites[1].draw_order,at=e.render.sprites[1].ts,pos=e.pos}
   elseif e.template_name=='decal_archers_skill_b_preview'then row.previews[#row.previews+1]={key=e.webKey,at=e.render.sprites[1].ts,alpha=e.render.sprites[1].alpha,offset=e.render.sprites[1].offset,pos=e.pos}end
  end
  table.sort(row.mods,function(a,b)return a.key<b.key end);table.sort(row.eagles,function(a,b)return a.key<b.key end);table.sort(row.previews,function(a,b)return a.key<b.key end);trace[#trace+1]=row
 end
 output[#output+1]={case=case,frames=trace,queued=queued,removed=removed,sounds=sounds}
 sim.queue_insert_entity,sim.queue_remove_entity=qInsert,qRemove
end
math.random,S.queue=previousRandom,previousQueue;simulation=previousSimulation;P.is_node_valid=previousNode
local f=assert(io.open('analysis/archers-range-oracle.json','w'));f:write(J.encode(output));f:close();print('Native original simulation/tower/modifier lifecycle, range insert/remove/upgrade, previews, eagles and source ownership exported: '..#output..' cases')
