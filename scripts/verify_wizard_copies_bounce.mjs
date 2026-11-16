import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {WizardBookBounceSystem} from '../src/game/WizardBookBounce.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/wizard-copies-bounce-oracle.json'),levels=[1,2,3].map(i=>read(`public/data/level0${i}.json`))
for(const row of rows){let calls=0,allocations=0;const events=[],s=new WizardBookBounceSystem(levels[row.stage-1],()=>{calls++;return row.roll});s.onCreateShot=()=>{assert.equal(calls,0);allocations++};s.onShot=b=>events.push({...b,calls});s.onRemove=()=>events.push({remove:true,calls});s.advance(row.pos,row.level);assert.equal(allocations,1);assert.equal(calls,4);assert.equal(events.length,2)
 for(const [i,e]of events.entries()){const n=row.events[i];for(const key of Object.keys(e)){if(key==='from'||key==='to'){assert(Math.abs(e[key].x-n[key].x)<1e-7&&Math.abs(e[key].y-n[key].y)<1e-7,`${row.stage}/${row.level}/${row.roll}/${key}`)}else assert.deepEqual(e[key],n[key])}}
}
console.log(`${rows.length} original book bounce cases across three maps: allocation precedes four scatter rolls, default middle-lane nearest-path choice, level, source/landing positions and immediate queued removal match`)
