import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
const rows=JSON.parse(readFileSync('analysis/soldier-melee-damage-oracle.json'))
for(const row of rows){const b=new BarracksCombat({},()=>row.random,()=>{}),attack={damage_min:row.min,damage_max:row.max,damage_type:2};assert.equal(b.damage(attack,row.factor).value,row.value,JSON.stringify(row))}
console.log(`${rows.length} seeded native soldier melee damage cases match discrete rolls, fractional passive bounds and multiplier rounding`)
