import assert from'node:assert/strict'
import {readNativeTrace}from'./native_trace_stream.mjs'
const base='analysis/level-entity-bootstrap-3-campaign-cleared-wizard-empower-mixed-runtime-lcg104',old=readNativeTrace(base+'.20000.json'),extended=readNativeTrace(base+'.json'),next=extended.frames[Symbol.iterator]()
let count=0,firstOutcome
for(const f of old.frames){const e=next.next();assert.equal(e.done,false);assert.deepEqual(e.value,f,'unchanged complete native frame'+f.tick);assert.equal(f.outcome,undefined);count++}
assert.equal(count,20000)
for(let e=next.next();!e.done;e=next.next()){if(e.value.outcome&&firstOutcome===undefined)firstOutcome=e.value;count++}
assert.equal(count,21111);assert.equal(firstOutcome.tick,20931);assert.deepEqual(firstOutcome.outcome,{level_mode:1,level_difficulty:2,lives_left:4,victory:true,level_idx:3,stars:1})
assert.deepEqual(extended.events.filter(e=>e.tick<=20000),old.events,'complete unchanged event prefix')
assert.deepEqual(extended.randomDraws.slice(0,old.randomDraws.length),old.randomDraws,'complete unchanged RNG prefix')
console.log({identicalCompleteFrames:20000,extendedFrames:count,firstOutcome:firstOutcome.tick,lives:4,note:'Every native frame field, including unknown nested fields, event metadata and RNG prefix preserved by streamed writing and outcome extension.'})
