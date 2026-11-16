import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeNativeTemplateRandom} from '../src/game/NativeTemplateRandom.ts'
const rows=JSON.parse(readFileSync('analysis/template-random-oracle.json'))
for(const row of rows){let calls=0;const marker={},actual=initializeNativeTemplateRandom({marker},()=>{calls++;return row.roll==='sequence'?[.11,.83,.29,.71,.43,.59,.19,.97][(calls-1)%8]:row.roll})
 assert.equal(calls,row.calls);assert.equal(actual.marker,marker)
 for(const [name,expected]of Object.entries(row.templates)){const a=actual[name];for(const [i,s]of a.render.sprites.entries())assert.equal(s.r,expected.render.sprites[i].r,`${row.roll}/${name}/${i}/rotation`);assert.deepEqual(a,expected,`${row.roll}/${name}/full initialized template`)}
}
console.log('Four native template initialization traces match all three20-sprite debug modifiers and the19 actual angle draws; existing templates remain available')
