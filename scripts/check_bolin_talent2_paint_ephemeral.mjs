import {execFileSync} from 'node:child_process'
import {readdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs'
const scenario='bolin-talent2-paint',before=new Set(readdirSync('analysis')),args=['3','campaign','cleared',scenario,'runtime','1300','analysis/native-runtime-bolin-base-input.json','lcg104','normal','analysis/native-runtime-bolin-talent2-profile.json','normal']
let summary
try{
 execFileSync('reference/luajit-beta3/src/luajit',['scripts/export_bolin_native_chain.lua',...args],{stdio:'pipe'})
 execFileSync('reference/luajit-beta3/src/luajit',['scripts/export_bolin_controlled_paint.lua',...args],{stdio:'pipe'})
 execFileSync(process.execPath,['scripts/browser_bolin_controlled_paint.mjs',scenario],{stdio:'inherit'})
 summary=JSON.parse(readFileSync(`analysis/browser-controlled-paint-${scenario}.json`,'utf8'))
}finally{
 for(const name of readdirSync('analysis'))if(!before.has(name)&&name.includes(scenario))unlinkSync('analysis/'+name)
 if(summary)writeFileSync('analysis/bolin-talent2-paint-summary.json',JSON.stringify({...summary,oracleRetention:'Deleted after verification'},null,2)+'\n')
}
