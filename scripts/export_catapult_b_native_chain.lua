-- Reuse the native scene and snapshot instrumentation, changing only the
-- inserted tower's initial power from A to B. All original callbacks run.
local f=assert(io.open('scripts/export_catapult_native_area_chain.lua'));local source=f:read('*a');f:close()
local n;source,n=source:gsub('t.powers.skill_a.level=tonumber%(arg%[13%]%)or 1;t.powers.skill_a.changed=true;','t.powers.skill_b.level=tonumber(arg[13])or 1;t.powers.skill_b.changed=true;',1);assert(n==1)
assert(loadstring(source,'@scripts/export_catapult_native_area_chain.lua'))()
