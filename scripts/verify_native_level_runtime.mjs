import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
const read=path=>JSON.parse(readFileSync(path),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
let frameCount=0,eventCount=0
for(const suffix of ['', '-constant','-sequence']){
 const data=read(`analysis/level-entity-bootstrap-3-iron-entry-runtime${suffix}.json`),entities=new LuaEntityTable();let cursor=0,nextId=1,count=0,max=0
 assert.deepEqual(data.resources.missing,[],'no missing image metadata');assert.deepEqual(data.resources.missingAnimations,[],'no missing original animation definitions');assert.deepEqual(data.cloneEvents,[],'these fixtures have no clone calls')
 for(const frame of data.frames){
  while(cursor<frame.eventBoundary){const e=data.events[cursor++]
   if(e.kind==='create'){assert.equal(e.id,nextId++,`allocated at ${e.source}:${e.line}`)}
   else if(e.kind==='insert'){entities.set(e.id,{id:e.id,template:e.template});count++;max=Math.max(count,max)}
   else if(e.kind==='remove'){entities.delete(e.id);count--}
   else assert(['queueInsert','queueRemove','insertRejected','removeRejected'].includes(e.kind),e.kind)
  }
  assert.deepEqual([...entities.entries()].map(([key,e])=>({key,...e})),frame.entities.map(({key,id,template})=>({key,id,template})),`${suffix}/${frame.tick}/actual global table`)
  assert.equal(nextId,frame.nextId);assert.equal(count,frame.count);assert.equal(max,frame.max);assert.equal(frame.at,frame.tick*(1/30));frameCount++
 }
 assert.equal(cursor,data.events.length);assert(data.frames.some(f=>f.wave===1));assert(data.events.some(e=>e.template==='bolt_tower_wizard_lvl1'));assert(data.events.some(e=>e.template==='ps_tower_wizard_bolt_trail'));assert(data.events.some(e=>e.template==='damage'));assert(data.frames.at(-1).paused);eventCount+=cursor
}
console.log(`${frameCount} coupled native level ticks / ${eventCount} runtime events reconstruct exact global creation IDs, accepted insert/remove table order and counts, including damage/FX/particles/builds. This is event reconstruction, not a GameSession parity claim.`)
