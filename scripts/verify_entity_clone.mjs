import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {NativeEntityRegistry} from '../src/game/NativeEntityRegistry.ts'
const data=JSON.parse(readFileSync('analysis/entity-clone-oracle.json'));let frames=0
// Mirrors Lua table.deepclone42: table values recurse independently; functions
// retain identity. These fixtures contain only records and primitive values.
const copy=value=>value!==null&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)])):value
for(const row of data.rows){
 const registry=new NativeEntityRegistry(row.firstId),known=new Map(),fn=()=>7
 const create=key=>{const e=registry.create(id=>({id,key,nested:{value:1,vector:{x:3,y:4}},callback:fn}));e.secondary=e.nested;known.set(key,e);return e}
 const clone=(source,key)=>{const e=registry.clone(source,copy);e.key=key;known.set(key,e);return e}
 let a,b,c,d,e,f
 for(let step=1;step<=9;step++){
  if(step===1){a=create('a');registry.queueInsert(a)}
  else if(step===2)b=clone(a,'b')
  else if(step===3){b.nested.value=9;registry.queueInsert(b)}
  else if(step===4)registry.queueRemove(a)
  else if(step===5){c=clone(b,'c');registry.queueInsert(c);registry.queueRemove(b)}
  else if(step===6){a.nested.value=42;registry.queueRemove(c)}
  else if(step===7){d=clone(a,'d');registry.queueInsert(d)}
  else if(step===8){e=create('e');f=clone(e,'f');registry.queueInsert(e);registry.queueInsert(f)}
  else if(step===9){registry.queueRemove(e);registry.queueRemove(f);registry.queueRemove(d)}
  registry.beginTick()
  const objects=Object.fromEntries([...known].map(([key,e])=>[key,{id:e.id,value:e.nested.value,secondary:e.secondary.value,shared:e.secondary===e.nested,callbackSame:e.callback===fn,pending:e.pending_removal??false}]))
  const current={entities:[...registry.entities.entries()].map(([key,e])=>({key,id:e.id,name:e.key})),objects,nextId:registry.nextId,count:registry.count,max:registry.max}
  assert.deepEqual(current,row.frames[step-1],`${row.firstId}/${step}`);frames++
 }
}
console.log(`${frames} original clone/registry frames match: source gets new ID, copy keeps old ID, old table key remains, overwrite/remove behavior and count/max, independent nested values, duplicated aliases and shared function identity`)
