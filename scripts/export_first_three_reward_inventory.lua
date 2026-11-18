EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua');local out={}
for name,value in pairs(data)do if name:find('progression')then out[name]=value end end
local f=assert(io.open('analysis/native-progression-reward-inventory.json','w'));f:write(require('dkjson').encode(out));f:close()
