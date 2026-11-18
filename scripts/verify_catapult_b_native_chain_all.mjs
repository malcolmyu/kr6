import {execFileSync} from 'node:child_process'
for(const [suffix,rank,mode]of [['',1,'normal'],['-rank3',3,'normal'],['-cluster',2,'cluster'],['-sale',3,'sale-after-tar']])execFileSync(process.execPath,['scripts/verify_catapult_native_area_chain.mjs',`analysis/level-entity-bootstrap-3-campaign-cleared-catapult-native-area-b${suffix}-runtime-lcg104.json`,String(rank),mode,'skill_b'],{stdio:'inherit'})
console.log('Four actual GameSession catapult B native chains / 3600 complete frames passed')
