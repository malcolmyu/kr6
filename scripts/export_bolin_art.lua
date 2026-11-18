package.path='reference/apk/assets/gc64/lib/?.lua;'..package.path
-- Read-only staging before adding this reachable hero to the browser bundle.
local atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/go_hero_bolin.lua')
local exos={};for _,name in ipairs({'bolinDef','bolin_mineDef','bolin_hitfxDef','bolin_mortar_smokeDef','bolin_ulti_decalDef'})do exos[name]=dofile('reference/apk/assets/gc64/kr6/data/exoskeletons/go_hero_bolin/'..name..'.exo3')end
local animations=dofile('reference/apk/assets/gc64/kr6/data/animations/go_hero_bolin/hero_bolin.lua');local textures={};for _,f in pairs(atlas)do textures[f.a_name]=true end
local files={};for name in pairs(textures)do files[#files+1]=name end
local out={atlas=atlas,exos=exos,animations=animations,textures=files};local encode=dofile('scripts/precise_json.lua');local f=assert(io.open('analysis/bolin-art.json','w'));f:write(encode(out));f:close();print('Original Bolin atlas, five EXO definitions and animation table staged read-only')
