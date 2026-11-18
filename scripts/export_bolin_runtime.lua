EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local f=assert(io.open('public/data/bolin-runtime.json','w'));f:write(dofile('scripts/precise_json.lua')({bossFlags=bit.bor(F_BOSS,F_MINIBOSS),bossFlag=F_BOSS,minibossFlag=F_MINIBOSS}));f:close()
