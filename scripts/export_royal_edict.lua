EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local J=require('dkjson');local UP=require('upgrades');local out={templates={},upgrades={},exos={}}
local function clean(v)if type(v)=='function'then return nil elseif type(v)~='table'then return v end;local t={};for k,a in pairs(v)do t[k]=clean(a)end;return t end
for name,e in pairs(E.entities)do if name:find('royal_edict')then out.templates[name]=clean(e)end end
for name,u in pairs(UP.list)do if name:match('^power_royal_edict')then out.upgrades[name]=clean(u)end end
for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/go_power_royal_edict -name "*.exo3"'):lines()do local e=dofile(file);local durations={};for _,a in ipairs(e.animations)do durations[a.name]=#a.frames/e.fps end;out.exos[file:match('([^/]+)%.exo3$')]=durations end
local f=assert(io.open('public/data/royal-edict.json','w'));f:write(J.encode(out));f:close()
local rows={}
for _,global in ipairs({false,true})do
 local controller=E:create_entity('power_royal_edict_control');controller.pos={x=500,y=350};controller.is_global=global
 local entities,expected={},{}
 for _,case in ipairs({{0,0},{200,0},{201,0},{0,140},{0,141},{100,100},{-250,-200}})do local t=E:create_entity('tower_archers_lvl1');t.pos={x=500+case[1],y=350+case[2]};entities[t.id]=t;expected[t.id]=case end
 local blocked=E:create_entity('tower_archers_lvl1');blocked.pos={x=500,y=350};blocked.tower.blocked=true;entities[blocked.id]=blocked;expected[blocked.id]={0,0,blocked=true}
 local immutable=E:create_entity('tower_archers_lvl1');immutable.pos={x=500,y=350};immutable.tower.can_be_mod=false;entities[immutable.id]=immutable;expected[immutable.id]={0,0,immutable=true}
 local applied={};simulation={queue_insert_entity=function(_,e)applied[#applied+1]={offset=expected[e.modifier.target_id],name=e.template_name}end}
 assert(controller.main_script.insert(controller,{entities=entities,tick_ts=0}));rows[#rows+1]={global=global,applied=applied}
end
local tower=E:create_entity('tower_archers_lvl1');tower.pos={x=500,y=350}
local buff=E:create_entity('mod_power_royal_edict_towerbuff');buff.modifier.target_id=tower.id
local store={tick_ts=0,tick_length=1/30,entities={[tower.id]=tower}}
assert(buff.main_script.insert(buff,store))
local lifecycle={initialFactor=tower.tower.damage_factor,initialRange=tower.attacks.range,frames={}}
local removed;simulation={queue_remove_entity=function(_,e)if e.id==buff.id then removed=true end end,queue_insert_entity=function()end}
local co=coroutine.create(buff.main_script.update)
local start=out.exos.royal_edict_towerbuffDef.start
for frame=0,300 do
 store.tick_ts=frame/30;local s=buff.render.sprites[1];if s.name=='start' and store.tick_ts-s.ts>=start then s.runs=1 end
 local ok,err=coroutine.resume(co,buff,store);assert(ok,err)
 lifecycle.frames[#lifecycle.frames+1]={at=store.tick_ts,animation=s.name,ts=s.ts,modifierTs=buff.modifier.ts,tweenReverse=buff.tween.reverse,tweenDisabled=buff.tween.disabled,tweenTs=buff.tween.ts,removed=removed or false}
 if removed then assert(buff.main_script.remove(buff,store));lifecycle.finalFactor=tower.tower.damage_factor;break end
end
assert(removed,'Royal buff did not expire')
local decals={}
for _,name in ipairs({'decal_power_royal_edict_king','decal_power_royal_edict_rug'})do
 local e=E:create_entity(name);local s=e.render.sprites[1];local durations=out.exos[s.prefix];local store={tick_ts=0,tick_length=1/30};local done=false
 simulation={queue_remove_entity=function(_,entity)if entity.id==e.id then done=true end end}
 local co=coroutine.create(e.main_script.update);local frames={}
 for frame=0,260 do store.tick_ts=frame/30;if durations[s.name]then s.runs=math.floor((store.tick_ts-s.ts)/durations[s.name]+1e-9)end;assert(coroutine.resume(co,e,store));frames[#frames+1]={at=store.tick_ts,animation=s.name,ts=s.ts,done=done};if done then break end end
 decals[#decals+1]={name=name,frames=frames}
end
f=assert(io.open('analysis/royal-edict-oracle.json','w'));f:write(J.encode({selection=rows,lifecycle=lifecycle,decals=decals}));f:close()
