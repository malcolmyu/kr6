local f=assert(io.open('scripts/export_barrack_door.lua'));local source=f:read('*a');f:close()
local anchor='  local slot=schedule[relative]'
local first,last=source:find(anchor,1,true);assert(first)
source=source:sub(1,first-1)..[[
  if ({[3]=true,[19]=true,[50]=true,[65]=true,[73]=true,[110]=true,[130]=true,[170]=true})[relative]then tower.barrack.rally_new=true end
]]..source:sub(first)
source=source:gsub('analysis/barrack%-door%-oracle.json','analysis/barrack-rally-sounds-oracle.json')
assert(loadstring(source,'@scripts/export_barrack_door.lua'))()
