import {execFileSync} from 'node:child_process'
import {bolinCCases} from './bolin_c_chain_cases.mjs'
for(const c of bolinCCases)execFileSync(process.execPath,['scripts/verify_bolin_native_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-${c.scenario}-runtime-lcg104.json`,c.mode,c.scenario],{stdio:'inherit'})
console.log(`${bolinCCases.length} actual GameSession Bolin Giant Slayer chains / ${bolinCCases.reduce((n,c)=>n+c.ticks,0)} complete frames passed`)
