import {readFileSync}from'node:fs'
import assert from'node:assert/strict'
import {BarracksCombat}from'../src/game/BarracksCombat.ts'
const {rows}=JSON.parse(readFileSync('analysis/native-walk-empower-boundary.json'))
assert.equal(rows.length,6)
for(const row of rows){
 const s={pos:{...row.before},template:{motion:{max_speed:70}},moving:false}
 assert.equal(70*(1/30),row.step)
 const moving=BarracksCombat.prototype.move.call({},s,row.dest,1/30)
 assert.equal(moving,!row.result,'native arrived result at'+row.tick)
 assert.deepEqual(s.pos,row.after,'exact original coordinates at'+row.tick)
 assert.equal(s.motionArrived,false)
}
console.log('Six original U.walk calls match exact positions and arrival flags from identical native inputs, including distance just above one step. The accumulated full-route input discrepancy before15828 remains unresolved; this does not accept the full movement route.')
