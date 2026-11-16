import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p)),level=read('public/data/level03.json'),program=read('public/data/level03-iron.json'),templates=read('public/data/entities.json'),profile=read(process.argv[3]??'analysis/native-runtime-video-opening-profile.json'),commands=read('analysis/native-runtime-video-opening-input.json'),video=read('analysis/reference-inputs/page06-opening.json'),checkpoints=video.goldCheckpoints.filter(c=>c.media>=76&&c.media<=82),samplesAt=new Map(checkpoints.map(c=>[Math.round((c.media-13.5)*30),c])),results=[],limit=Number(process.argv[2]??256)
for(let initial=1;initial<=limit;initial++){
 let seed=initial,draws=0
 const g=new GameSession(level,program,templates,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;draws++;return seed/4294967296},'iron',['archers','knights','catapult','wizard'],profile.powerUpgrades??{},profile.globalUpgrades)
 g.heroes.savedXp=profile.heroXp;g.heroes.savedUpgrades=profile.heroUpgrades;g.heroes.playerLevel=3;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(profile.powerXp,3,3);applyStageSetup(g,3,'iron',true,true)
 const samples=[]
 for(let tick=1;tick<=2055;tick++){
  for(const c of commands.filter(c=>c.tick===tick)){
   if(c.kind==='send_wave')g.callNextWave()
   else if(c.kind==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===c.name).id;if(!g.heroes.moveSelected(c.pos))throw Error('Rejected original-profile move')}
   else if(c.kind==='rally'){if(!g.setRally(c.holder,c.pos))throw Error('Rejected original-profile rally')}
   else g.build(c.holder,c.tower)
  }
  g.advance(1/30)
  const c=samplesAt.get(tick);if(c)samples.push({media:c.media,gold:g.gold,expected:c.gold,delta:g.gold-c.gold})
 }
 results.push({seed:initial,samples,score:samples.reduce((sum,s)=>sum+Math.abs(s.delta),0),draws})
 if(initial%64===0)console.log('Observed-profile seed probe',initial,'of',limit)
}
results.sort((a,b)=>a.score-b.score||a.seed-b.seed)
const report={note:'Unknown video RNG. Controlled LCG seed sensitivity with fixed inferred actions/profile; matching gold alone cannot identify the video RNG or certify replay. No production balance or RNG defaults changed.',sceneStart:13.5,playerLevel:3,profile,guardHp:profile.globalUpgrades?.barracks?.includes('l1')?45:40,seeds:limit,exact:results.filter(r=>r.score===0),best:results.slice(0,16),gold77:[...new Set(results.map(r=>r.samples.find(s=>s.media===77).gold))].sort((a,b)=>a-b),reference104:results.find(r=>r.seed===104)}
writeFileSync(process.argv[4]??'analysis/video-opening-seed-sensitivity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))
