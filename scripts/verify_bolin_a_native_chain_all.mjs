import {execFileSync} from 'node:child_process'
import {bolinACases} from './bolin_a_chain_cases.mjs'
for(const c of bolinACases)execFileSync(process.execPath,['scripts/verify_bolin_native_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-${c.scenario}-runtime-lcg104.json`,c.mode,c.scenario],{stdio:'inherit'})
console.log(`${bolinACases.length} actual GameSession Bolin Smoke Mortar chains / ${bolinACases.reduce((n,c)=>n+c.ticks,0)} complete frames passed`)
