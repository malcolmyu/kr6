EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5129 5238 6348')==0)
local J,E,UP,GS=require('dkjson'),require('entity_db'),require('upgrades'),require('game_settings')
local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua')
local function clean(value,keepFunction)if type(value)=='function'then if keepFunction then local i=debug.getinfo(value);return{__lua_function={source=i.source,line=i.linedefined,last=i.lastlinedefined}}end;return nil elseif type(value)~='table'then return value end;local out={};for key,v in pairs(value)do out[key]=clean(v,key=='value'or key=='fn_damage')end;return out end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5129 5238')==0)
local loadGraph=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5129.lua'))
debug.setupvalue(loadGraph,1,{load=function(path)local rows={};for line in io.lines(path)do local row={};for cell in(line..'\t'):gmatch('(.-)\t')do row[#row+1]=cell end;rows[#rows+1]=row end;return rows end})
local graphs=loadGraph({allocate=function()return{}end},'/data/kui_templates/balance_hex.tsv').graphs
local out={graphs={},nodes={},upgrades={},templates={},points={},auraAttackComponent=clean(E:clone_c('aura_attack'))}
out.pointsPerStage=GS.upgrades_points_per_stage
local kinds={'archers','barracks','mages','artillery'}
for _,kind in ipairs(kinds)do local name=kind;out.graphs[name]=graphs[name];out.nodes[name]=data.data_upgrades[name];for id,node in pairs(out.graphs[name])do if out.nodes[name][id]then node.cost=out.nodes[name][id].cost end end end
for key,upgrade in pairs(UP.list)do for _,kind in ipairs(kinds)do if upgrade.class==kind then out.upgrades[key]=clean(upgrade);for _,patch in ipairs(upgrade.patches or{})do for _,name in ipairs(patch.templates)do out.templates[name]=clean(E:get_template(name))end end end end end
local base={};for name in pairs(out.templates)do base[name]=table.deepclone(E:get_template(name))end
local apply;for i=1,20 do local name,fn=debug.getupvalue(UP.patch_templates,i);if name=='patch_upgrades'then apply=fn end end;assert(apply)
local oldT,newTemplates
for i=1,20 do local name,value=debug.getupvalue(apply,i);if name=='T'then oldT={index=i,value=value};debug.setupvalue(apply,i,function(name)return assert(newTemplates[name],name)end)end end;assert(oldT)
local oldLevels,oldMax=UP.levels,UP.max_level;UP.max_level=10
local selectedSet={};local evaluate=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5238.lua'))
for i=1,20 do local name=debug.getupvalue(evaluate,i);if not name then break end;assert(name=='UPGR');debug.setupvalue(evaluate,i,{has_upgrade=function(_,source,id)return selectedSet[id]or false end})end
local patchRows,graphRows={},{ }
for _,kind in ipairs(kinds)do
 local source=kind;local seen={}
 for _,branch in ipairs({'a','b'})do
  local full={'l1','l2','l3'..branch,'l4'..branch,'ulti'}
  for length=0,#full do
   local selected={};for i=1,length do selected[i]=full[i]end;local key=table.concat(selected,',')
   if not seen[key]then
    seen[key]=true;selectedSet={};for _,id in ipairs(selected)do selectedSet[id]=true end
    for points=0,20 do graphRows[#graphRows+1]={source=source,selected=selected,points=points,result=evaluate({graph=graphs},source,points)}end
    newTemplates=table.deepclone(base);UP.levels={[source]=selected};apply(UP,{})
    local changes={};for _,id in ipairs(selected)do local upgrade=UP.list[source..'_'..id];for _,patch in ipairs(upgrade and upgrade.patches or{})do for _,name in ipairs(patch.templates)do changes[name]=clean(newTemplates[name])end end end
    patchRows[#patchRows+1]={kind=kind,selected=selected,templates=changes}
   end
  end
 end
end
debug.setupvalue(apply,oldT.index,oldT.value);UP.levels,UP.max_level=oldLevels,oldMax
local function write(path,value)local f=assert(io.open(path,'w'));f:write(J.encode(value));f:close()end
write('analysis/global-upgrade-base-templates.json',out.templates);out.templates=nil;write('public/data/global-upgrades.json',out);write('analysis/global-upgrade-patch-oracle.json',patchRows);write('analysis/global-upgrade-graph-oracle.json',graphRows)
print(#patchRows..' original global template patch sets and '..#graphRows..' native graph states exported')

local pointFn=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line6348.lua'))
local pointProfile
local bindings={storage={load_slot=function()return pointProfile end},GS=GS,map_data=data,log=require('klua.log'):new('global-points')}
for i=1,20 do local name=debug.getupvalue(pointFn,i);if not name then break end;assert(bindings[name],name);debug.setupvalue(pointFn,i,bindings[name])end
local pointRows={}
for stage=1,3 do for stars=1,3 do for _,iron in ipairs({false,true})do for _,selection in ipairs({{}, {mages={'l1'},artillery={'l1'}}, {mages={'l1'},artillery={'l1','l2'}}})do
 local levels={};for i=1,stage do levels[i]={stars};if iron then levels[i][2]=true end end;levels[stage+1]={}
 local selected={};for _,kind in ipairs(kinds)do selected[kind]=selection[kind]or{}end
 pointProfile={levels=levels,upgrades_trees=selected}
 pointRows[#pointRows+1]={stage=stage,stars=stars,iron=iron,selected=selection,remaining=pointFn({upgrades_groups=kinds})}
end end end end
write('analysis/global-upgrade-points-oracle.json',pointRows)
