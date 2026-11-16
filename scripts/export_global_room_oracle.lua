EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5129 5238 6008')==0)
local J=require('dkjson');local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua')
local function read(path)return J.decode(assert(io.open(path)):read('*a'))end
local function bind(fn,bindings)for i=1,30 do local name=debug.getupvalue(fn,i);if not name then break end;assert(bindings[name],name);debug.setupvalue(fn,i,bindings[name])end;return fn end
local slot,selectedSet;GGHexGrid={}
local pick=bind(assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line6008.lua')),{storage={load_slot=function()return slot end,save_slot=function()return true end},UPGR={set_levels=function()end},S={queue=function()end},log={error=function()end}})
local evaluate=bind(assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5238.lua')),{UPGR={has_upgrade=function(_,source,id)return selectedSet[id]or false end}})
local loadGraph=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5129.lua'))
debug.setupvalue(loadGraph,1,{load=function(path)local rows={};for line in io.lines(path)do local row={};for cell in(line..'\t'):gmatch('(.-)\t')do row[#row+1]=cell end;rows[#rows+1]=row end;return rows end})
local graphs=loadGraph({allocate=function()return{}end},'/data/kui_templates/balance_hex.tsv').graphs;local rows={}
for _,kind in ipairs({'archers','barracks','mages','artillery'})do for id,node in pairs(graphs[kind])do if data.data_upgrades[kind][id]then node.cost=data.data_upgrades[kind][id].cost end end end
for _,r in ipairs(read('analysis/global-upgrade-patch-oracle.json'))do
 local spent=0;selectedSet={};for _,id in ipairs(r.selected)do selectedSet[id]=true;spent=spent+data.data_upgrades[r.kind][id].cost end
 for _,points in ipairs({0,2,4,6,9,14,20})do if spent<=points then
  local graph=evaluate({graph=graphs},r.kind,points-spent)
  for id,node in pairs(data.data_upgrades[r.kind])do if type(node)=='table'and id~='origin'then
   slot={upgrades_trees={[r.kind]=table.deepclone(r.selected)}};local blocked=graph.block_buttons[id]
   pick({map_data=data,group=r.kind,idx=id,swapable=blocked~=nil,swapable_upgrade=blocked,unavailable=not graph.enable_buttons[id]and not blocked,is_upgrade_picked=function()return table.contains(r.selected,id)end,set_picked=function()end,get_parent_of_class=function()return{refresh_graph=function()end}end,play_buy_animation=function()end})
   rows[#rows+1]={kind=r.kind,points=points,selected=r.selected,id=id,result=slot.upgrades_trees[r.kind]}
  end end
 end end
end
local f=assert(io.open('analysis/global-room-pick-oracle.json','w'));f:write(J.encode(rows));f:close();print(#rows..' original global node confirmations and branch swaps exported')
