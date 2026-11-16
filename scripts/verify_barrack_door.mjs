import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),art=read('public/data/towers-art.json'),rows=read('analysis/barrack-door-oracle.json')
let frames=0
for(const row of rows){
 let tick=row.birth
 const b=new BarracksCombat(templates,()=>.25,()=>{}),events=[],site={id:'fixture',tower:`tower_knights_lvl${row.rank}`,pos:{x:500,y:450},rally:{x:600,y:350}}
 b.onSound=name=>events.push({tick,kind:'sound',name});b.onCreate=s=>events.push({tick,kind:'spawn',slot:s.slot})
 for(const n of row.frames){
  tick=n.tick
  for(const input of row.inputs.filter(i=>i.tick===tick)){const index=b.soldiers.findIndex(s=>s.slot===input.slot);assert(index>=0);b.soldiers.splice(index,1)}
  b.advance(tick*(1/30),1/30,[site],[])
  const d=b.doors.get(site.id),prefix=templates[site.tower].render.sprites[2].prefix,a=art.animations[`${prefix}_${d.animation}`],context=`rank${row.rank}/birth${row.birth}/scenario${row.scenario}/tick${tick}`
  assert.equal(d.animation,n.animation,context+'/animation');assert.equal(d.startedAt,n.ts,context+'/animation start')
  assert.equal(nativeAnimationFrame(a.to-a.from+1,tick*(1/30)-d.startedAt,false,30).frame+1,n.frame,context+'/frame');frames++
 }
 assert.deepEqual(events,row.events,`rank${row.rank}/birth${row.birth}/scenario${row.scenario}/spawn and sound`)
}
console.log(`${rows.length} original barrack door cases / ${frames} frames match initial opening, immediate replacement while open, unchanged hold clock, missing soldiers during close, animation clocks/frames and spawn/sound events`)
