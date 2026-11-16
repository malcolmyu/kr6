import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {AmbientCreatures} from '../src/game/AmbientCreatures.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/ambient-creatures-oracle.json')
let frames=0
for(const row of rows){
 let calls=0,tick=0;const events=[],level={data:{entities_list:[{template:row.name,pos:{x:500,y:350}}]}},s=new AmbientCreatures(level,'campaign',templates,()=>{calls++;return row.roll},row.scenario==='censored'),model=s.models[0]
 s.onSound=sound=>events.push({tick,sound});s.onRemove=()=>events.push({tick,remove:true})
 for(const n of row.frames){tick=n.tick;const time=tick*(1/30),ctx=`${row.name}/${row.birth}/${row.roll}/${row.scenario}/${tick}`;if(n.clicked&&s.models.length)s.click(model.pos);s.advance(time)
  assert.equal(s.models.length>0,n.active,ctx+'/active');assert.equal(model.removalQueuedAt===undefined?undefined:Math.round(model.removalQueuedAt*30),n.removalAt,ctx+'/removal');assert.equal(calls,n.calls,ctx+'/RNG');assert.equal(model.animation,n.animation,ctx+'/animation');assert.equal(model.at,n.ts,ctx+'/animation clock');assert.equal(model.loop,n.loop,ctx+'/loop');assert.equal(s.frame(model,time)+1,n.frame,ctx+'/frame');frames++
 }
 assert.deepEqual(events,row.events,`${row.name}/${row.scenario}/events`)
}
console.log(`${rows.length} native sheep/cow main/animation traces and ${frames} frames match fixed first cooldown/discarded redraws, tap/death/abduction/censored branches, exact frames/sounds and queued removal`)
