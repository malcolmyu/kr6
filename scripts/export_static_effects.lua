TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,S=require('entity_db'),require('systems');SSO=nil
local names={'decal_bomb_crater','fx_screen_white_flash','decal_power_soaring_shop_attack_3_crack','decal_power_soaring_shop_attack_1_crack','fx_stage_18_moloch_ray','decal_bomb_crater_KR5','decal_power_rain_of_fire_crack','decal_tower_wizard_ultimate','decal_stage_18_moloch_shadow'}
local encode=dofile('scripts/precise_json.lua');local native={}
for _,name in ipairs(names)do native[name]=E:get_template(name).tween end
local f=assert(io.open('public/data/static-effects-tweens.json','w'));f:write(encode(native));f:close()
local variants={};for _,name in ipairs(names)do variants[#variants+1]={name=name}end
for _,fn in ipairs({'linear','step','quad','quad_out','sine'})do
 local config=table.deepclone(E:get_template('decal_bomb_crater_KR5'));config.template_name='fixture_static_'..fn;config.render.sprites[2]=table.deepclone(config.render.sprites[1])
 config.tween.props={{name='alpha',sprite_id={1,2},interp=fn,keys={{0,255},{1,0}}},{name='scale',sprite_id=1,interp=fn,keys={{0,{x=.5,y=.5}},{1,{x=1.5,y=2}}}},{name='hidden',sprite_id=2,keys={{0,false},{.5,true},{1,false}}}}
 variants[#variants+1]={name=config.template_name,config=config}
end
local rows={}
for _,v in ipairs(variants)do for _,birth in ipairs({0,19,637,1077})do for _,first in ipairs({1,127,512})do for _,phase in ipairs({'main','pops'})do
 E.last_id=first;local store={tick=birth,tick_ts=birth*(1/30),entities={}};local pending,removes,models,events,frames,removed={},{},{},{},{},{}
 simulation={queue_insert_entity=function(_,e)pending[#pending+1]=e;events[#events+1]={tick=store.tick,kind='queueInsert',id=e.id}end,queue_remove_entity=function(_,e)if not e.pending_removal then e.pending_removal=true;removes[#removes+1]=e;events[#events+1]={tick=store.tick,kind='queueRemove',id=e.id}end end}
 local function spawn(relative)
  if relative~=1 and relative~=28 then return end
  for i=1,(relative==1 and 3 or 1)do local e=E:create_entity(v.config or v.name);models[#models+1]=e;events[#events+1]={tick=store.tick,kind='create',id=e.id};for _,s in ipairs(e.render.sprites)do s.ts=store.tick_ts end;simulation:queue_insert_entity(e)end
 end
 for relative=1,135 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  for _,e in ipairs(pending)do S.tween:on_insert(e,store);store.entities[e.id]=e;events[#events+1]={tick=store.tick,kind='insert',id=e.id}end;pending={}
  for _,e in ipairs(removes)do store.entities[e.id]=nil;removed[e.id]=true;events[#events+1]={tick=store.tick,kind='remove',id=e.id}end;removes={}
  if phase=='main'then spawn(relative)end
  S.tween:on_update(1/30,store.tick_ts,store)
  if phase=='pops'then spawn(relative)end
  local active,live={},{}
  for _,e in pairs(store.entities)do local sprites={};for _,s in ipairs(e.render.sprites)do sprites[#sprites+1]={alpha=s.alpha,scale=table.deepclone(s.scale),hidden=s.hidden}end;active[#active+1]={id=e.id,sprites=sprites}end
  for _,e in ipairs(models)do if not removed[e.id]then live[#live+1]=e.id end end
  frames[#frames+1]={tick=store.tick,active=active,models=live}
 end
 rows[#rows+1]={name=v.name,config=v.config,birth=birth,firstId=first,phase=phase,events=events,frames=frames}
end end end end
local f=assert(io.open('analysis/static-effects-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original static tween lifecycle traces exported, including native precision keys and controlled interpolation/multiple-sprite inputs')
