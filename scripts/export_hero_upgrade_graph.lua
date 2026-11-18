EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local J=require('dkjson');local data=dofile('reference/apk/assets/gc64/kr6-phone/data/map_data.lua');local GS=require('game_settings')
assert(os.execute('python3 scripts/extract_luajit_functions.py reference/apk/assets/gc64/kr6/kviews_screen_map_game.lua 5129 5238')==0)
local fn=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5129.lua'))
local tsv={load=function(path)local rows={};for line in io.lines(path)do local row={};for cell in (line..'\t'):gmatch('(.-)\t')do row[#row+1]=cell end;rows[#rows+1]=row end;return rows end}
debug.setupvalue(fn,1,tsv)
local g=fn({allocate=function()return{}end},'/data/kui_templates/balance_hex.tsv')
for _,name in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do
 assert(g.graphs[name],name)
 for id,node in pairs(g.graphs[name])do if data.data_upgrades[name][id]then node.cost=data.data_upgrades[name][id].cost end end
end
local out={graphs={},nodes={},points=GS.skill_points_for_hero_level}
for _,name in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do out.graphs[name]=g.graphs[name];out.nodes[name]=data.data_upgrades[name]end
local f=assert(io.open('public/data/hero-upgrades.json','w'));f:write(J.encode(out));f:close()
-- Run the actual original graph evaluator, with only the saved upgrade lookup supplied.
local evaluate=assert(loadfile('analysis/function-bytecode/kviews_screen_map_game_line5238.lua'));local purchased={}
local UPGR={has_upgrade=function(_,source,id)return purchased[id]or false end}
for i=1,20 do local n=debug.getupvalue(evaluate,i);if not n then break end;assert(n=='UPGR',n);debug.setupvalue(evaluate,i,UPGR)end
local cases={}
for _,name in ipairs({'hero_gerald','hero_zefira','hero_bolin'})do
 for _,selected in ipairs({{}, {'skill_a'},{'skill_b'},{'skill_a','upg_sa1'},{'skill_a','upg_sa1','upg_sa2','upg_a'}, {'skill_a','skill_b','skill_c','upg_a','upg_b','upg_c'}})do
  for points=0,12 do purchased={};for _,id in ipairs(selected)do purchased[id]=true end
   cases[#cases+1]={hero=name,selected=selected,points=points,result=evaluate({graph=g.graphs},name,points)}
  end
 end
end
f=assert(io.open('analysis/hero-graph-oracle.json','w'));f:write(J.encode(cases));f:close()
