-- Observe original sound requests in the same legal-input battle. Keep the
-- original sound queue implementation and RNG; omit only large read-only frames.
local f=assert(io.open('scripts/export_level_entity_bootstrap.lua'));local source=f:read('*a');f:close()
local function replaceOnce(before,after)
 local first,last=source:find(before,1,true);assert(first,'Missing instrumentation anchor')
 assert(not source:find(before,last+1,true),'Ambiguous instrumentation anchor')
 source=source:sub(1,first-1)..after..source:sub(last+1)
end
replaceOnce('local currentStore,activeUpdate',[[local currentStore,activeUpdate
local soundRequests={};local waveTicks={}
local Sound=require('sound_db');local queue=Sound.queue
Sound.queue=function(self,name,...)
 soundRequests[#soundRequests+1]={tick=currentStore and currentStore.tick or 0,name=name,args={...}}
 return queue(self,name,...)
end
-- Restore the actual GUI goal callback too: it owns the life-loss sound,
-- whereas the engine alone only emits enemy-reached-goal.
local lostLife=assert(loadfile('analysis/function-bytecode/game_gui_line876.lua'))
local guiSoundBindings={S=Sound,game_gui={selected_entity=nil}}
for i=1,20 do local name=debug.getupvalue(lostLife,i);if not name then break end;local value=assert(guiSoundBindings[name],name);debug.setupvalue(lostLife,i,value)end
require('hump.signal').register('enemy-reached-goal',lostLife)
require('hump.signal').register('next-wave-sent',function()waveTicks[#waveTicks+1]=currentStore and currentStore.tick or 0 end)]])
local first=assert(source:find('local function snapshotRuntime()',1,true))
local last=assert(source:find("phase='flush';sim:do_tick()",first,true))
source=source:sub(1,first-1)..'local function snapshotRuntime()end\n'..source:sub(last)
first=assert(source:find('local queueOnlyFlush=',1,true))
source=source:sub(1,first-1)..[[
local result={sounds=soundRequests,waveTicks=waveTicks,tick=store.tick,gold=store.player_gold,lives=store.lives,outcome=store.game_outcome,random=#randomDraws,events=#events,nextId=E.last_id}
local output=assert(io.open(arg[11]or'analysis/native-battle-sounds.json','w'));output:write(J.encode(result));output:close()
print('Original battle sound requests: '..#soundRequests..', tick '..store.tick..', RNG '..#randomDraws)
]]
assert(loadstring(source,'@scripts/export_level_entity_bootstrap.lua'))()
