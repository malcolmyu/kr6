-- Observe the real original render system at mixed-battle draw checkpoints.
-- Does not replace simulation/render functions or generate expectations from web code.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local first=assert(source:find('local function snapshotRuntime()',1,true));local last=assert(source:find("phase='flush';sim:do_tick()",first,true))
source=source:sub(1,first-1)..[[local paintSamples={}
local mark=arg[4]=='archers-mark-complete'
local extended=mark or arg[4]=='firebook-mixed'or arg[4]=='wizard-copies-mixed'
local paintTicks={}
for _,tick in ipairs({1,541,542,550,560,1464,2082,2469,2559,3151,3402,4500,5040,5041,5722,5723,6079,6081,6107,6358,6681,6705,6885,7887,8503,8699,4736,4796,4797,4801,4855,4856,4879,5359,6223})do paintTicks[tick]=true end
local file=assert(io.open(arg[7]));local cmds=J.decode(file:read('*a'));file:close()
for _,c in ipairs(cmds)do if c.kind=='build'or c.kind=='upgrade'or extended and(c.kind=='sell'or c.kind=='tower-power')or arg[11]=='particles'and c.kind=='power'then for _,dt in ipairs(c.kind=='power'and{0,1,8,30,60}or{0,1,8})do paintTicks[c.tick+dt]=true end end end
if arg[4]=='firebook-mixed'then for _,tick in ipairs({4329,4330,4347,4348})do paintTicks[tick]=true end end
local paintEventCursor=0
local function snapshotRuntime()
 if extended and store.game_outcome then paintTicks[store.tick]=true end
 if arg[11]=='particles'then for i=paintEventCursor+1,#events do local e=events[i];if e.kind=='insert'and(e.template=='mod_zefira_skill_a_stun'or extended and(e.template=='fx_tower_sell_dust'or e.template=='explosion_small_KR5'or e.template=='bullet_firebook_wizard'or e.template=='mod_firebook_aura'or e.template=='bullet_skill_c_wizard_1'or e.template=='bullet_skill_c_wizard_2'or e.template=='aura_wizard_skill_c'or mark and(e.template=='fx_archers_skill_c_eagle'or e.template=='mod_archers_skill_c_weak')))then local offsets={0,8,15};if mark and(e.template=='fx_archers_skill_c_eagle'or e.template=='mod_archers_skill_c_weak')then offsets={};for dt=0,240 do offsets[#offsets+1]=dt end end;if extended and(e.template=='fx_tower_sell_dust'or e.template=='explosion_small_KR5'or e.template=='bullet_firebook_wizard'or e.template=='bullet_skill_c_wizard_1'or e.template=='bullet_skill_c_wizard_2'or e.template=='aura_wizard_skill_c')then offsets={};for dt=0,(e.template=='aura_wizard_skill_c'and 170 or 33)do offsets[#offsets+1]=dt end end;for _,dt in ipairs(offsets)do paintTicks[store.tick+dt]=true end end end;paintEventCursor=#events end
 if not paintTicks[store.tick]then return end
 local refs={}
 for id,e in pairs(store.entities)do
  for i,frame in ipairs(e.render and e.render.frames or{})do local sprite=e.render.sprites[i];refs[frame]={key=id..':sprite:'..i,name=e.template_name,spriteFrame=sprite.frame_idx,prefix=sprite.prefix,animation=sprite.name,exo=sprite.exo}end
  for i,frame in ipairs(e.health_bar and e.health_bar.frames or{})do refs[frame]={key=id..':health:'..i,name=e.template_name}end
  if arg[11]=='particles'then for _,p in ipairs(e.particle_system and e.particle_system.particles or{})do if p.f then refs[p.f]={key=id..':particle:'..string.format('%.9f',p.ts),name=e.template_name}end end end
 end
 local frames={}
 for index,frame in ipairs(store.render_frames)do
  if refs[frame]then local row=refs[frame];row.index=index;row.x=frame.pos.x;row.y=frame.sort_y or frame.pos.y+(frame.sort_y_offset or 0);row.z=frame.z;row.draw=frame.draw_order;row.hidden=frame.hidden;row.alpha=frame.alpha;frames[#frames+1]=row end
 end
 paintSamples[#paintSamples+1]={tick=store.tick,frames=frames}
end
]]..source:sub(last)
first=assert(source:find('local queueOnlyFlush=',1,true))
source=source:sub(1,first-1)..[[
local result={note='Actual APK systems.render frames at original mixed-battle checkpoints. Controlled profile/inputs/LCG104; not video fidelity or complete rendered-pixel acceptance.',samples=paintSamples,missing=runtimeResources.missing,missingAnimations=runtimeResources.A.missing_animations}
local output=assert(io.open('analysis/native-scene-paint-'..arg[4]..(arg[11]=='particles'and'-particles'or'')..'.json','w'));output:write(dofile('scripts/precise_json.lua')(result));output:close();print('Wrote '..#paintSamples..' actual native scene paint samples')
]]
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
