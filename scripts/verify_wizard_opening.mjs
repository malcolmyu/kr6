import assert from 'node:assert/strict'
import {openingSubject} from './opening_subject.mjs'
import {readFileSync} from 'node:fs'
const read=p=>JSON.parse(readFileSync(p)),input=read('analysis/catapult-opening-input.json'),native=read('analysis/wizard-opening-native.json')
assert(input.shots.length>0&&input.wizardShots.length>0,'opening must contain actual catapult and wizard emissions')
const subject=openingSubject(input,'wizard')
const close=(a,b,context)=>assert(Math.abs(a-b)<1e-9,`${context}: ${a} != ${b}`)
assert.equal(native.frames.length,subject.frames.length);assert.equal(native.shots.length,subject.shots.length)
let stateFrames=0
for(const [i,frame]of native.frames.entries()){
 const web=subject.frames[i];close(frame.at,web.at,`tick${i}`)
 const states=Array.isArray(frame.states)?frame.states:[];assert.equal(states.length,web.states.length)
 for(const n of states){const w=web.states.find(s=>s.id===n.id);assert(w);close(n.attackTs,w.attackTs,`tick${i}/${n.id}/cooldown`);assert.equal(n.loading,w.loading);close(n.bobTime,w.bobTime,`tick${i}/${n.id}/bob`);assert.equal(n.parts.length,w.parts.length)
  for(let p=0;p<n.parts.length;p++){for(const key of ['name','flip','loop'])assert.deepEqual(n.parts[p][key],w.parts[p][key],`tick${i}/${n.id}/part${p}/${key}`);for(const key of ['x','y'])close(n.parts[p].offset[key],w.parts[p].offset[key],`tick${i}/${n.id}/part${p}/offset/${key}`);close(n.parts[p].ts,w.parts[p].ts,`tick${i}/${n.id}/part${p}/ts`)}stateFrames++
 }
}
for(const [i,n]of native.shots.entries()){
 const w=subject.shots[i];close(n.at,w.at,`shot${i}/time`)
 for(const key of ['site','name','from','target','sign'])assert.deepEqual(n[key],w[key],`shot${i}/${key}`)
}
assert.equal(Array.isArray(native.walkErrors)?native.walkErrors.length:0,0)
console.log(`${native.frames.length} same-input original wizard/FFE/path/animation ticks, ${stateFrames} full source-animation states and ${native.shots.length} actual opening shots match; ${native.walkSamples} independent native walking samples match after the first prescribed actor frame. Inputs prescribe actors/HP/order, so this is not independent full-game or video acceptance.`)
