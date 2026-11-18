// Generate one native oracle at a time, verify, then remove every new artifact.
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,readdirSync,unlinkSync,existsSync} from 'node:fs'
const cases=[...['normal','armor','immune','boss','small','moving','stun-before','death'].map(mode=>({scenario:'bolin-talent2-'+mode,mode,ticks:1800,talent:true})),{scenario:'bolin-base',mode:'normal',ticks:1300,talent:false}]
const results=[]
for(const c of cases.filter(c=>process.argv.length===2||process.argv.slice(2).includes(c.mode))){
 const before=new Set(readdirSync('analysis')),profile=`analysis/ephemeral-${c.scenario}-profile.json`,path=`analysis/level-entity-bootstrap-3-campaign-cleared-${c.scenario}-runtime-lcg104.json`
 if(existsSync(path))throw Error('Refusing to overwrite existing oracle: '+path)
 try{
  const p=JSON.parse(readFileSync('analysis/native-runtime-bolin-talent2-profile.json','utf8'))
  if(!c.talent){p.heroUpgrades.hero_bolin=[];p.isolateBolinSkills=false}
  writeFileSync(profile,JSON.stringify(p))
  execFileSync('reference/luajit-beta3/src/luajit',['scripts/export_bolin_native_chain.lua','3','campaign','cleared',c.scenario,'runtime',String(c.ticks),'analysis/native-runtime-bolin-base-input.json','lcg104','normal',profile,c.mode],{stdio:'pipe'})
  const output=execFileSync(process.execPath,['scripts/verify_bolin_native_chain.mjs',path,c.mode,c.scenario],{encoding:'utf8'})
  results.push({...c,passed:true,output:output.trim()});console.log(output.trim())
 }catch(error){results.push({...c,passed:false,error:String(error.stderr??error).slice(-4000)});throw error}
 finally{
  for(const name of readdirSync('analysis'))if(!before.has(name)&&name.includes(c.scenario))unlinkSync('analysis/'+name)
  writeFileSync('analysis/bolin-talent2-check-summary.json',JSON.stringify({cases:results,oracleRetention:'Deleted after each case'},null,2)+'\n')
 }
}
console.log(results.length+' native chains passed; temporary oracles removed')
