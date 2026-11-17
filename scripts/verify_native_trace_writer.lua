package.path='reference/apk/assets/gc64/lib/?.lua;'..package.path
local J=require('dkjson')
local value={format='float64-tagged',unknown={enabled=false,text='中文😀',nested={{x='@f64:-0',y='@f64:0.033333333333333333'},{17,23}}},frames={{tick=1,entities={{id=4,unknown={extra='retained',flag=false}}},inserts={7,3},removals={}},{tick=2,status=false,entities={},pos={x='@f64:527.76666666666665',y=0}}},events={{tick=1,id=4,kind='create'}},random={.25,.5,.75}}
local path='analysis/native-trace-writer-fixture.json'
dofile('scripts/write_native_trace_json.lua')(path,value)
local f=assert(io.open(path));local actual=assert(J.decode(f:read('*a')));f:close()
local expected=assert(J.decode(J.encode(value)))
local function same(a,b)
 assert(type(a)==type(b),'type differs')
 if type(a)~='table'then assert(a==b,'scalar differs');return end
 for k,v in pairs(a)do assert(b[k]~=nil,'missing field '..tostring(k));same(v,b[k])end
 for k in pairs(b)do assert(a[k]~=nil,'extra field '..tostring(k))end
end
same(actual,expected)
assert(#actual.frames==2 and actual.frames[1].inserts[1]==7 and actual.frames[1].inserts[2]==3)
print('Native streamed writer preserves all frame/metadata fields, ordering of arrays, unknown nested values, false, UTF-8 and precise float tags; small result equals unstreamed dkjson.')
