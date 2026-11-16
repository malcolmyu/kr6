EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J,E,UP,GS=require('dkjson'),require('entity_db'),require('upgrades'),require('game_settings')
local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua')
local function clean(value)if type(value)=='function'then return nil elseif type(value)~='table'then return value end;local out={};for key,v in pairs(value)do out[key]=clean(v)end;return out end
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5129 5238')==0)
local loadGraph=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5129.lua'))
debug.setupvalue(loadGraph,1,{load=function(path)local rows={};for line in io.lines(path)do local row={};for cell in(line..'\t'):gmatch('(.-)\t')do row[#row+1]=cell end;rows[#rows+1]=row end;return rows end})
local graphs=loadGraph({allocate=function()return{}end},'/data/kui_templates/balance_hex.tsv').graphs
local out={graphs={},nodes={},upgrades={},templates={},points={0,1,2,3,4,5}}
local kinds={'reinforcements','rain_of_fire','royal_edict'}
for _,kind in ipairs(kinds)do local name='power_'..kind;out.graphs[name]=graphs[name];out.nodes[name]=data.data_upgrades[name];for id,node in pairs(out.graphs[name])do if out.nodes[name][id]then node.cost=out.nodes[name][id].cost end end end
for key,upgrade in pairs(UP.list)do for _,kind in ipairs(kinds)do if upgrade.class=='power_'..kind then out.upgrades[key]=clean(upgrade);for _,patch in ipairs(upgrade.patches or{})do for _,name in ipairs(patch.templates)do out.templates[name]=clean(E:get_template(name))end end end end end
local base={};for name in pairs(out.templates)do base[name]=table.deepclone(E:get_template(name))end
local apply;for i=1,20 do local name,fn=debug.getupvalue(UP.patch_templates,i);if name=='patch_upgrades'then apply=fn end end;assert(apply)
local oldT,newTemplates
for i=1,20 do local name,value=debug.getupvalue(apply,i);if name=='T'then oldT={index=i,value=value};debug.setupvalue(apply,i,function(name)return assert(newTemplates[name],name)end)end end;assert(oldT)
local oldLevels,oldMax=UP.levels,UP.max_level;UP.max_level=10
local selectedSet={};local evaluate=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5238.lua'))
for i=1,20 do local name=debug.getupvalue(evaluate,i);if not name then break end;assert(name=='UPGR');debug.setupvalue(evaluate,i,{has_upgrade=function(_,source,id)return selectedSet[id]or false end})end
local patchRows,graphRows={},{ }
for _,kind in ipairs(kinds)do
 local source='power_'..kind;local seen={}
 for _,l2 in ipairs({'l2a','l2b'})do for _,l4 in ipairs({'l4a','l4b'})do
  local full={l2,'l3',l4,l4=='l4a'and'l5a'or'l5b','l6'}
  for length=0,#full do
   local selected={};for i=1,length do selected[i]=full[i]end;local key=table.concat(selected,',')
   if not seen[key]then
    seen[key]=true;selectedSet={};for _,id in ipairs(selected)do selectedSet[id]=true end
    for points=0,6 do graphRows[#graphRows+1]={source=source,selected=selected,points=points,result=evaluate({graph=graphs},source,points)}end
    newTemplates=table.deepclone(base);UP.levels={[source]=selected};apply(UP,{})
    local changes={};for name in pairs(base)do changes[name]=clean(newTemplates[name])end
    patchRows[#patchRows+1]={kind=kind,selected=selected,templates=changes}
   end
  end
 end end
end
debug.setupvalue(apply,oldT.index,oldT.value);UP.levels,UP.max_level=oldLevels,oldMax
local function write(path,value)local f=assert(io.open(path,'w'));f:write(J.encode(value));f:close()end
write('public/data/power-upgrades.json',out);write('analysis/power-upgrade-patch-oracle.json',patchRows);write('analysis/power-upgrade-graph-oracle.json',graphRows)
print(#patchRows..' original power template patch sets and '..#graphRows..' native graph states exported')
