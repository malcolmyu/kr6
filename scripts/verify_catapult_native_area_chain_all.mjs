import {execFileSync} from 'node:child_process'
const cases=[['',1,'normal'],['-rank3',3,'normal'],['-cluster',2,'cluster'],['-sale',3,'sale-after-tar'],['-target-remove',2,'remove-target-after-tar'],['-aligned',1,'aligned']]
for(const [suffix,rank,mode]of cases)execFileSync(process.execPath,['scripts/verify_catapult_native_area_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-catapult-native-area-a${suffix}-runtime-lcg104.json`,String(rank),mode],{stdio:'inherit'})
console.log('Six actual GameSession catapult A native chains / 5000 complete frames passed')
