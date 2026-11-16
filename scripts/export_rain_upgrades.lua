EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,P,G,A=require('entity_db'),require('dkjson'),require('path_db'),require('grid_db'),require('klove.animation_db')
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local o={};for k,a in pairs(v)do o[k]=clean(a)end;return o end
local templates,animations={},{}
for name,e in pairs(E.entities)do if name:find('rain_of_fire')then templates[name]=clean(e)end end
for file in io.popen('find reference/apk/assets/gc64/kr6/data/animations/go_power_rain_of_fire -name "*.lua"'):lines()do for name,a in pairs(dofile(file))do animations[name]=a end end
local function write(path,value)local f=assert(io.open(path,'w'));f:write(J.encode(value));f:close()end
write('public/data/rain-of-fire.json',{templates=templates,animations=animations})
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local oldRandom,oldCell=math.random,G.cell_type;local oldSound=require('sound_db').queue;require('sound_db').queue=function()end;local controlRows={}
for stage=1,3 do local level=string.format('level%02d',stage);G:load(level);P:load(level,{left=-512/3,right=1024+512/3,bottom=0,top=768})
for _,roll in ipairs({0,.5,.999})do for _,upgraded in ipairs({false,true})do for _,birth in ipairs({0,2.1})do
 local control=E:create_entity('power_rain_of_fire_control');control.pos={x=550,y=315};control.upgrade_cataclysm=upgraded;if upgraded then control.meteor_count=5 end
 local store,events={tick_ts=birth,tick_length=1/30,entities={},visible_coords={top=768}},{}
 math.random=function(a,b)if not a then return roll end;if not b then b=a;a=1 end;return math.floor(a)+math.floor(roll*(math.floor(b)-math.floor(a)+1))end
 simulation={queue_insert_entity=function(_,e)events[#events+1]={at=store.tick_ts,to=table.deepclone(e.bullet.to),from=table.deepclone(e.bullet.from),level=e.bullet.level}end,queue_remove_entity=function()end}
 local co=coroutine.create(control.main_script.update)
 for frame=0,90 do store.tick_ts=birth+frame*(1/30);local ok,err=coroutine.resume(co,control,store);assert(ok,err);if coroutine.status(co)=='dead'then break end end
 assert(coroutine.status(co)=='dead');controlRows[#controlRows+1]={stage=stage,roll=roll,upgraded=upgraded,birth=birth,events=events,removedAt=store.tick_ts}
end end end end
math.random=oldRandom
local impactRows={};local patches=J.decode(assert(io.open('analysis/power-upgrade-patch-oracle.json')):read('*a'))
for _,row in ipairs(patches)do if row.kind=='rain_of_fire'then for _,water in ipairs({false,true})do
 local e=E:create_entity('bullet_power_rain_of_fire');for k,v in pairs(row.templates.bullet_power_rain_of_fire)do if k~='main_script'then e[k]=table.deepclone(v)end end;e.pos={x=500,y=350};e.bullet.to={x=500,y=350}
 local store,events={tick_ts=0,tick_length=1/30,entities={},damage_queue={}},{}
 simulation={queue_insert_entity=function(_,v)events[#events+1]=v.template_name end,queue_remove_entity=function()end};G.cell_type=function()return water and TERRAIN_WATER or TERRAIN_LAND end
 local co=coroutine.create(e.main_script.update);local ok,err=coroutine.resume(co,e,store);assert(ok,err);assert(coroutine.status(co)=='dead');impactRows[#impactRows+1]={selected=row.selected,water=water,events=events}
end end end
G.cell_type=oldCell
local extraRows={}
for _,birth in ipairs({0,2.1})do
 local extra=E:create_entity('decal_power_rain_of_fire_extra_explosion');extra.pos={x=500,y=350};local store,ids={tick_ts=birth,tick_length=1/30,entities={},damage_queue={}},{}
 for index,offset in ipairs({{0,0},{30,0},{60,0},{60.01,0},{0,42},{0,41.99},{20,0,air=true},{20,0,boss=true},{20,0,immune=true}})do local e=E:create_entity('enemy_bandit');e.pos={x=500+offset[1],y=350+offset[2]};e.health.hp=5000;e.nav_path.pi=1;e.nav_path.spi=1;e.nav_path.ni=100;e.id=index;ids[e.id]=index;if offset.air then e.vis.flags=bit.bor(e.vis.flags,128)end;if offset.boss then e.vis.flags=bit.bor(e.vis.flags,32)end;if offset.immune then e.vis.bans=8 end;store.entities[e.id]=e end
 simulation={queue_insert_entity=function()end,queue_remove_entity=function()end};local co=coroutine.create(extra.main_script.update);local events={}
 for frame=0,90 do store.tick_ts=birth+frame*(1/30);local sprite=extra.render.sprites[1];local animation=animations[sprite.prefix..'_'..sprite.name];if animation then local _,runs=A:fni(animation,store.tick_ts-sprite.ts,sprite.loop,sprite.fps,store.tick_length);sprite.runs=runs end;local ok,err=coroutine.resume(co,extra,store);assert(ok,err);for _,damage in ipairs(store.damage_queue)do events[#events+1]={at=store.tick_ts,target=damage.target_id,value=damage.value}end;store.damage_queue={};if coroutine.status(co)=='dead'then break end end
 assert(#events>0,"native extra explosion must hit");extraRows[#extraRows+1]={birth=birth,events=events,removedAt=store.tick_ts}
end
require('sound_db').queue=oldSound
write('analysis/rain-control-oracle.json',controlRows);write('analysis/rain-impact-oracle.json',impactRows);write('analysis/rain-extra-oracle.json',extraRows)
print(#controlRows..' native rain controllers, '..#impactRows..' impact upgrade branches and '..#extraRows..' distance-falloff explosions exported')

local sim,systems=require('klove.simulation'),require('systems');local previousSimulation=simulation;simulation=sim
local qInsert,qRemove=sim.queue_insert_entity,sim.queue_remove_entity;local areaRows={}
for _,birth in ipairs({0,19})do for _,upgraded in ipairs({false,true})do for _,mode in ipairs({'normal','move','return','immune','death','overlap'})do
 local store={};sim:init(store,systems,{'mod_lifecycle','main_script','health','tween'},1/30)
 for tick=1,birth do sim:do_tick()end
 local enemy=E:create_entity('enemy_bandit');enemy.main_script=nil;enemy.pos={x=500,y=350};enemy.health.hp=5000;enemy.health.hp_max=5000;enemy.motion.max_speed=60
 local events,removed={},{};sim.queue_insert_entity=function(self,e)if e.modifier then events[#events+1]={at=store.tick_ts,name=e.template_name}end;qInsert(self,e)end;sim.queue_remove_entity=function(self,e)removed[e.id]=true;qRemove(self,e)end
 sim:queue_insert_entity(enemy)
 local function area(name)local e=E:create_entity(name);e.pos={x=500,y=350};if upgraded then e.aura.duration=e.aura.duration+4 end;sim:queue_insert_entity(e);return e end
 local burn=area('aura_bullet_power_rain_of_fire_dmg');local slow=area('aura_bullet_power_rain_of_fire_slow')
 local scorch=E:create_entity('decal_power_rain_of_fire_scorch');scorch.pos={x=500,y=350};scorch.render.sprites[1].ts=store.tick_ts;if upgraded then scorch.duration=scorch.duration+4 end;sim:queue_insert_entity(scorch)
 local originalBurn=E.entities.mod_bullet_power_rain_of_fire_burn;E.entities.mod_bullet_power_rain_of_fire_burn=table.deepclone(originalBurn);if upgraded then E.entities.mod_bullet_power_rain_of_fire_burn.dps.damage_inc=1.5 end
 math.random=function(a,b)if not a then return .5 end;if not b then b=a;a=1 end;return math.floor(a)+math.floor(.5*(math.floor(b)-math.floor(a)+1))end
 local frames={}
 for tick=1,450 do
  if mode=='move'then enemy.pos.x=tick>=31 and 900 or 500 end
  if mode=='return'then enemy.pos.x=tick>=31 and tick<61 and 900 or 500 end
  if mode=='immune'then enemy.vis.bans=tick<31 and 16388 or 0 end
  if mode=='death'and tick==31 then enemy.health.dead=true;enemy.health.hp=0 end
  if mode=='overlap'and tick==16 then area('aura_bullet_power_rain_of_fire_dmg');area('aura_bullet_power_rain_of_fire_slow')end
  sim:do_tick();assert(not store.entities[burn.id]or burn.main_script.co or removed[burn.id],'native burn aura coroutine failed');assert(not store.entities[slow.id]or slow.main_script.co or removed[slow.id],'native slow aura coroutine failed')
  local active={};for _,e in pairs(store.entities)do if e.modifier then active[#active+1]={name=e.template_name,at=e.modifier.ts,dpsTs=e.dps and e.dps.ts,alpha=e.render and e.render.sprites[1].alpha,reverse=e.tween and e.tween.reverse,pending=e.pending_removal or false}end end
  frames[#frames+1]={at=store.tick_ts,hp=enemy.health.hp,speed=enemy.motion.max_speed,active=active,scorch={visible=store.entities[scorch.id]~=nil,alpha=scorch.render.sprites[1].alpha,spriteAt=scorch.render.sprites[1].ts,fadeAt=not scorch.tween.disabled and scorch.tween.ts or nil,pending=scorch.pending_removal or false}}
 end
 areaRows[#areaRows+1]={birth=birth,upgraded=upgraded,mode=mode,events=events,frames=frames};E.entities.mod_bullet_power_rain_of_fire_burn=originalBurn;sim.queue_insert_entity,sim.queue_remove_entity=qInsert,qRemove
end end end
math.random=oldRandom;simulation=previousSimulation
write('analysis/rain-area-oracle.json',areaRows);print(#areaRows..' original rain burn/slow modifier simulation traces exported')
