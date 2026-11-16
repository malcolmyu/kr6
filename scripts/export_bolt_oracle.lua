EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
local E=require('entity_db'); local J=require('dkjson')
local traces={}
simulation={queue_remove_entity=function() end,queue_insert_entity=function() end}
for _,destination in ipairs({{x=120,y=50},{x=-200,y=-80},{x=10,y=0},{x=450,y=250}}) do
  local e=E:create_entity('bolt_tower_wizard_lvl1')
  e.pos={x=0,y=0};e.bullet.from={x=0,y=0};e.bullet.to=table.deepclone(destination)
  -- Isolate the original flight loop; rendering queues are irrelevant to its integration.
  e.bullet.particles_name=nil;e.bullet.hit_fx=nil;e.bullet.hit_decal=nil;e.bullet.pop=nil
  local store={tick_length=1/30,tick_ts=0,entities={},damage_queue={}}
  assert(e.main_script.insert(e,store))
  local co=coroutine.create(e.main_script.update)
  local trace={to=destination,frames={}}
  for frame=0,119 do
    store.tick_ts=frame/30
    local ok,err=coroutine.resume(co,e,store);assert(ok,err)
    trace.frames[#trace.frames+1]={pos=table.deepclone(e.pos),velocity=table.deepclone(e.force_motion.v),done=coroutine.status(co)=='dead'}
    if coroutine.status(co)=='dead' then break end
  end
  traces[#traces+1]=trace
end
local f=assert(io.open('analysis/bolt-oracle.json','w'));f:write(assert(J.encode(traces)));f:close()
