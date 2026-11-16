EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua');local J=require('dkjson');local rows={}
for _,start in ipairs({0,1,3,11,30,63,100,1000,65530})do for _,seed in ipairs({1,17,104,999})do
 local state=seed;local function draw(n)state=(state*1664525+1013904223)%4294967296;return state%n end
 local t,steps={},{}
 local function record(key,value)t[key]=value;local entries={};for k,v in pairs(t)do entries[#entries+1]={k,v}end;steps[#steps+1]={key=key,value=value,entries=entries}end
 for i=0,39 do record(start+i,i+1)end
 for i=1,120 do local key=start+draw(100);record(key,draw(3)==0 and false or i+100)end
 for i=0,70 do record(start+i,nil)end
 for i=0,39 do record(i,i+1)end
 for i=1,180 do local key=draw(2)==0 and draw(150)or start+draw(150);local kind=draw(4);if kind==0 then record(key,nil)elseif kind==1 then record(key,false)else record(key,i)end end
 rows[#rows+1]={start=start,seed=seed,steps=steps}
end end
local f=assert(io.open(arg[1]or'analysis/lua-entity-table-oracle.json','w'));f:write(J.encode({version=jit.version,arch=jit.arch,rows=rows}));f:close();print(#rows..' numeric-key Lua next insertion/deletion/resize traces exported')
