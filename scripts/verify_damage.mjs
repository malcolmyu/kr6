import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {predictDamage} from '../src/game/Damage.ts'
const cases=JSON.parse(readFileSync('analysis/damage-oracle.json'))
for(const c of cases)assert.equal(predictDamage(c.health,c.damage),c.expected)
console.log(`${cases.length} damage cases match original LuaJIT utils.predict_damage`)
