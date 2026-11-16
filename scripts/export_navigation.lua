EXPORT_ENTITIES_NO_WRITE=true
dofile('scripts/export_entities.lua')
love.filesystem.isFile=function(path)local f=io.open(path);if f then f:close();return true end;return false end
love.filesystem.load=loadfile
local G=require('grid_db');local P=require('path_db');local U=require('utils');local E=require('entity_db');local J=require('dkjson')
local bounds={left=-512/3,right=1024+512/3,bottom=0,top=768}
local metadata,traces,placements={},{},{}
for stage=1,3 do
  local prefix=string.format('level%02d',stage)
  G:load(prefix);P:load(prefix,bounds)
  local data=dofile(KR_PATH_GAME..'/data/levels/'..prefix..'_data.lua')
  for _,entity in ipairs(data.entities_list) do
    if entity.template=='decal_defend_point5' then
      for _,node in ipairs(P:nearest_nodes(entity.pos.x,entity.pos.y)) do
        if node[4]<P:path_width(node[1])/2 then P:set_defend_point_node(node[1],node[3]) end
      end
    end
  end
  metadata[stage]={averageNodeDistance=P.average_node_dist,starts=table.deepclone(P.path_start_node),ends=table.deepclone(P.path_end_node),defend=table.deepclone(P.defend_point_node),connections=table.deepclone(P.path_connections),bounds=bounds}
  local rallyNodes,targetNodes,noBackwardsNodes,widths={},{},{},{}
  for pi,lanes in ipairs(P.paths)do
    widths[pi]=P:path_width(pi);rallyNodes[pi]={};targetNodes[pi]={};noBackwardsNodes[pi]={}
    for ni=1,#lanes[1]do rallyNodes[pi][ni]=P:is_node_valid(pi,ni,NF_RALLY);targetNodes[pi][ni]=P:is_node_valid(pi,ni);noBackwardsNodes[pi][ni]=P:is_node_valid(pi,ni,NF_NO_BACKWARDS) end
  end
  metadata[stage].noBackwardsNodes=noBackwardsNodes;metadata[stage].targetNodes=targetNodes;metadata[stage].rallyNodes=rallyNodes;metadata[stage].widths=widths
  for x=-192,1216,32 do for y=-48,816,32 do
    placements[#placements+1]={stage=stage,pos={x=x,y=y},nearby=P:valid_node_nearby(x,y,nil,NF_RALLY) or false,terrain=G:cell_is_only(x,y,2049)}
  end end
  local cases=stage==1 and {{1,2}} or stage==2 and {{3,1}} or {{1,2},{5,3}}
  for _,case in ipairs(cases) do
    local e=E:create_entity('enemy_bandit')
    e.nav_path.pi=case[1];e.nav_path.spi=case[2];e.nav_path.ni=P:get_start_node(case[1]);e.pos=P:node_pos(case[1],case[2],e.nav_path.ni)
    local trace={stage=stage,pi=case[1],spi=case[2],speed=e.motion.max_speed,frames={}}
    for frame=1,3000 do
      local next=P:next_entity_node(e,1/30)
      if next then U.set_destination(e,next);U.walk(e,1/30) end
      local done=e.nav_path.ni>=P:get_end_node(e.nav_path.pi) and not P.path_connections[e.nav_path.pi]
      trace.frames[#trace.frames+1]={pos=table.deepclone(e.pos),pi=e.nav_path.pi,ni=e.nav_path.ni,done=done}
      if done then break end
    end
    assert(trace.frames[#trace.frames].done,'Navigation never reached goal')
    traces[#traces+1]=trace
  end
end
local f=assert(io.open('public/data/navigation.json','w'));f:write(assert(J.encode(metadata)));f:close()
for stage=1,3 do
  local path=string.format('public/data/level%02d.json',stage)
  local input=assert(io.open(path));local data=assert(J.decode(input:read('*a')));input:close()
  data.navigation=metadata[stage]
  f=assert(io.open(path,'w'));f:write(assert(J.encode(data)));f:close()
end
f=assert(io.open('analysis/navigation-oracle.json','w'));f:write(assert(J.encode(traces)));f:close()

f=assert(io.open('analysis/placement-oracle.json','w'));f:write(assert(J.encode(placements)));f:close()
