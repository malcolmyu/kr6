import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs'
import {gzipSync} from 'node:zlib'
import {bolinBCases} from './bolin_b_chain_cases.mjs'
for(const c of bolinBCases.filter(c=>process.argv.length===2||process.argv.slice(2).includes(c.mode))){
 const profile=`analysis/native-runtime-${c.scenario}-profile.json`,path=`analysis/level-entity-bootstrap-3-campaign-cleared-${c.scenario}-runtime-lcg104.json`
 writeFileSync(profile,JSON.stringify({heroXp:{hero_bolin:72000,hero_zefira:0},heroUpgrades:{hero_bolin:c.nodes,hero_zefira:[]},powerXp:{},globalUpgrades:{}}))
 const log=execFileSync('reference/luajit-beta3/src/luajit',['scripts/export_bolin_b_native_chain.lua','3','campaign','cleared',c.scenario,'runtime',String(c.ticks),'analysis/native-runtime-bolin-base-input.json','lcg104','normal',profile,c.mode],{encoding:'utf8'})
 writeFileSync(`analysis/${c.scenario}-native-export.log`,log)
 if(c.scenario!=='bolin-b'){writeFileSync(path+'.gz',gzipSync(readFileSync(path)));unlinkSync(path)}
 console.log(`${c.scenario}/${c.mode}/rank${c.rank}: ${c.ticks} original frames exported`)
}
