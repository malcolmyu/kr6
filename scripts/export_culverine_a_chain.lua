local f=assert(io.open('scripts/export_culverine_native_chain.lua'));local source=f:read('*a');f:close()
-- Use the same original tower/target harness; A differs only by prescribed
-- purchased power and armored target, not by replacing any original script.
source=source:gsub('e.health.hp=10000;',"e.health.magic_armor=arg[12]=='zero-armor'and 0 or .4;e.health.hp=10000;",1)
source=source:gsub('t.webCulverineSource=true;',"t.webCulverineSource=true;if arg[12]~='purchase'then t.powers.skill_a.level=tonumber(arg[13]);t.powers.skill_a.changed=true end;",1)
source=source:gsub("e.health.armor=arg%[12%]=='zero%-armor'and 0 or 0.2;", "e.health.magic_armor=arg[12]=='zero-armor'and 0 or 0.4;")
source=source:gsub('culverineParts=entity.template_name:', 'spriteZ=entity.render and entity.render.sprites[1]and entity.render.sprites[1].z,spriteSortY=entity.render and entity.render.sprites[1]and entity.render.sprites[1].sort_y_offset,modifierLevel=entity.modifier and entity.modifier.level,nativeTween=entity.tween and table.deepclone(entity.tween),culverineTimedAttacks=entity.timed_attacks and table.deepclone(entity.timed_attacks.list),rawMagicArmor=entity.health and entity.health.raw_magic_armor,sulfurLost=entity._magic_armor_lost,sulfurDuration=entity.actual_duration,culverineAllAttacks=entity.template_name:match("^tower_culverine") and table.deepclone(entity.attacks.list),culverineParts=entity.template_name:')
source=source:gsub('local mode=arg%[12%]or',[[
  if arg[12]=='purchase'and(tick==80 or tick==120 and tonumber(arg[13])>=2 or tick==160 and tonumber(arg[13])>=3)then for _,t in pairs(store.entities)do if t.webCulverineSource then t.powers.skill_a.level=t.powers.skill_a.level+1;t.powers.skill_a.changed=true end end end
  local sulfurMode=arg[12]
  if tick==130 and sulfurMode=='sulfur-purchase-windup'then for _,t in pairs(store.entities)do if t.webCulverineSource then t.powers.skill_a.level=3;t.powers.skill_a.changed=true end end end
  if tick==149 and sulfurMode=='sulfur-remove-source'then for _,t in pairs(store.entities)do if t.webCulverineSource then sim:queue_remove_entity(t)end end end
  if tick==146 and sulfurMode=='sulfur-remove-target'then for _,t in pairs(store.entities)do if t.webCulverineTarget then sim:queue_remove_entity(t)end end end
  if(tick==130 or tick==170)and sulfurMode=='sulfur-block-cast'then for _,t in pairs(store.entities)do if t.webCulverineSource then t.tower.blocked=tick==130 end end end
  local mode=arg[12]or]],1)
assert(loadstring(source,'@scripts/export_culverine_b_chain.lua'))()
