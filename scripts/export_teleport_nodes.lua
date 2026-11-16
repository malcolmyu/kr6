EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local G=require('grid_db');local P=require('path_db');local J=require('dkjson');local function read(path)local f=assert(io.open(path));local t=J.decode(f:read('*a'));f:close();return t end
local navigation=read('public/data/navigation.json')
for stage=1,3 do local prefix=string.format('level%02d',stage);G:load(prefix);P:load(prefix,{left=-512/3,right=1024+512/3,bottom=0,top=768});local flags={}
 for pi,lanes in ipairs(P.paths)do flags[pi]={};for ni=1,#lanes[1]do flags[pi][ni]=P:is_node_valid(pi,ni,NF_NO_TELEPORT)end end
 local path='public/data/'..prefix..'.json';local data=read(path);data.navigation.teleportNodes=flags;navigation[stage].teleportNodes=flags
 local f=assert(io.open(path,'w'));f:write(J.encode(data));f:close()
end
local f=assert(io.open('public/data/navigation.json','w'));f:write(J.encode(navigation));f:close()
