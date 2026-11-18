EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local features=require('features');local out={}
for k,v in pairs(features)do if type(v)~='function'and type(v)~='table'then out[k]=v end end
local f=assert(io.open('analysis/native-progression-features.json','w'));f:write(require('dkjson').encode(out));f:close()
print('demo='..tostring(features.demo)..', censored_cn='..tostring(features.censored_cn))
