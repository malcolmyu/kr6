import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
import {NativeSpatialEntities} from '../src/game/NativeSpatialEntities.ts'
const data=JSON.parse(readFileSync('analysis/native-spatial-entities-oracle.json'),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v);let frames=0,queries=0
for(const row of data.rows){
 const entities=new LuaEntityTable(),sso=new NativeSpatialEntities();assert.equal(sso.step,data.step)
 for(const frame of row.frames){
  for(const op of frame.ops)if(op.op==='set')entities.set(op.entity.id,structuredClone(op.entity));else entities.delete(op.id)
  const v={left:row.origin.x,right:row.origin.x+1365.3333333333,bottom:row.origin.y,top:row.origin.y+768},g=sso.rebuild(entities,v)
  const cells=[...g.cells].flatMap(([x,column])=>[...column].map(([y,items])=>({x,y,ids:items.map(e=>e.id)}))).sort((a,b)=>a.x-b.x||a.y-b.y)
  const context=`${row.origin.x}/${row.origin.y}/${row.stride}/${frames}`
  assert.deepEqual(cells,frame.cells,context+'/grid cells and original entity order')
  assert.deepEqual([g.minX,g.maxX,g.minY,g.maxY],frame.bounds,context+'/bounds')
  assert.equal(sso.isAllEntities(entities),frame.same);assert.equal(sso.isAllEntities(new LuaEntityTable()),frame.other)
  for(const q of frame.queries){
   const calls=[],out=[{id:-1}],predicate=q.kind==='none'?undefined:(key,e)=>{calls.push({key,id:e.id});if(q.kind==='zero')return 0;if(q.kind==='even')return e.id%2===0;if(q.kind==='first-cell-entry')return key===1;return(e.pos.x-q.x)**2+(e.pos.y-q.y)**2<=q.radius*q.radius}
   sso.filter(out,'targets',q.x,q.y,q.radius,predicate)
   assert.deepEqual(out.map(e=>e.id),q.result,context+`/${queries}/${q.kind}/candidates`);assert.deepEqual(calls,q.calls,context+`/${queries}/callback keys/order`);queries++
  }
  frames++
 }
}
console.log(`${frames} original SSO grid rebuilds and ${queries} queries match exact cells, ceil boundaries, stale-key iteration, X/Y/cell order, callback keys, Lua truthy0 and append semantics. No exact-radius filtering is added by the broad phase.`)
