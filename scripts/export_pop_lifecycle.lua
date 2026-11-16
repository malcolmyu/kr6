TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,SU,S,J=require('entity_db'),require('script_utils'),require('systems'),require('dkjson');SSO=nil
local names={};for name,t in pairs(E.entities)do if name:match('^pop_')and t.tween then names[#names+1]=name end end;table.sort(names)
local rows={};local create=E.create_entity
for _,name in ipairs(names)do for _,birth in ipairs({0,19,585,612})do for _,first in ipairs({1,127,512})do for _,phase in ipairs({'main','pops'})do
 E.last_id=first
 local store={tick=birth,tick_ts=birth*(1/30),entities={}};local events,frames,known,inserts,removes,removed={},{},{},{},{},{}
 local calls=0;math.random=function(a,b)calls=calls+1;return a and a+math.floor(.25*(b-a+1))or .25 end
 E.create_entity=function(self,template)local e=create(self,template);known[#known+1]=e;events[#events+1]={tick=store.tick,kind='create',id=e.id,template=template};return e end
 simulation={queue_insert_entity=function(_,e)inserts[#inserts+1]=e;events[#events+1]={tick=store.tick,kind='queueInsert',id=e.id,template=e.template_name}end,queue_remove_entity=function(_,e)if not e.pending_removal then e.pending_removal=true;removes[#removes+1]=e;events[#events+1]={tick=store.tick,kind='queueRemove',id=e.id,template=e.template_name}end end}
 local h={pos={x=500,y=350},unit={pop_offset={x=0,y=9}},dodge={pop=name,silent=true,active=true}}
 local function spawn(relative)if relative==1 or relative==28 then for i=1,(relative==1 and 3 or 1)do SU.show_dodge_pop(store,h)end end end
 for relative=1,65 do
  store.tick=birth+relative;store.tick_ts=store.tick*(1/30)
  for _,e in ipairs(inserts)do S.tween:on_insert(e,store);store.entities[e.id]=e;events[#events+1]={tick=store.tick,kind='insert',id=e.id,template=e.template_name}end;inserts={}
  for _,e in ipairs(removes)do store.entities[e.id]=nil;removed[e.id]=true;events[#events+1]={tick=store.tick,kind='remove',id=e.id,template=e.template_name}end;removes={}
  if phase=='main'then spawn(relative)end
  S.tween:on_update(1/30,store.tick_ts,store)
  if phase=='pops'then spawn(relative)end
  local active,models,queued={},{},{}
  for _,e in pairs(store.entities)do local p=e.render.sprites[1];active[#active+1]={id=e.id,pos=e.pos,frame=p.name,rotation=p.r,scale=table.deepclone(p.scale)}end
  for _,e in ipairs(known)do if not removed[e.id]then models[#models+1]=e.id end end
  for _,e in ipairs(removes)do queued[#queued+1]=e.id end
  frames[#frames+1]={tick=store.tick,active=active,models=models,removes=queued,calls=calls}
 end
 rows[#rows+1]={name=name,birth=birth,firstId=first,phase=phase,events=events,frames=frames};E.create_entity=create
end end end end
local f=assert(io.open('analysis/pop-lifecycle-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original pop queue/tween/removal lifecycle traces exported')
