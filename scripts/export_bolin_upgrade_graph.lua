-- Stage the original graph and evaluator outputs without changing web data.
local f=assert(io.open('scripts/export_hero_upgrade_graph.lua'));local source=f:read('*a');f:close()
local n;source,n=source:gsub("{'hero_gerald','hero_zefira','hero_bolin'}","{'hero_bolin'}");assert(n==3)
source=source:gsub('public/data/hero%-upgrades.json','analysis/bolin-hero-upgrades.json'):gsub('analysis/hero%-graph%-oracle.json','analysis/bolin-hero-graph-oracle.json')
assert(loadstring(source,'@scripts/export_hero_upgrade_graph.lua'))()
