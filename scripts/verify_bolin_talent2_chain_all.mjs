import {execFileSync} from 'node:child_process'
for(const mode of ['normal','armor','immune','boss','small','moving','stun-before','death']){
 const scenario='bolin-talent2-'+mode
 execFileSync(process.execPath,['scripts/verify_bolin_native_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-${scenario}-runtime-lcg104.json`,mode,scenario],{stdio:'inherit'})
}
console.log('8 legal Explosive Round + Giant Slayer chains / 14400 complete frames passed')
