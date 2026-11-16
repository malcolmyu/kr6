import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),templates=read('public/data/entities.json'),rows=read('analysis/barrack-rally-sounds-oracle.json')
let requests=0
for(const row of rows){
 let tick=row.birth
 const b=new BarracksCombat(templates,()=>.25,()=>{}),events=[],site={id:'fixture',tower:`tower_knights_lvl${row.rank}`,pos:{x:500,y:450},rally:{x:600,y:350}}
 b.deferKnightTowers=true
 b.onSound=name=>events.push({tick,kind:'sound',name});b.onCreate=s=>events.push({tick,kind:'spawn',slot:s.slot})
 for(const frame of row.frames){
  tick=frame.tick
  if([3,19,50,65,73,110,130,170].includes(tick-row.birth)){b.setRally(site,site.rally,(tick-1)*(1/30));requests++}
  for(const input of row.inputs.filter(i=>i.tick===tick)){const index=b.soldiers.findIndex(s=>s.slot===input.slot);assert(index>=0);b.soldiers.splice(index,1)}
  b.advanceKnightTowerMain(site,tick*(1/30))
 }
 assert.deepEqual(events,row.events,`Original rank${row.rank}/birth${row.birth}/scenario${row.scenario}/rally and door sound requests`)
}
console.log(`${rows.length} original barrack traces: ${requests} rally requests during opening/hold/closing/replenishment match sound coalescing, live-roster gate and exact dispatch ticks`)
