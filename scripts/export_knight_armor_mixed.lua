local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('hp=entity.health and entity.health.hp,','rawArmor=entity.health and entity.health.raw_armor,powerA=entity.powers and entity.powers.skill_a and entity.powers.skill_a.level,auraSource=entity.aura and entity.aura.source_id,armorTween=entity.tween and entity.tween.ts,armorDisabled=entity.tween and entity.tween.disabled,armorReverse=entity.tween and entity.tween.reverse,armorAlphas=entity.template_name=="aura_knights_skill_a_check" and {entity.render.sprites[1].alpha,entity.render.sprites[2].alpha},hp=entity.health and entity.health.hp,',1)
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
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
