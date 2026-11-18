import {execFileSync} from 'node:child_process'
const modes=['normal','left','up','down','up-left','down-left','moving','remove-before','remove-after','stun-before','stun-after','stun-boundary','no-target','death']
for(const mode of modes){const scenario='bolin-base'+(mode==='normal'?'':'-'+mode);execFileSync(process.execPath,['scripts/verify_bolin_native_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-${scenario}-runtime-lcg104.json`,mode,scenario],{stdio:'inherit'})}
console.log('Fourteen actual GameSession Bolin base/life chains / 12800 complete frames passed')
