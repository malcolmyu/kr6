-- Observe the real original render system at mixed-battle draw checkpoints.
-- Does not replace simulation/render functions or generate expectations from web code.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local first=assert(source:find('local function snapshotRuntime()',1,true));local last=assert(source:find("phase='flush';sim:do_tick()",first,true))
source=source:sub(1,first-1)..[[local paintSampleCount=0
local paintPath='analysis/native-scene-paint-'..arg[4]..(arg[11]=='particles'and'-particles'or'')..'.json'
local paintPartial=paintPath..'.partial'
local paintOutput=assert(io.open(paintPartial,'w'))
local paintEncode=dofile('scripts/precise_json.lua')
paintOutput:write('{"note":"Actual APK render checkpoints; complete samples streamed without projection. Not video or heard-audio acceptance.","samples":[')
local mark=arg[4]=='archers-mark-complete'
local pierce=arg[4]=='archers-pierce-mixed'
local range=arg[4]=='archers-range-mixed'
local empower=arg[4]=='wizard-empower-mixed'
local knightArmor=arg[4]=='knight-armor-mixed'
local knightHeal=arg[4]=='knight-heal-mixed'
local culverine=arg[4]=='culverine-mixed'or arg[4]=='culverine-b-mixed'or arg[4]=='culverine-a-mixed'or arg[4]=='culverine-c-mixed'
local special=arg[4]=='knight-legacy-special-mixed'
local knightLegacy=special or arg[4]=='knight-legacy-mixed'
local extended=culverine or knightLegacy or knightHeal or knightArmor or empower or mark or pierce or range or arg[4]=='firebook-mixed'or arg[4]=='wizard-copies-mixed'
local paintTicks={}
for _,tick in ipairs({1,541,542,550,560,1464,2082,2469,2559,3151,3402,4500,5040,5041,5722,5723,6079,6081,6107,6358,6681,6705,6885,7887,8503,8699,4736,4796,4797,4801,4855,4856,4879,5359,6223})do paintTicks[tick]=true end
local file=assert(io.open(arg[7]));local cmds=J.decode(file:read('*a'));file:close()
for _,c in ipairs(cmds)do if c.kind=='build'or c.kind=='upgrade'or extended and(c.kind=='sell'or c.kind=='tower-power')or arg[11]=='particles'and c.kind=='power'then for _,dt in ipairs(c.kind=='power'and{0,1,8,30,60}or{0,1,8})do paintTicks[c.tick+dt]=true end end end
if arg[4]=='firebook-mixed'then for _,tick in ipairs({4329,4330,4347,4348})do paintTicks[tick]=true end end
local paintEventCursor=0
local empowerRemoveCursor=0
local function snapshotRuntime()
 if extended and store.game_outcome then paintTicks[store.tick]=true end
 if arg[11]=='particles'then for i=paintEventCursor+1,#events do local e=events[i];if e.kind=='insert'and(e.template=='mod_zefira_skill_a_stun'or knightArmor and e.template=='aura_knights_skill_a_check'or empower and(e.template=='mod_wizard_skill_b_fx'or e.template=='decal_tower_wizard_skill_b'or e.template=='decal_tower_wizard_empowerment_preview')or range and(e.template=='mod_archers_skill_b_range'or e.template=='decal_archers_skill_b_eagle'or e.template=='decal_archers_skill_b_preview')or pierce and(e.template:match('^bullet_archers_skill_a_lvl')or e.template:match('^mod_archers_skill_a_stun_lvl')or e.template=='fx_archers_skill_a')or extended and(e.template=='fx_tower_sell_dust'or e.template=='explosion_small_KR5'or e.template=='bullet_firebook_wizard'or e.template=='mod_firebook_aura'or e.template=='bullet_skill_c_wizard_1'or e.template=='bullet_skill_c_wizard_2'or e.template=='aura_wizard_skill_c'or mark and(e.template=='fx_archers_skill_c_eagle'or e.template=='mod_archers_skill_c_weak')))then local offsets={0,8,15};if knightArmor and e.template=='aura_knights_skill_a_check'then offsets={};for dt=0,30 do offsets[#offsets+1]=dt end end;if empower and(e.template=='mod_wizard_skill_b_fx'or e.template=='decal_tower_wizard_skill_b'or e.template=='decal_tower_wizard_empowerment_preview')then offsets={};for dt=0,31 do offsets[#offsets+1]=dt end;for dt=0,35 do offsets[#offsets+1]=math.floor((e.template=='decal_tower_wizard_empowerment_preview'and 0 or(store.entities[e.id].modifier and store.entities[e.id].modifier.duration or store.entities[e.id].duration))*30)+dt end end;if range and(e.template=='mod_archers_skill_b_range'or e.template=='decal_archers_skill_b_eagle'or e.template=='decal_archers_skill_b_preview')then offsets={};for dt=0,(e.template=='decal_archers_skill_b_eagle'and 168 or 30)do offsets[#offsets+1]=dt end end;if pierce and(e.template:match('^bullet_archers_skill_a_lvl')or e.template:match('^mod_archers_skill_a_stun_lvl')or e.template=='fx_archers_skill_a')then offsets={};for dt=0,(e.template:match('^mod_archers')and 185 or 30)do offsets[#offsets+1]=dt end end;if mark and(e.template=='fx_archers_skill_c_eagle'or e.template=='mod_archers_skill_c_weak')then offsets={};for dt=0,240 do offsets[#offsets+1]=dt end end;if extended and(e.template=='fx_tower_sell_dust'or e.template=='explosion_small_KR5'or e.template=='bullet_firebook_wizard'or e.template=='bullet_skill_c_wizard_1'or e.template=='bullet_skill_c_wizard_2'or e.template=='aura_wizard_skill_c')then offsets={};for dt=0,(e.template=='aura_wizard_skill_c'and 170 or 33)do offsets[#offsets+1]=dt end end;for _,dt in ipairs(offsets)do paintTicks[store.tick+dt]=true end end end;paintEventCursor=#events end
 if empower then for i=empowerRemoveCursor+1,#events do local e=events[i];if e.tick==store.tick and e.kind=='queueRemove'and(e.template=='mod_wizard_skill_b_fx'or e.template=='decal_tower_wizard_skill_b')then for dt=0,20 do paintTicks[store.tick+dt]=true end end end;empowerRemoveCursor=#events end
 if knightArmor then for _,e in pairs(store.entities)do if e.template_name=='aura_knights_skill_a_check'and e.render.sprites[1].alpha>0 and e.render.sprites[1].alpha<255 then paintTicks[store.tick]=true end end end
 if knightHeal then for _,e in pairs(store.entities)do if e.template_name=='soldier_knights_lvl4'and e.render.sprites[1].name=='heal'then paintTicks[store.tick]=true end end end
 if knightLegacy then for _,e in pairs(store.entities)do if e.template_name=='soldier_knights_lvl4'and e.render.sprites[1].name=='attack_2'or e.template_name:match('^mod_knights_skill_c_stun')then paintTicks[store.tick]=true end end end
 if special then for _,e in pairs(store.entities)do if e.template_name=='decal_power_reinforcements_special'or e.template_name=='mod_reinforcement_special_armor'and e.render.sprites[1].alpha>0 and e.render.sprites[1].alpha<255 or e.template_name=='soldier_reinforcement_special'and store.tick%15==0 then paintTicks[store.tick]=true end end end
 if culverine then for _,e in pairs(store.entities)do if e.template_name:match('^bullet_culverine_')or(e.template_name=='fx_bullet_culverine_hit'or e.template_name=='fx_bullet_culverine_skill_b_hit')and(e.render.sprites[1].alpha>0 and e.render.sprites[1].alpha<255 or store.tick%5==0)then paintTicks[store.tick]=true end end end
 if arg[4]=='culverine-a-mixed'then for _,e in pairs(store.entities)do if e.template_name=='ps_culverine_skill_a'or e.template_name=='fx_bullet_culverine_skill_a_hit'or e.template_name:match('^decal_bullet_culverine_skill_a')and(e.render.sprites[1].alpha>0 and e.render.sprites[1].alpha<255 or store.tick%5==0)or e.template_name:match('^tower_culverine')and(e.render.sprites[3].name=='sulfurblast'or e.render.sprites[3].name=='reloadsulfurblast')then paintTicks[store.tick]=true end end end
 if arg[4]=='culverine-c-mixed'then for _,e in pairs(store.entities)do if e.template_name:match('^fx_culverine_skill_c_buff')then paintTicks[store.tick]=true end end end
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
 if paintSampleCount>0 then paintOutput:write(',')end
 paintOutput:write(paintEncode({tick=store.tick,frames=frames}))
 paintSampleCount=paintSampleCount+1
end
]]..source:sub(last)
first=assert(source:find('local queueOnlyFlush=',1,true))
source=source:sub(1,first-1)..[[
paintOutput:write('],"missing":',paintEncode(runtimeResources.missing),',"missingAnimations":',paintEncode(runtimeResources.A.missing_animations),',"metadata":',paintEncode({tick=store.tick,random=#randomDraws,events=#events,nextId=E.last_id,gold=store.player_gold,lives=store.lives}),'}')
paintOutput:close();assert(os.rename(paintPartial,paintPath));print('Wrote '..paintSampleCount..' actual native scene paint samples (streamed)')
]]
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
