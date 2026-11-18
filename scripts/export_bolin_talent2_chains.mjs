import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs'
import {gzipSync} from 'node:zlib'
for(const mode of ['normal','armor','immune','boss','small','moving','stun-before','death']){
 const scenario='bolin-talent2-'+mode,profile='analysis/native-runtime-bolin-talent2-profile.json',path=`analysis/level-entity-bootstrap-3-campaign-cleared-${scenario}-runtime-lcg104.json`
 const log=execFileSync('reference/luajit-beta3/src/luajit',['scripts/export_bolin_native_chain.lua','3','campaign','cleared',scenario,'runtime','1800','analysis/native-runtime-bolin-base-input.json','lcg104','normal',profile,mode],{encoding:'utf8'})
 writeFileSync(`analysis/${scenario}-native-export.log`,log);writeFileSync(path+'.gz',gzipSync(readFileSync(path)));unlinkSync(path);console.log(scenario+' exported')
}
