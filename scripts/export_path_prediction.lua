EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local P,G,E,J=require('path_db'),require('grid_db'),require('entity_db'),require('dkjson')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end;love.filesystem.load=loadfile
local rows={}
for stage=1,3 do
 local name=string.format('level%02d',stage);G:load(name);P:load(name,{left=-512/3,right=1024+512/3,bottom=0,top=768})
 for pi,lanes in ipairs(P.paths)do for spi,lane in ipairs(lanes)do for _,ni in ipairs({1,math.floor(#lane*.5),#lane-2,#lane})do for _,motion in ipairs({{0,0},{7,24},{-40,0},{0,72}})do for _,seconds in ipairs({0,.325,.725,1,2.05})do
  local e=E:create_entity('enemy_bandit');e.nav_path={pi=pi,spi=spi,ni=ni};e.pos={x=lane[ni].x+2.25,y=lane[ni].y-1.75};e.motion.speed={x=motion[1],y=motion[2]}
  rows[#rows+1]={stage=stage,pi=pi,spi=spi,ni=ni,pos=e.pos,motion=motion,seconds=seconds,offset=P:predict_enemy_node_advance(e,seconds),predicted=P:predict_enemy_pos(e,seconds)}
 end end end end end
end
local f=assert(io.open('analysis/path-prediction-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original first-three-stage path node predictions exported')
