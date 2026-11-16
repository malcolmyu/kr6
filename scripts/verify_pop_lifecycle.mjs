import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DodgeSystem,blockPopScale} from '../src/game/DodgeSystem.ts'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/pop-lifecycle-oracle.json')
let frames=0
for(const row of rows){
 let calls=0
 const events=[],byModel=new WeakMap(),d=new DodgeSystem(()=>{calls++;return .25},templates)
 const record=(kind,e)=>events.push({tick:r.tick,kind,id:e.id,template:e.template})
 const r=new NativeEntityRegistry(row.firstId,{onQueue:(e,insert)=>record(insert?'queueInsert':'queueRemove',e),onInsert:e=>{record('insert',e);return true},onRemove:e=>{record('remove',e);return true}})
 r.tick=row.birth;r.time=row.birth*(1/30)
 d.onCreate=(name,p)=>{const e=r.create(id=>({id,template:name,model:p}));record('create',e);byModel.set(p,e);r.queueInsert(e)}
 d.onRemove=p=>r.queueRemove(byModel.get(p))
 const h={pos:{x:500,y:350},template:{unit:{pop_offset:{x:0,y:9}}},dodge:{pop:row.name,silent:true,active:true}}
 const spawn=relative=>{if(relative===1||relative===28)for(let i=0;i<(relative===1?3:1);i++)d.show(h,r.time)}
 for(const n of row.frames){
  r.beginTick();d.beginTick(r.time)
  const relative=n.tick-row.birth,context=`${row.name}/birth${row.birth}/id${row.firstId}/${row.phase}/tick${n.tick}`
  if(row.phase==='main')spawn(relative)
  d.advance(r.time,[...r.entities.values()].map(e=>e.model))
  if(row.phase==='pops')spawn(relative)
  assert.equal(calls,n.calls,context+'/RNG count')
  assert.deepEqual(d.pops.map(p=>byModel.get(p).id),n.models,context+'/retained models')
  assert.deepEqual(r.pendingRemovals.map(e=>e.id),n.removes,context+'/removal queue')
  const active=[...r.entities.values()];assert.equal(active.length,n.active.length,context+'/active count')
  for(let i=0;i<active.length;i++){
   const e=active[i],p=e.model,v=n.active[i];assert.equal(e.id,v.id,context+'/table traversal');assert.deepEqual(p.pos,v.pos,context+'/position');assert.equal(p.frame,v.frame,context+'/atlas frame');assert(Math.abs(p.rotation-v.rotation)<1e-12,context+'/rotation')
   for(const axis of ['x','y'])assert(Math.abs(blockPopScale(r.time-p.at)-v.scale[axis])<1e-12,context+'/native tween scale')
  }
  frames++
 }
 assert.deepEqual(events,row.events,`${row.name}/birth${row.birth}/id${row.firstId}/${row.phase}/events`)
}
assert.equal(new Set(rows.map(r=>r.name)).size,32)
console.log(`${rows.length} original pop lifecycle traces / ${frames} frames: all32 templates, main/pops creation phases, floating birth clocks and dense/sparse ID tables match queued insertion, native scale/rotation/position, RNG, tween-order removal requests and next-tick model/table deletion`)
