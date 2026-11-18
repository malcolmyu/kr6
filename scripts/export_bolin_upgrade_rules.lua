EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local UP=require('upgrades');local _,apply=debug.getupvalue(UP.patch_templates,6);UP:set_levels({});apply(UP,{})
local rules,order={},{};for _,name in ipairs(UP._keys)do if name:find('hero_bolin_',1,true)==1 then order[#order+1]=name;rules[name]=UP.list[name]end end
local encode=dofile('scripts/precise_json.lua');local f=assert(io.open('public/data/bolin-upgrades.json','w'));f:write(encode({order=order,upgrades=rules}));f:close();print(#order..' original ordered Bolin upgrade definitions exported')
