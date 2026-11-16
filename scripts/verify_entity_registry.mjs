import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
const oracle=JSON.parse(readFileSync('analysis/entity-registry-oracle.json'));let frames=0
for(const row of oracle.rows){let events=[];const known=new Map();let registry,make
 registry=new NativeEntityRegistry(row.firstId,{onQueue:(e,inserting)=>events.push({kind:'queue',key:e.key,inserting}),onInsert:e=>{events.push({kind:'insert',key:e.key});if(e.child&&!e.didChild){e.didChild=true;registry.queueInsert(make(e.key+'_child'))}if(e.blockInsert)return false;return e.acceptZero?0:true},onRemove:e=>{events.push({kind:'remove',key:e.key});if(e.blockRemove)return false;if(e.childOnRemove){e.childOnRemove=undefined;registry.queueInsert(make(e.key+'_removed'))}return true},onDequeue:(e,inserting)=>events.push({kind:'dequeue',key:e.key,inserting})})
 make=(key,fields={})=>{const e=registry.create(id=>({id,key,...fields}));known.set(key,e);events.push({kind:'create',key,id:e.id});return e}
 let a,b,c,d
 for(let tick=1;tick<=8;tick++){
  if(tick===1){a=make('a',{child:true,blockRemove:true,childOnRemove:true});b=make('b',{blockInsert:true});c=make('c',{acceptZero:true,childOnRemove:true});registry.queueInsert(a);registry.queueInsert(b);registry.queueInsert(c);registry.queueRemove(c);registry.queueRemove(c)}
  else if(tick===2)registry.queueRemove(a)
  else if(tick===3){registry.queueRemove(a);a.blockRemove=false;registry.queueInsert(a);registry.queueRemove(a)}
  else if(tick===4){d=make('d',{blockRemove:true});registry.queueInsert(d);registry.queueInsert(c);registry.queueRemove(b)}
  else if(tick===5)registry.queueRemove(d)
  else if(tick===6){registry.queueRemove(d);d.blockRemove=false;registry.queueInsert(d);registry.queueRemove(d)}
  else if(tick===7)registry.queueRemove(c)
  registry.beginTick();const n=row.frames[tick-1],entities=[...registry.entities.values()].map(e=>({id:e.id,key:e.key,...(e.pending_removal===undefined?{}:{pending_removal:e.pending_removal})})),ctx=`${row.firstId}/${tick}`
  assert.deepEqual(events,n.events,ctx+'/events');assert.deepEqual(entities,n.entities,ctx+'/table');assert.deepEqual(registry.pendingInserts.map(e=>e.key),n.inserts,ctx+'/pending inserts');assert.deepEqual(registry.pendingRemovals.map(e=>e.key),n.removes,ctx+'/pending removals');assert.equal(registry.count,n.count,ctx+'/count');assert.equal(registry.max,n.max,ctx+'/max');assert.equal(registry.nextId,n.nextId,ctx+'/id allocation');assert(Math.abs(registry.time-n.time)<1e-10);events=[];frames++
 }
}
console.log(`${frames} original ${oracle.version} registry frames: global ID allocation, rejected insert/remove, duplicate removal, Lua truthy0, nested queues/phase boundary, absent-key deletion, original counts and exact entity iteration`)
