import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
const oracle=JSON.parse(readFileSync(process.argv[2]??'analysis/lua-entity-table-oracle.json'));let steps=0
for(const row of oracle.rows){const table=new LuaEntityTable();for(const [i,step]of row.steps.entries()){table.set(step.key,step.value);assert.deepEqual([...table.entries()],Array.isArray(step.entries)?step.entries:[],`${oracle.version}/${row.start}/${row.seed}/${i}`);steps++}}
console.log(`${steps} original ${oracle.version}/${oracle.arch} numeric table mutations match exact Lua next order, collisions/rehash, deleted-key reuse, nil writes, false values and dense/sparse transitions`)
