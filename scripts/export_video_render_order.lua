-- Inspect actual shipped render frames within the existing native opening harness.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local first=assert(source:find('local function snapshotRuntime()',1,true));local last=assert(source:find("phase='flush';sim:do_tick()",first,true))
source=source:sub(1,first-1)..[[local renderSamples={}
local function snapshotRuntime()
 if store.tick~=1845 and store.tick~=1850 and store.tick~=1875 and store.tick~=1905 then return end
 local refs,entities={},{}
 for _,id in ipairs({90,91,92,93})do
  local e=store.entities[id]
  if e then
   entities[#entities+1]={id=id,name=e.template_name,pos=table.clone(e.pos),hp=e.health.hp}
   for i,frame in ipairs(e.render.frames)do refs[frame]={entity=id,kind='body',part=i}end
   for i,frame in ipairs(e.health_bar.frames)do refs[frame]={entity=id,kind=i==1 and'bg'or'fg',part=i}end
  end
 end
 local frames={}
 for index,frame in ipairs(store.render_frames)do
  if refs[frame]then local row=refs[frame];row.index=index;row.pos=table.clone(frame.pos);row.z=frame.z;row.draw=frame.draw_order;row.sortY=frame.sort_y;row.sortYOffset=frame.sort_y_offset;row.hidden=frame.hidden;row.alpha=frame.alpha;frames[#frames+1]=row end
 end
 renderSamples[#renderSamples+1]={tick=store.tick,entities=entities,frames=frames}
end
]]..source:sub(last)
first=assert(source:find('local queueOnlyFlush=',1,true))
source=source:sub(1,first-1)..[[
local result={note='Actual APK systems.render update in original opening runtime. Controlled inferred profile/inputs/LCG104, not identified video replay.',samples=renderSamples,missing=runtimeResources.missing,missingAnimations=runtimeResources.A.missing_animations}
local output=assert(io.open('analysis/video-opening-native-render-order.json','w'));output:write(J.encode(result));output:close();print('Wrote '..#renderSamples..' actual native render-frame samples')
]]
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
