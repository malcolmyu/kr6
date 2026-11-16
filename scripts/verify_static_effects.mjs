import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {StaticEffects} from '../src/game/StaticEffects.ts'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/static-effects-oracle.json')
let frames=0
for(const row of rows){
 const source=row.config?{...templates,[row.name]:row.config}:templates,c=new StaticEffects(source),events=[],models=new WeakMap(),record=(kind,e)=>events.push({tick:r.tick,kind,id:e.id})
 const r=new NativeEntityRegistry(row.firstId,{onQueue:(e,insert)=>record(insert?'queueInsert':'queueRemove',e),onInsert:e=>{record('insert',e);return true},onRemove:e=>{record('remove',e);return true}})
 r.tick=row.birth;r.time=row.birth*(1/30)
 c.onCreate=m=>{const e=r.create(id=>({id,model:m}));record('create',e);models.set(m,e);r.queueInsert(e)};c.onRemove=m=>r.queueRemove(models.get(m))
 const spawn=relative=>{if(relative===1||relative===28)for(let i=0;i<(relative===1?3:1);i++)assert(c.queue(row.name,{x:500,y:350},r.time))}
 for(const n of row.frames){
  r.beginTick();c.beginTick(r.time);const context=`${row.name}/birth${row.birth}/id${row.firstId}/${row.phase}/tick${n.tick}`,relative=n.tick-row.birth
  if(row.phase==='main')spawn(relative)
  for(const e of r.entities.values())c.advanceOne(e.model,r.time)
  if(row.phase==='pops')spawn(relative)
  assert.deepEqual(c.models.map(m=>models.get(m).id),n.models,context+'/retained models')
  const active=[...r.entities.values()];assert.equal(active.length,n.active.length,context+'/active count')
  for(let i=0;i<active.length;i++){
   const e=active[i],v=n.active[i];assert.equal(e.id,v.id,context+'/Lua traversal')
   for(let j=0;j<e.model.sprites.length;j++){
    const s=e.model.sprites[j],a=v.sprites[j]
    assert(Math.abs((s.alpha??255)-(a.alpha??255))<1e-8,context+'/alpha')
    for(const axis of ['x','y'])assert(Math.abs((s.scale?.[axis]??1)-(a.scale?.[axis]??1))<1e-10,context+'/scale')
    assert.equal(s.hidden,a.hidden,context+'/boolean interpolation')
   }
  }
  frames++
 }
 assert.deepEqual(events,row.events,`${row.name}/${row.birth}/${row.firstId}/${row.phase}/events`)
}
assert(rows.some(r=>r.name==='decal_bomb_crater_KR5'));assert.equal(new Set(rows.map(r=>r.name)).size,14)
console.log(`${rows.length} original static effect traces / ${frames} frames: nine real templates and five controlled interpolation variants match native precision alpha/scale/boolean/multiple-sprite updates, entity traversal, queued insertion/removal and retained final frame`)
