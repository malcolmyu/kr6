EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local oldSimulation=simulation;local E,J,U=require('entity_db'),require('dkjson'),require('utils');local systems=require('systems');local sim=require('klove.simulation');simulation=sim;local S,P=require('sound_db'),require('path_db')
local oldRandom,oldSound,oldNode,oldFind=math.random,S.queue,P.is_node_valid,U.find_foremost_enemy
math.random=function(a,b)return a or .5 end;P.is_node_valid=function()return true end;U.find_foremost_enemy=function()return nil end
local art=J.decode(assert(io.open('public/data/towers-art.json')):read('*a'));local durations={};for name,exo in pairs(art.exos)do durations[name]={};for _,a in ipairs(exo.animations)do durations[name][a.name]=#a.frames/exo.fps end end
local A=require('klove.animation_db')
local cases={};for _,birth in ipairs({0,19})do for level=1,3 do cases[#cases+1]={name='level'..level..'-birth'..birth,birth=birth,level=level,frames=1000,events={}}end end
cases[#cases+1]={name='preview-purchase-and-upgrade',birth=0,level=0,frames=1050,events={{tick=1,preview=true},{tick=16,preview=false},{tick=31,power=1},{tick=50,power=3},{tick=151,upgrade=true},{tick=301,sell='source'}}}
cases[#cases+1]={name='enemy-retry',birth=0,level=1,noEnemy=true,frames=450,events={{tick=111,enemy=true}}}
cases[#cases+1]={name='tower-retry',birth=0,level=1,noTargets=true,frames=650,events={{tick=181,newTower=true}}}
cases[#cases+1]={name='blocked-and-late-purchase',birth=0,level=0,frames=550,events={{tick=1,blocked=true},{tick=31,power=1},{tick=91,blocked=false}}}
cases[#cases+1]={name='cast-through-block',birth=0,level=1,frames=500,events={{tick=10,blocked=true},{tick=111,blocked=false}}}
cases[#cases+1]={name='target-upgrade-during-windup',birth=0,level=1,frames=420,events={{tick=20,upgrade=true}}}
cases[#cases+1]={name='existing-factor-and-source-sale',birth=0,level=2,initialFactor=1.75,frames=550,events={{tick=101,sell='source'}}}
for _,level in ipairs({1,3})do cases[#cases+1]={name='overlap-level'..level,birth=0,level=1,secondLevel=level,frames=650,events=level==1 and{{tick=91,secondPower=1}}or{{tick=91,secondPower=1},{tick=96,secondPower=3}}}end
for _,level in ipairs({1,3})do cases[#cases+1]={name='fade-overlap-level'..level,birth=0,level=1,secondLevel=level,frames=650,events=level==1 and{{tick=247,secondPower=1}}or{{tick=247,secondPower=1},{tick=252,secondPower=3}}}end
cases[#cases+1]={name='basic-and-empower',birth=0,level=1,basic=true,frames=1200,events={}}
cases[#cases+1]={name='purchase-during-basic-and-upgrade-during-buff',birth=19,level=0,basic=true,frames=1200,events={{tick=15,power=1},{tick=101,power=3}}}
cases[#cases+1]={name='extended-source-range',birth=0,level=1,initialRangeFactor=1.35,frames=450,events={}}
cases[#cases+1]={name='enemy-at-300-boundary',birth=0,level=1,enemyX=800,enemyY=362,frames=450,events={}}
cases[#cases+1]={name='enemy-outside-300-boundary',birth=0,level=1,enemyX=800.001,enemyY=362,frames=450,events={}}
cases[#cases+1]={name='airborne-enemy-triggers-buff',birth=0,level=1,enemyName='enemy_crow',frames=450,events={}}
cases[#cases+1]={name='overlap-upgrade-during-windup',birth=0,level=1,secondLevel=3,frames=650,events={{tick=91,secondPower=1},{tick=96,secondPower=3},{tick=110,upgrade=true}}}
cases[#cases+1]={name='stronger-first-lower-second',birth=0,level=0,secondLevel=1,frames=650,events={{tick=1,power=1},{tick=3,power=3},{tick=91,secondPower=1}}}
for _,fireLevel in ipairs({1,3})do cases[#cases+1]={name='firebook-and-buff-'..fireLevel,birth=0,level=1,fireLevel=fireLevel,basic=true,frames=1100,events={}}end
local qInsert,qRemove=sim.queue_insert_entity,sim.queue_remove_entity;local output={}
for _,case in ipairs(cases)do
 local store={wave_group_number=1};sim:init(store,systems,{'mod_lifecycle','main_script','timed','tween'},1/30)
 local known,ids,queued,removed,sounds={},{},{},{},{};local nextEffect=0
 sim.queue_insert_entity=function(self,e)
  if not e.webKey then nextEffect=nextEffect+1;e.webKey='effect'..nextEffect end;ids[e.id]=e.webKey;e.webQueuedAt=store.tick_ts
  queued[#queued+1]={at=store.tick_ts,key=e.webKey,name=e.template_name,source=e.modifier and ids[e.modifier.source_id],target=e.modifier and ids[e.modifier.target_id],level=e.modifier and e.modifier.level,factor=e.damage_factor,duration=e.modifier and e.modifier.duration or e.duration,pos=table.deepclone(e.pos)};if not e.template_name:match('^bolt_tower_wizard')and e.template_name~='bullet_firebook_wizard'then qInsert(self,e)end
 end
 sim.queue_remove_entity=function(self,e)removed[#removed+1]={at=store.tick_ts,key=e.webKey,name=e.template_name};qRemove(self,e)end
 S.queue=function(_,name)sounds[#sounds+1]={at=store.tick_ts,name=name}end
 local function add(key,name,x,y,active)
  local e=E:create_entity(name);e.webKey=key;e.pos={x=x,y=y};ids[e.id]=key;known[key]=e;if not active then e.main_script=nil end;if e.tower and case.initialFactor then e.tower.damage_factor=case.initialFactor end;sim:queue_insert_entity(e);return e
 end
 for i=1,case.birth do sim:do_tick()end
 local second;if case.secondLevel then second=add('second','tower_wizard_lvl4',550,350,true)end
 local source=add('source','tower_wizard_lvl4',500,350,true);if case.initialRangeFactor then source.attacks.range=source.attacks.range*case.initialRangeFactor end;if case.fireLevel then source.powers.skill_a.level=case.fireLevel;source.powers.skill_a.changed=true end;source.powers.skill_b.level=case.level;source.powers.skill_b.changed=case.level>0
 if not case.noTargets then
  add('archers','tower_archers_lvl1',600,350);add('knights','tower_knights_lvl1',550,400);add('wizard','tower_wizard_lvl1',650,350);add('culverine','tower_culverine_lvl1',500,440);add('edge','tower_catapult_lvl1',695,362);add('far','tower_wizard_lvl1',800,350);add('extended','tower_archers_lvl1',750,362);add('holder','tower_holder_terrain_1_1',450,350)
  add('blocked','tower_wizard_lvl1',480,350).tower.blocked=true;add('unmodifiable','tower_wizard_lvl1',490,350).tower.can_be_mod=false;add('immune','tower_archers_lvl1',500,300).vis.bans=4100
 end
 if not case.noEnemy then local e=add('enemy',case.enemyName or'enemy_bandit',case.enemyX or(case.basic and 600 or 750),case.enemyY or 350);e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100 end
 U.find_foremost_enemy=function()if case.basic and known.enemy then return known.enemy,{known.enemy},table.deepclone(known.enemy.pos)end end
 local frames={}
 for tick=1,case.frames do
  for _,action in ipairs(case.events)do if action.tick==tick then
   if action.secondPower then second.powers.skill_b.level=action.secondPower;second.powers.skill_b.changed=true end
   if action.power then source.powers.skill_b.level=action.power;source.powers.skill_b.changed=true;source.ui.args=nil;source.ui.hover_active=false end
   if action.preview~=nil then source.ui.args=action.preview and'skill_b'or nil;source.ui.hover_active=action.preview end
   if action.blocked~=nil then source.tower.blocked=action.blocked end
   if action.sell then sim:queue_remove_entity(known[action.sell]);known[action.sell]=nil end
   if action.newTower then add('new','tower_archers_lvl1',600,350)end
   if action.enemy then local e=add('enemy',case.enemyName or'enemy_bandit',case.enemyX or(case.basic and 600 or 750),case.enemyY or 350);e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100 end
   if action.upgrade then local old=known.wizard;local new=E:create_entity('tower_wizard_lvl2');new.pos=old.pos;new.main_script=nil;new.webKey='wizard';ids[new.id]='wizard';for _,e in pairs(store.entities)do if e.modifier and e.modifier.target_id==old.id then e.modifier.target_id=new.id end end;sim:queue_remove_entity(old);sim:queue_insert_entity(new);known.wizard=new end
  end end
  for _,e in pairs(store.entities)do for _,s in ipairs(e.render and e.render.sprites or{})do local d=durations[s.prefix or'']and durations[s.prefix][s.name];if d then local def=art.exos[s.prefix];local count=math.floor(d*def.fps+.5);local _,runs=A:fni({prefix=s.prefix..'_'..s.name,from=1,to=count},store.tick*store.tick_length-s.ts,s.loop,s.fps or def.fps,store.tick_length);s.runs=runs end end end
  sim:do_tick();assert(not known.source or source.main_script.co,'native source coroutine failed');assert(not second or second.main_script.co,'native second coroutine failed');local row={at=store.tick_ts,factors={},effects={},parts={},attackTs=source.attacks.list[1].ts,buffTs=source.attacks.list[3].ts,loading=source._loading,bobTime=source.time,secondParts=second and table.deepclone(second.render.sprites),secondAttackTs=second and second.attacks.list[1].ts,secondBuffTs=second and second.attacks.list[3].ts}
  for key,e in pairs(known)do if e.tower then row.factors[key]=e.tower.damage_factor end end
  for _,s in ipairs(source.render.sprites)do row.parts[#row.parts+1]={name=s.name,ts=s.ts,flip=s.flip_x,loop=s.loop,offset=table.deepclone(s.offset)}end
  for _,e in pairs(store.entities)do if e.template_name=='mod_wizard_skill_b'or e.template_name=='mod_wizard_skill_b_fx'or e.template_name=='decal_tower_wizard_skill_b'or e.template_name=='decal_tower_wizard_empowerment_preview'then local s=e.render and e.render.sprites[1];row.effects[#row.effects+1]={key=e.webKey,name=e.template_name,source=e.modifier and ids[e.modifier.source_id],target=e.modifier and ids[e.modifier.target_id],level=e.modifier and e.modifier.level,factor=e.damage_factor,duration=e.modifier and e.modifier.duration or e.duration,at=e.modifier and e.modifier.ts,queued=e.webQueuedAt,spriteAt=s and s.ts,alpha=s and s.alpha,tweenAt=e.tween and e.tween.ts,reverse=e.tween and e.tween.reverse,disabled=e.tween and e.tween.disabled,pos=table.deepclone(e.pos)}end end
  frames[#frames+1]=row
 end
 output[#output+1]={case=case,frames=frames,queued=queued,removed=removed,sounds=sounds};sim.queue_insert_entity,sim.queue_remove_entity=qInsert,qRemove
end
math.random,S.queue,P.is_node_valid,U.find_foremost_enemy=oldRandom,oldSound,oldNode,oldFind;simulation=oldSimulation
local f=assert(io.open('analysis/wizard-empower-oracle.json','w'));f:write(J.encode(output));f:close();print('Native wizard empowerment simulation exported: '..#output..' cases')
