import {execFileSync} from 'node:child_process'
import {bolinBCases} from './bolin_b_chain_cases.mjs'
for(const c of bolinBCases)execFileSync(process.execPath,['scripts/verify_bolin_native_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-${c.scenario}-runtime-lcg104.json`,c.mode,c.scenario],{stdio:'inherit'})
console.log(`${bolinBCases.length} actual GameSession Bolin Mine Field chains / ${bolinBCases.reduce((n,c)=>n+c.ticks,0)} complete frames passed`)
