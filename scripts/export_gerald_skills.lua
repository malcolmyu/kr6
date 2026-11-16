EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson')
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local t={};for k,a in pairs(v)do t[k]=clean(a)end;return t end
local out={templates={},exos={}}
for _,name in ipairs({'mod_gerald_skill_a','mod_gerald_skill_b','decal_gerald_skill_a','fx_gerald_skill_a'})do out.templates[name]=clean(E:get_template(name))end
for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/go_hero_gerald -name "*.exo3"'):lines()do local e=dofile(file);local d={};for _,a in ipairs(e.animations)do d[a.name]=#a.frames/e.fps end;out.exos[file:match('([^/]+)%.exo3$')]=d end
local f=assert(io.open('analysis/gerald-skills-data.json','w'));f:write(J.encode(out));f:close()
local rows={}
for _,name in ipairs({'mod_gerald_skill_a','mod_gerald_skill_b'})do
 local unit=E:create_entity('hero_gerald');unit.health.armor=.05;unit.health.magic_armor=0;local mod=E:create_entity(name);mod.modifier.target_id=unit.id
 local store={tick_ts=0,tick_length=1/30,entities={[unit.id]=unit}};local removed=false
 simulation={queue_insert_entity=function()end,queue_remove_entity=function(_,entity)if entity.id==mod.id then removed=true end end}
 assert(mod.main_script.insert(mod,store));local co=coroutine.create(mod.main_script.update);local frames={};local sprite=mod.render.sprites[1];local durations=out.exos[sprite.prefix]
 for frame=0,400 do
  store.tick_ts=frame/30
  if durations[sprite.name]then sprite.runs=math.floor((store.tick_ts-sprite.ts)/durations[sprite.name]+1e-9)end
  if coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,mod,store);assert(ok,err)end
  local fade=mod.tween and not mod.tween.disabled and store.tick_ts-mod.tween.ts>=1
  if removed or fade then mod.main_script.remove(mod,store)end
  frames[#frames+1]={time=store.tick_ts,animation=sprite.name,ts=sprite.ts,armor=unit.health.armor,magic=unit.health.magic_armor,spiked=unit.health.spiked_armor or 0,fade=mod.tween and not mod.tween.disabled or false,done=removed or fade or false}
  if removed or fade then break end
 end
 rows[#rows+1]={name=name,frames=frames}
end
f=assert(io.open('analysis/gerald-buffs-oracle.json','w'));f:write(J.encode(rows));f:close()
