import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {nativeSpritePhase} from '../src/game/SpritePhase.ts'
const rows=JSON.parse(readFileSync('analysis/sprite-phase-oracle.json'))
for(const row of rows){let calls=0;const phase=nativeSpritePhase({ts:1.25,...(row.range===false?{}:{random_ts:row.range})},()=>{calls++;return row.roll});assert(Math.abs(-phase-row.ts)<1e-12);assert.equal(calls,row.calls)}
console.log('20 original render insertion cases: correct random timestamp sign/value, absent-field zero draws, Lua-zero present-field one draw and retained supplied timestamp')
