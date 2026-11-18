EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local art=require('dkjson').decode(assert(io.open('public/data/towers-art.json')):read('*a'));local frames={}
for _,a in ipairs(art.exos.bolin_mineDef.animations)do frames[a.name]=#a.frames end
local f=assert(io.open('public/data/bolin-mines.json','w'));f:write(dofile('scripts/precise_json.lua')({frames=frames,flyingFlag=F_FLYING,land=TERRAIN_LAND,objectZ=Z_OBJECTS}));f:close()
