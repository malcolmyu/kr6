EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,sim=require('entity_db'),require('dkjson'),require('klove.simulation');simulation=sim;local rows={}
for _,first in ipairs({1,12,31,1000})do
 E.last_id=first;local events,known,store={},{},{};local make
 local probe={on_queue=function(_,e,store,inserting)events[#events+1]={kind='queue',key=e.key,inserting=inserting}end,on_insert=function(_,e)
  events[#events+1]={kind='insert',key=e.key}
  if e.child and not e.didChild then e.didChild=true;sim:queue_insert_entity(make(e.key..'_child'))end
  if e.blockInsert then return false end
  return e.acceptZero and 0 or true
 end,on_remove=function(_,e)
  events[#events+1]={kind='remove',key=e.key};if e.blockRemove then return false end
  if e.childOnRemove then e.childOnRemove=nil;sim:queue_insert_entity(make(e.key..'_removed'))end
  return true
 end,on_dequeue=function(_,e,store,inserting)events[#events+1]={kind='dequeue',key=e.key,inserting=inserting}end}
 sim:init(store,{probe=probe},{'probe'},1/30)
 make=function(key,fields)local t={key=key};for k,v in pairs(fields or{})do t[k]=v end;local e=E:create_entity(t);known[key]=e;events[#events+1]={kind='create',key=key,id=e.id};return e end
 local a,b,c,d;local frames={}
 for tick=1,8 do
  if tick==1 then a=make('a',{child=true,blockRemove=true,childOnRemove=true});b=make('b',{blockInsert=true});c=make('c',{acceptZero=true,childOnRemove=true});sim:queue_insert_entity(a);sim:queue_insert_entity(b);sim:queue_insert_entity(c);sim:queue_remove_entity(c);sim:queue_remove_entity(c)
  elseif tick==2 then sim:queue_remove_entity(a)
  elseif tick==3 then sim:queue_remove_entity(a);a.blockRemove=false;sim:queue_insert_entity(a);sim:queue_remove_entity(a)
  elseif tick==4 then d=make('d',{blockRemove=true});sim:queue_insert_entity(d);sim:queue_insert_entity(c);sim:queue_remove_entity(b)
  elseif tick==5 then sim:queue_remove_entity(d)
  elseif tick==6 then sim:queue_remove_entity(d);d.blockRemove=false;sim:queue_insert_entity(d);sim:queue_remove_entity(d)
  elseif tick==7 then sim:queue_remove_entity(c)end
  sim:do_tick();local entities={};for id,e in pairs(store.entities)do entities[#entities+1]={id=id,key=e.key,pending_removal=e.pending_removal}end
  local inserts,removes={},{};for _,e in ipairs(store.pending_inserts)do inserts[#inserts+1]=e.key end;for _,e in ipairs(store.pending_removals)do removes[#removes+1]=e.key end
  frames[#frames+1]={events=table.deepclone(events),entities=entities,inserts=inserts,removes=removes,count=store.entity_count,max=store.entity_max,nextId=E.last_id,time=store.tick_ts};events={}
 end
 rows[#rows+1]={firstId=first,frames=frames}
end
local f=assert(io.open('analysis/entity-registry-oracle.json','w'));f:write(J.encode({version=jit.version,rows=rows}));f:close();print('Original entity allocation and simulation queue/insert/remove lifecycle cases exported')
