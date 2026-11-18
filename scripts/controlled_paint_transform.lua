-- Re-run the unchanged controlled fixture and observe every actual native render.
CONTROLLED_PAINT_TRANSFORM=function(source)
 local first=assert(source:find('local function snapshotRuntime()',1,true));local last=assert(source:find("phase='flush';sim:do_tick()",first,true))
 source=source:sub(1,first-1)..[[
local samples={}
local function snapshotRuntime()
 local refs,frames={},{}
 for id,e in pairs(store.entities)do
  for i,f in ipairs(e.render and e.render.frames or{})do local s=e.render.sprites[i];refs[f]={key=id..':sprite:'..i,name=e.template_name,prefix=s.prefix,animation=s.name,spriteFrame=s.frame_idx,exo=s.exo}end
  for i,f in ipairs(e.health_bar and e.health_bar.frames or{})do refs[f]={key=id..':health:'..i,name=e.template_name}end
  for _,p in ipairs(e.particle_system and e.particle_system.particles or{})do if p.f then refs[p.f]={key=id..':particle:'..string.format('%.9f',p.ts),name=e.template_name,atlasFrame=p.f.ss and p.f.ss.webName}end end
 end
 for index,f in ipairs(store.render_frames)do if refs[f]then local row=refs[f];row.index=index;row.x=f.pos.x;row.y=f.sort_y or f.pos.y+(f.sort_y_offset or 0);row.z=f.z;row.draw=f.draw_order;row.hidden=f.hidden;row.alpha=f.alpha;row.rotation=f.r;row.scale=f.scale and table.clone(f.scale);row.position=table.clone(f.pos);row.offset=f.offset and table.clone(f.offset);frames[#frames+1]=row end end
 samples[#samples+1]={tick=store.tick,frames=frames}
end
]]..source:sub(last)
 first=assert(source:find('local queueOnlyFlush=',1,true))
 source=source:sub(1,first-1)..[[
local encode=dofile('scripts/precise_json.lua');local f=assert(io.open('analysis/native-controlled-paint-'..arg[4]..'.json','w'));f:write('{\"samples\":[');for i,sample in ipairs(samples)do if i>1 then f:write(',')end;f:write(encode(sample))end;f:write('],\"missing\":',encode(runtimeResources.missing),',\"missingAnimations\":',encode(runtimeResources.A.missing_animations),',\"metadata\":',encode({tick=store.tick,random=#randomDraws,events=#events,nextId=E.last_id}),'}');f:close();print('Actual controlled render samples: '..#samples)
]]
 return source
end
