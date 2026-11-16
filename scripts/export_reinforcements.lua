EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,U,A=require('entity_db'),require('dkjson'),require('utils'),require('klove.animation_db')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/all/script_utils.lua 1871')==0)
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local t={};for k,a in pairs(v)do t[k]=clean(a)end;return t end
local animations={};for file in io.popen('find reference/apk/assets/gc64/kr6/data/animations/go_power_reinforcements -name "*.lua"'):lines()do for name,a in pairs(dofile(file))do animations[name]=a end end
local out={templates={},animations=animations};for _,name in ipairs({'aura_power_reinforcement_special','mod_reinforcement_special_damage','mod_reinforcement_special_armor','decal_power_reinforcements_special'})do out.templates[name]=clean(E:get_template(name))end
local patchRows=J.decode(assert(io.open('analysis/power-upgrade-patch-oracle.json')):read('*a'));local spawnRows={}
local oldRandom=math.random
local baseSpecial=table.deepclone(E:get_template('soldier_reinforcement_special'))
for _,row in ipairs(patchRows)do if row.kind=='reinforcements'then for _,variants in ipairs({{1,2},{2,3},{3,1}})do
 local control=E:create_entity('power_reinforcements_control');control.pos={x=500,y=350};control.upgrade_special_unit=row.templates.power_reinforcements_control.upgrade_special_unit
 E.entities.re_current=table.deepclone(E:get_template('soldier_reinforcement_base'));for k,v in pairs(row.templates.soldier_reinforcement_base)do if k~='main_script'then E.entities.re_current[k]=table.deepclone(v)end end
 E.entities.soldier_reinforcement_special=table.deepclone(baseSpecial);for k,v in pairs(row.templates.soldier_reinforcement_special)do if k~='main_script'then E.entities.soldier_reinforcement_special[k]=table.deepclone(v)end end
 local index,spawned=0,{};math.random=function(lo,hi)index=index+1;return variants[index]end
 simulation={queue_insert_entity=function(_,e)spawned[#spawned+1]={name=e.template_name,prefix=e.render.sprites[1].prefix,pos=e.pos,center=e.nav_rally.center,rally=e.nav_rally.pos,squad=e.reinforcement.squad_id==control.id,hp=e.health.hp_max,duration=e.reinforcement.duration}end}
 assert(control.main_script.insert(control,{tick_ts=0}));spawnRows[#spawnRows+1]={selected=row.selected,variants=variants,spawned=spawned}
end end end
math.random=oldRandom;E.entities.re_current=nil;E.entities.soldier_reinforcement_special=baseSpecial
local attackRows={}
for _,start in ipairs({0,1/30,2.1})do for _,scenario in ipairs({'normal','target-dead','stunned','dead','rally'})do
 local soldier=E:create_entity('soldier_reinforcement_special');soldier.pos={x=500,y=350};soldier.health.hp=140;soldier.id=1;soldier.soldier.target_id=2
 local target=E:create_entity('enemy_bandit');target.id=2;target.pos={x=530,y=350};target.enemy.blockers={1};target.health.hp=5000
 local store,events={tick_ts=start,tick_length=1/30,entities={[1]=soldier,[2]=target}},{}
 local fn=assert(loadfile('analysis/function-bytecode/script_utils_line1871.lua'))
 local bindings={S={queue=function(_,name)if name then events[#events+1]={kind='sound',at=store.tick_ts,name=name}end end,stop=function()end},U=U,log={debug=function()end},V=require('klua.vector'),band=bit.band,E=E,queue_damage=function(_,d)events[#events+1]={kind='damage',at=store.tick_ts,value=d.value}end,queue_insert=function()end,signal={emit=function()end}}
 for i=1,30 do local name=debug.getupvalue(fn,i);if not name then break end;assert(bindings[name],name);debug.setupvalue(fn,i,bindings[name])end
 local co=coroutine.create(fn);local frames={};local attack=soldier.melee.attacks[1];math.random=function(lo,hi)return math.floor((lo+hi)/2)end
 for frame=0,120 do store.tick_ts=start+frame*(1/30)
  if frame==12 then if scenario=='target-dead'then target.health.dead=true elseif scenario=='stunned'then soldier.unit.is_stunned=true elseif scenario=='dead'then soldier.health.dead=true elseif scenario=='rally'then soldier.nav_rally.new=true end end
  local sprite=soldier.render.sprites[1];local animation=animations[sprite.prefix..'_'..sprite.name];if animation then local _,runs=A:fni(animation,store.tick_ts-sprite.ts,sprite.loop,sprite.fps,store.tick_length);sprite.runs=runs end
  local ok,result=coroutine.resume(co,store,soldier,target,attack);assert(ok,result)
  frames[#frames+1]={at=store.tick_ts,name=sprite.name,ts=sprite.ts,attackTs=attack.ts,done=coroutine.status(co)=='dead',result=result}
  if coroutine.status(co)=='dead'then break end
 end
 math.random=oldRandom;assert(coroutine.status(co)=='dead','attack did not finish');if scenario=='normal'then assert(#events==2 and events[2].kind=='damage','normal native attack must hit')end;attackRows[#attackRows+1]={start=start,scenario=scenario,frames=frames,events=events}
end end
local auraRows={}
for _,duration in ipairs({.2,5.2})do for _,scenario in ipairs({'normal','move','dead','removed'})do
 local source=E:create_entity('soldier_reinforcement_special');source.id=1;source.pos={x=500,y=350};source.health.hp=140
 local aura=E:create_entity('aura_power_reinforcement_special');aura.aura.source_id=1;aura.aura.duration=duration
 local store,targets={tick_ts=0,tick_length=1/30,entities={[1]=source}},{}
 for i,pos in ipairs({{500,350},{570,350},{570.01,350},{500,399},{500,399.01}})do local e=E:create_entity('soldier_reinforcement_base');e.id=i+10;e.pos={x=pos[1],y=pos[2]};e.health.hp=40;store.entities[e.id]=e;targets[e.id]=i end
 local events,removed={},false;simulation={queue_insert_entity=function(_,e)events[#events+1]={at=store.tick_ts,name=e.template_name,target=targets[e.modifier.target_id]or 0}end,queue_remove_entity=function(_,e)if e==aura then removed=true end end}
 assert(aura.main_script.insert(aura,store));local co=coroutine.create(aura.main_script.update)
 for frame=0,180 do store.tick_ts=frame*(1/30);if frame==3 then if scenario=='move'then source.pos.x=600 elseif scenario=='dead'then source.health.dead=true elseif scenario=='removed'then store.entities[1]=nil end end
  local ok,err=coroutine.resume(co,aura,store);assert(ok,err);if coroutine.status(co)=='dead'then break end
 end
 assert(removed,'aura did not expire');auraRows[#auraRows+1]={duration=duration,scenario=scenario,events=events,removedAt=store.tick_ts}
end end
local function write(path,data)local f=assert(io.open(path,'w'));f:write(J.encode(data));f:close()end
write('public/data/reinforcements.json',out);write('analysis/reinforcement-spawn-oracle.json',spawnRows);write('analysis/reinforcement-attack-oracle.json',attackRows);write('analysis/reinforcement-aura-oracle.json',auraRows)
print(#spawnRows..' native reinforcement squads, '..#attackRows..' loop-attack traces and '..#auraRows..' aura traces exported')
