import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
const rows=JSON.parse(readFileSync('analysis/wizard-bolt-paired-sequence-oracle.json'));let frames=0
for(const row of rows){const table=new LuaEntityTable();for(const [i,frame]of row.frames.entries()){
 for(const op of frame.entityMutations??[])if(op.op==='set')table.set(op.id,op);else table.delete(op.id)
 for(const [role,name]of [['particle','particleOrder'],['bolt','mainOrder']]){
  const actual=[...table.values()].filter(e=>e.role===role).map(e=>({id:e.id,source:e.source})),expected=frame[name]
  assert.deepEqual(actual,Array.isArray(expected)?expected:[],`${row.rank}/${row.birth}/${i}/${role}`)
 }
 frames++
}}
console.log(`${frames} original paired-bolt frames reconstruct both main and particle iteration from actual insert/remove events using numeric Lua table semantics, without copying the observed order into the algorithm; default game ID allocation remains unported`)
