import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {SoldierIdle} from '../src/game/SoldierIdle.ts'
const rows=JSON.parse(readFileSync('analysis/soldier-idle-oracle.json'));let frames=0
for(const row of rows){let calls=0,visual={name:'idle',at:-.27,loop:true},flip=false;const s=new SoldierIdle(row.config,()=>{calls++;return row.roll==='sequence'?[.11,.83,.29,.71,.43,.59,.19,.97][(calls-1)%8]:row.roll})
 for(const f of row.frames){if(f.active)({visual,flip}=s.advance(f.tick*(1/30),1/30,visual,flip,f.stunned,row.scenario==='forced'));const ctx=`${row.name}/${row.birth}/${row.roll}/${row.scenario}/${f.tick}`;assert.deepEqual(visual,{name:f.animation,at:f.at,loop:f.loop},ctx+'/visual');assert.equal(flip,f.flip,ctx+'/flip');assert.equal(calls,f.calls,ctx+'/RNG');assert.deepEqual(s.state,f.state,ctx+'/state');frames++}
}
console.log(`${rows.length} original idle traces / ${frames} frames match strict counter, two-tick gap boundary, stun, facing, force clock, numeric nonloop and next-call variant selection`)
