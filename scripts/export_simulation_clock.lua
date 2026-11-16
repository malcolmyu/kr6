EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/lib/klove/simulation.lua 112')==0)
local step=assert(loadfile('analysis/function-bytecode/simulation_line112.lua'));local J=require('dkjson');local rows={};local wanted={};for _,tick in ipairs({1,3,7,31,120,121,127,131,134,1000,6000})do wanted[tick]=true end
local store={tick=0,tick_ts=0,tick_length=1/30,pending_inserts={},pending_removals={}}
local self={store=store,systems_on_update={{on_update=function(_,dt,time,s)if wanted[s.tick]then rows[#rows+1]={tick=s.tick,time=string.format('%.17g',s.tick_ts),systemTime=string.format('%.17g',time),dt=string.format('%.17g',dt)}end end}}}
for i=1,6000 do step(self)end
local f=assert(io.open('analysis/simulation-clock-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original simulation step clock exported at exact double precision')
