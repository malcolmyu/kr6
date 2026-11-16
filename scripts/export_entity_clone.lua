EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,sim=require('entity_db'),require('dkjson'),require('klove.simulation');local rows={}
for _,first in ipairs({1,12,257,1000})do
 E.last_id=first;local store={};sim:init(store,{}, {},1/30)
 local known,frames={},{};local fn=function()return 7 end
 local function create(key)local e=E:create_entity({key=key,nested={value=1,vector={x=3,y=4}},callback=fn});e.secondary=e.nested;known[key]=e;return e end
 local function clone(source,key)local e=E:clone_entity(source);e.key=key;known[key]=e;return e end
 local a,b,c,d,e,f
 for step=1,9 do
  if step==1 then a=create('a');sim:queue_insert_entity(a)
  elseif step==2 then b=clone(a,'b')
  elseif step==3 then b.nested.value=9;sim:queue_insert_entity(b)
  elseif step==4 then sim:queue_remove_entity(a)
  elseif step==5 then c=clone(b,'c');sim:queue_insert_entity(c);sim:queue_remove_entity(b)
  elseif step==6 then a.nested.value=42;sim:queue_remove_entity(c)
  elseif step==7 then d=clone(a,'d');sim:queue_insert_entity(d)
  elseif step==8 then e=create('e');f=clone(e,'f');sim:queue_insert_entity(e);sim:queue_insert_entity(f)
  elseif step==9 then sim:queue_remove_entity(e);sim:queue_remove_entity(f);sim:queue_remove_entity(d)end
  sim:do_tick();local entities={};for key,v in pairs(store.entities)do entities[#entities+1]={key=key,id=v.id,name=v.key}end
  local objects={};for key,v in pairs(known)do objects[key]={id=v.id,value=v.nested.value,secondary=v.secondary.value,shared=v.secondary==v.nested,callbackSame=v.callback==fn,pending=v.pending_removal or false}end
  frames[#frames+1]={entities=entities,objects=objects,nextId=E.last_id,count=store.entity_count,max=store.entity_max}
 end
 rows[#rows+1]={firstId=first,frames=frames}
end
local file=assert(io.open('analysis/entity-clone-oracle.json','w'));file:write(J.encode({runtime=jit.version,rows=rows}));file:close()
print('Original clone_entity source mutation, copied old ID and registered-table alias traces exported')
