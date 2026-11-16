TICK_LENGTH=1/30;EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local E,P,G=require('entity_db'),require('path_db'),require('grid_db');local rows={}
for stage=1,3 do
 local prefix=string.format('level%02d',stage);G:load(prefix);P:load(prefix,{left=-512/3,right=1024+512/3,bottom=0,top=768})
 local level=dofile(KR_PATH_GAME..'/data/levels/'..prefix..'_data.lua')
 for index,map in ipairs(level.entities_list)do if map.template=='decal_defend_point5'then for _,tick in ipairs({1,19,6079})do
  local e=E:create_entity(map.template);e.pos=table.clone(map.pos)
  for key,value in pairs(map)do if key:sub(1,7)=='editor.'then e.editor[key:sub(8)]=value end end
  local store={tick_ts=tick*TICK_LENGTH,entities={},level={locations={}}};assert(e.main_script.insert(e,store));local s=e.render.sprites[1]
  rows[#rows+1]={stage=stage,index=index,tick=tick,pos=e.pos,name=s.name,alpha=s.alpha,flip=s.flip_x,z=s.z,anchor=s.anchor,offset=s.offset,at=s.ts,exits=store.level.locations.exits,defend=table.deepclone(P.defend_point_node)}
 end end end
end
local f=assert(io.open('analysis/defend-point-oracle.json','w'));f:write(dofile('scripts/precise_json.lua')(rows));f:close();print(#rows..' original first-three-stage defend marker insertions')
