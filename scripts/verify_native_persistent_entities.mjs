import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {NativePersistentEntities} from '../src/game/NativePersistentEntities.ts'
const data=JSON.parse(readFileSync('analysis/native-persistent-entities-oracle.json'));let steps=0
for(const row of data.rows){
 const indexes=new NativePersistentEntities()
 for(const step of row.steps){
  indexes[step.op](step.entity,row.isKr3)
  const lists=Object.fromEntries([...indexes.lists].map(([name,list])=>[name,[...list.values()].map(e=>e.id)]))
  assert.deepEqual(lists,step.lists,`${row.isKr3}/${row.stride}/${steps}/${step.op}/${step.entity.key??step.entity.id}`);steps++
 }
 indexes.reset();assert.equal(indexes.lists.size,4);for(const list of indexes.lists.values())assert.deepEqual([...list.values()],[])
}
console.log(`${steps} original SSO persistent-index steps match: component predicates, script requirement, dead presence, Lua truthy0, KR3 faerie branch, absent-key removal, exact sparse/dense iteration and reset. Spatial grids are separate.`)
