EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local S,SSO,J=require('systems'),require('klove.sso'),require('dkjson')
assert(SSO.bb_mode and SSO.bb_step==128)
local rows={}
for _,origin in ipairs({{x=0,y=0},{x=-512/3,y=0},{x=155.5,y=-77.25}})do for _,stride in ipairs({1,7,257})do
 local entities,frames={},{}
 local function actor(i,frame)
  local e={id=i*stride,pos={x=origin.x+((i*37+frame*19)%1409)-256,y=origin.y+((i*71-frame*13)%1001)-128},health={dead=i%11==0},vis={flags=i%2},pending_removal=i%17==0}
  if i%7==0 then e.health=nil end;if i%9==0 then e.vis=nil end;if i%13==0 then e.pos=nil end
  if i%19==0 then e.health=0 end;if i%23==0 then e.vis=false end;if i%29==0 then e.pending_removal=0 end
  -- Exact cell edges, negative coordinates and positions outside viewport.
  if i<=8 then e.pos={x=origin.x+({-128,-.000000001,0,.000000001,128,128.000000001,256,2048})[i],y=origin.y}end
  return e
 end
 for frame=1,6 do
  local ops={};local function set(i)local e=actor(i,frame);entities[e.id]=e;ops[#ops+1]={op='set',entity=table.deepclone(e)}end
  local function remove(i)entities[i*stride]=nil;ops[#ops+1]={op='delete',id=i*stride}end
  if frame==1 then for i=1,120 do set(i)end
  elseif frame==2 then for i=1,120,7 do remove(i)end;for i=2,120,11 do set(i)end
  elseif frame==3 then for i=1,120,7 do set(i)end
  elseif frame==4 then for i=121,159 do set(i)end
  elseif frame==5 then for i=2,180,3 do remove(i)end
  else for i=160,190 do set(i)end end
  local store={entities=entities,visible_coords={left=origin.x,right=origin.x+1365.3333333333,bottom=origin.y,top=origin.y+768}}
  S.sso:on_update(1/30,frame/30,store)
  local grid=assert(SSO.bb_grids.targets);local cells={}
  for ix,column in pairs(grid.grid)do for iy,cell in pairs(column)do local ids={};for _,e in ipairs(cell)do ids[#ids+1]=e.id end;cells[#cells+1]={x=ix,y=iy,ids=ids}end end
  table.sort(cells,function(a,b)return a.x==b.x and a.y<b.y or a.x<b.x end)
  local queries={}
  for _,query in ipairs({{0,0,0},{0,0,127.999999999},{0,0,128},{128,0,0},{128,0,.000000001},{512,384,190},{-128,-128,100},{2048,0,0},{4096,4096,1},{512,384,2000}})do
   for _,kind in ipairs({'none','zero','even','first-cell-entry','circle'})do
    local x,y,r=origin.x+query[1],origin.y+query[2],query[3];local calls={}
    local predicate
    if kind~='none'then predicate=function(k,e)
     calls[#calls+1]={key=k,id=e.id}
     if kind=='zero'then return 0 elseif kind=='even'then return e.id%2==0 elseif kind=='first-cell-entry'then return k==1 else return(e.pos.x-x)^2+(e.pos.y-y)^2<=r*r end
    end end
    local result={{id=-1}};SSO:filter(result,'targets',x,y,r,predicate);local ids={};for _,e in ipairs(result)do ids[#ids+1]=e.id end
    queries[#queries+1]={x=x,y=y,radius=r,kind=kind,result=ids,calls=calls}
   end
  end
  frames[#frames+1]={ops=ops,cells=cells,bounds={grid.min_ix,grid.max_ix,grid.min_iy,grid.max_iy},queries=queries,same=SSO:is_all_entities(entities),other=SSO:is_all_entities({})}
 end
 rows[#rows+1]={origin=origin,stride=stride,frames=frames}
end end
-- The shipped encoder truncates fractional doubles to ~14 digits. That can
-- move an exact cell-edge point across ceil(), so preserve binary64 inputs.
local function precise(value)
 if type(value)=='number'and(value~=math.floor(value)or value==0 and 1/value<0)then return'@f64:'..string.format('%.17g',value)
 elseif type(value)=='table'then local out={};for k,v in pairs(value)do out[k]=precise(v)end;return out end
 return value
end
local f=assert(io.open('analysis/native-spatial-entities-oracle.json','w'));f:write(J.encode(precise({runtime=jit.version,format='float64-tagged',step=SSO.bb_step,rows=rows})));f:close()
print('Original SSO per-tick grid creation/filter candidate and predicate order exported')
