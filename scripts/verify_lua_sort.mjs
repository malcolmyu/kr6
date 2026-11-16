import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {luaSort} from '../src/game/LuaSort.ts'
const rows=JSON.parse(readFileSync('analysis/lua-sort-oracle.json'));let comparisons=0
for(const [i,row]of rows.entries()){const calls=[],out=luaSort(structuredClone(row.input),(a,b)=>{calls.push([a.id,b.id]);return a.rank<b.rank});assert.deepEqual(out.map(e=>e.id),row.output,`case${i}/order`);assert.deepEqual(calls,row.calls,`case${i}/comparisons`);comparisons+=calls.length}
console.log(`${rows.length} original LuaJIT sorts and ${comparisons} comparisons match pivot/swap/recursion and unstable equal-key order`)
