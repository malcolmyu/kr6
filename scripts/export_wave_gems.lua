-- Static wave metadata from shipped wave_db / game_settings, not a runtime trace.
EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local W,GS,J=require('wave_db'),require('game_settings'),require('dkjson')
local rows={}
for stage=1,3 do for _,mode in ipairs({'campaign','iron'})do
 local f=assert(io.open(string.format('reference/apk/assets/gc64/kr6/data/waves/level%02d_waves_%s.tsv',stage,mode)));local text=f:read('*a');f:close()
 local modeId=mode=='campaign'and GAME_MODE_CAMPAIGN or GAME_MODE_IRON
 assert(W:load_tsv(string.format('level%02d',stage),modeId,text))
 local counts={};for i=1,W:groups_count()do counts[i]=#W:get_spawns_for_wave(i)end
 rows[stage..'-'..mode]={keepers=W:get_gem_keepers(),spawns=counts,perWave=math.floor((GS.gems_per_level[stage]or 100)*GS.gems_factor_per_mode[modeId]/W:all_waves_count())}
end end
local f=assert(io.open('public/data/wave-gems.json','w'));f:write(J.encode(rows));f:close()
