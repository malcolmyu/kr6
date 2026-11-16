local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
source=source:gsub('hp=entity.health and entity.health.hp,','damageFactor=entity.health and entity.health.damage_factor,hp=entity.health and entity.health.hp,',1)
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
