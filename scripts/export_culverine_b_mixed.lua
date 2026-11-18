local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local replacements;source,replacements=source:gsub('hp=entity.health and entity.health.hp,','culverineAllAttacks=entity.template_name:match("^tower_culverine") and table.deepclone(entity.attacks.list),powerB=entity.powers and entity.powers.skill_b and entity.powers.skill_b.level,culverineParts=entity.template_name:match("^tower_culverine") and table.deepclone(entity.render.sprites),culverineAttackTs=entity.template_name:match("^tower_culverine") and entity.attacks.list[1].ts,auraSource=entity.aura and entity.aura.source_id,auraLevel=entity.aura and entity.aura.level,auraFactor=entity.aura and entity.aura.damage_factor,bulletSource=entity.bullet and entity.bullet.source_id,bulletFactor=entity.bullet and entity.bullet.damage_factor,bulletLevel=entity.bullet and entity.bullet.level,nativeTween=entity.tween and table.deepclone(entity.tween),unitDamageFactor=entity.unit and entity.unit.damage_factor,rawArmor=entity.health and entity.health.raw_armor,hpBeforeTimeout=entity.reinforcement and entity.reinforcement.hp_before_timeout,modifierLevel=entity.modifier and entity.modifier.level,healthDead=entity.health and entity.health.dead,deathFinished=entity.health and entity.health.death_finished_ts,powerC=entity.powers and entity.powers.skill_c and entity.powers.skill_c.level,legacyAttacks=entity.template_name=="soldier_knights_lvl4" and table.deepclone(entity.melee.attacks),auraSource=entity.aura and entity.aura.source_id,auraTarget=entity.aura and entity.aura.target_id,hp=entity.health and entity.health.hp,',1);assert(replacements==1,'Missing full snapshot instrumentation anchor')
if arg[11]=='until-outcome'then
 local anchor='sim:do_tick();snapshotRuntime()';local first,last=assert(source:find(anchor,1,true));assert(not source:find(anchor,last+1,true),'ambiguous outcome checkpoint')
 local continuation=tonumber(arg[12])or 0;assert(continuation>=0 and continuation==math.floor(continuation))
 local stop=';if store.game_outcome then break end'
 if continuation>0 then stop=string.format(';if store.game_outcome then firstObservedOutcome=firstObservedOutcome or store.tick;if store.tick-firstObservedOutcome>=%d then break end end',continuation)end
 source=source:sub(1,last)..stop..source:sub(last+1)
 if continuation>0 then local loop=' for tick=2,tonumber(arg[6])or 30 do';local a,b=assert(source:find(loop,1,true));source=source:sub(1,a-1)..' local firstObservedOutcome;'..loop..source:sub(b+1)end
end
local before="local f=assert(io.open(path,'w'));f:write(J.encode(result));f:close()"
local first,last=assert(source:find(before,1,true));source=source:sub(1,first-1).."local f;print('Native frames '..#result.frames..', last tick '..result.frames[#result.frames].tick..', lives '..result.frames[#result.frames].lives);dofile('scripts/write_native_trace_json.lua')(path,result)"..source:sub(last+1)
if arg[13]=='continuation-only'then
 local cut=assert(tonumber(arg[14]),'Explicit verified outcome tick required');local count
 source,count=source:gsub('local function snapshotRuntime%(%)', 'local function snapshotRuntime() if store.tick<='..cut..' then return end',1);assert(count==1)
end
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
