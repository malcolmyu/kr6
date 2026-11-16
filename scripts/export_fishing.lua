TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E,J,U,A,S,Sound,Signal=require('entity_db'),require('dkjson'),require('utils'),require('klove.animation_db'),require('systems'),require('sound_db'),require('hump.signal')
local names={'decal_stage_03_fish','decal_stage_03_fisherman','decal_stage_03_fisherman_bubble','decal_stage_03_fish_tap'}
local function clean(v)if type(v)=='function'then return nil elseif type(v)=='table'then local o={};for k,x in pairs(v)do o[k]=clean(x)end;return o else return v end end
local templates,counts={},{}
for _,name in ipairs(names)do
 templates[name]=clean(E.entities[name]);local prefix=E.entities[name].render.sprites[1].prefix
 local def=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/'..prefix..'.exo3');counts[prefix]={}
 for _,a in ipairs(def.animations)do counts[prefix][a.name]=#a.frames end
end
local file=assert(io.open('public/data/fishing.json','w'));file:write(J.encode({templates=templates,counts=counts}));file:close()
local rows={}
for _,roll in ipairs({0,.5,.999})do for _,scenario in ipairs({'none','single','burst'})do
 E.last_id=1
 local store={tick=0,tick_ts=0,tick_length=1/30,entities={}},fish
 local fishes={};for i=1,3 do local f=E:create_entity(names[1]);f.webKey='fish'..i;f.pos={x=200+i*100,y=400};f.editor.flip=i==2 and 1 or 0;assert(f.main_script.insert(f,store));fishes[i]=f;store.entities[f.id]=f end
 local fisherman=E:create_entity(names[2]);fisherman.webKey='fisherman';fisherman.pos={x=512,y=384};store.entities[fisherman.id]=fisherman
 local cos={};for _,f in ipairs(fishes)do cos[f.id]=coroutine.create(f.main_script.update)end;cos[fisherman.id]=coroutine.create(fisherman.main_script.update)
 local pending,removals,events,draws,frames,inputs={},{},{},{},{},{};local tapCount=0
 simulation={queue_insert_entity=function(_,e)
  if e.template_name==names[4]then tapCount=tapCount+1;e.webKey='tap'..tapCount else e.webKey='bubble'end
  pending[#pending+1]=e;events[#events+1]={tick=store.tick,kind='insert',name=e.template_name,key=e.webKey,pos=table.clone(e.pos)}
 end,queue_remove_entity=function(_,e)
  if e.pending_removal then return end;e.pending_removal=true;removals[#removals+1]=e;events[#events+1]={tick=store.tick,kind='remove',key=e.webKey}
 end}
 Sound.queue=function(_,name)events[#events+1]={tick=store.tick,kind='sound',name=name}end
 Signal.emit=function(name,... )events[#events+1]={tick=store.tick,kind='signal',name=name,args={...}}end
 math.random=function(a,b)local v=a and a+math.floor(roll*(b-a+1))or roll;draws[#draws+1]={tick=store.tick,min=a,max=b,value=v};return v end
 local lastClick=-999
 for tick=1,3300 do
  store.tick=tick;store.tick_ts=tick*(1/30)
  for _,e in ipairs(pending)do store.entities[e.id]=e end;pending={}
  for _,e in ipairs(removals)do store.entities[e.id]=nil end;removals={}
  if scenario~='none'and tick-lastClick>=90 then
   for i,f in ipairs(fishes)do if store.entities[f.id]and f.ui.can_click and not f.render.sprites[1].hidden then f.ui.clicked=true;inputs[#inputs+1]={tick=tick,fish=i};lastClick=tick;if scenario=='single'then break end end end
  end
  for _,e in ipairs({fishes[1],fishes[2],fishes[3],fisherman})do local co=cos[e.id];if store.entities[e.id]and coroutine.status(co)~='dead'then local ok,err=coroutine.resume(co,e,store);assert(ok,debug.traceback(co,tostring(err)))end end
  S.timed:on_update(1/30,store.tick_ts,store)
  local entities={};for _,e in pairs(store.entities)do local sprite=e.render.sprites[1];local count=counts[sprite.prefix][sprite.name];local _,runs,frame=A:fni({from=1,to=count,prefix='original'},store.tick_ts-sprite.ts,sprite.loop,sprite.fps,store.tick_length);sprite.runs=runs;sprite.frame_idx=frame;entities[e.webKey]={name=sprite.name,ts=sprite.ts,hidden=not not sprite.hidden,loop=not not sprite.loop,flip=not not sprite.flip_x,frame=frame,canClick=e.ui and e.ui.can_click}end
  frames[#frames+1]={tick=tick,entities=entities,found=not not fisherman._found_all_fish,fishTapped=not not fisherman.fish_tapped,draws=#draws,events=#events}
 end
 rows[#rows+1]={roll=roll,scenario=scenario,inputs=inputs,frames=frames,draws=draws,events=events}
end end
file=assert(io.open('analysis/fishing-oracle.json','w'));file:write(J.encode(rows));file:close();print(#rows..' original fish/fisherman coupled cases, 29700 frames with real animation/timed helpers exported')
