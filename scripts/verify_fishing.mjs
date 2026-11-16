import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {FishingSystem} from '../src/game/Fishing.ts'
const rows=JSON.parse(readFileSync('analysis/fishing-oracle.json'))
let total=0
for(const row of rows){
 let tick=0;const events=[],draws=[],level={data:{entities_list:[1,2,3].map(i=>({template:'decal_stage_03_fish',pos:{x:200+i*100,y:400},'editor.flip':i===2?1:0})).concat([{template:'decal_stage_03_fisherman',pos:{x:512,y:384}}])}}
 const system=new FishingSystem(level,'iron',()=>row.roll)
 const draw=system.draw.bind(system);system.draw=(min,max)=>{const value=draw(min,max);draws.push({tick,min,max,value});return value}
 system.onCreate=(e,time)=>events.push({tick,kind:'insert',name:e.template,key:e.key,pos:{...e.pos}})
 system.onRemove=e=>events.push({tick,kind:'remove',key:e.key})
 system.onSound=name=>events.push({tick,kind:'sound',name})
 system.onSignal=(name,args)=>events.push({tick,kind:'signal',name,args})
 for(const frame of row.frames){
  tick=frame.tick;const time=tick*(1/30)
  for(const command of Array.isArray(row.inputs)?row.inputs:[])if(command.tick===tick)assert(system.click(system.fishes[command.fish-1].pos))
  system.advance(time)
  const actual=system.snapshot(time),expected=frame.entities
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),`${row.roll}/${row.scenario}/${tick}/entities`)
  for(const [key,n]of Object.entries(expected)){const w=actual[key];assert(Math.abs(w.ts-n.ts)<1e-10,`${tick}/${key}/ts`);assert.deepEqual({...w,ts:0},{...n,ts:0},`${row.roll}/${row.scenario}/${tick}/${key}`)}
  assert.equal(system.found,frame.found,`${tick}/found`);assert.equal(system.fishTapped,frame.fishTapped,`${tick}/tap flag`)
  assert.equal(draws.length,frame.draws,`${tick}/random draws`);assert.equal(events.length,frame.events,`${tick}/events`)
  total++
 }
 assert.deepEqual(draws,row.draws)
 assert.deepEqual(events.filter(e=>e.kind!=='remove'),row.events.filter(e=>e.kind!=='remove'))
 const removals=list=>list.filter(e=>e.kind==='remove').toSorted((a,b)=>a.tick-b.tick||a.key.localeCompare(b.key))
 assert.deepEqual(removals(events),removals(row.events))
 if(row.scenario==='none')assert.equal(system.completed,false)
 else{assert.equal(system.completed,true);assert.equal(events.filter(e=>e.kind==='signal'&&e.name==='got-gold').length,1)}
}
console.log(`${rows.length} original fish/fisherman cases / ${total} frames match queued bubble/taps/removals, sprite frames and previous-render waits, discarded RNG draws, repeated fish catches, simultaneous boolean flag, sounds, five-fish achievement and single20-gold signal; same-tick timed removal traversal is outside this per-entity comparison`)

await import('./diagnose_native_level_runtime.mjs')
const coupled=JSON.parse(readFileSync('analysis/native-level-runtime-diagnostic.json'))
assert.deepEqual(coupled.webFishingCreates,coupled.nativeFishingCreates)
assert.equal(coupled.nativeFishingCreates[0].tick,1)
console.log('Coupled original stage3 iron: normal GameSession queues the actual fisherman bubble at tick1 and original position; global ID and scene-wide RNG/order parity remain separate')
