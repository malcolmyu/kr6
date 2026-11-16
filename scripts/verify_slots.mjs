import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buttonHalo} from '../src/game/NativeButton.ts'
import {SaveSlots,slotKey,ACTIVE_SLOT_KEY,SLOT_MIGRATION_KEY} from '../src/game/SaveSlots.ts'
import {PROGRESS_KEY} from '../src/game/ProgressStore.ts'
import {slotFind,slotMenuView} from '../src/game/SlotMenu.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/slots.json')
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}}
function snapshot(root,index){const row=slotFind(root,`slot_${index}`);return {used:!slotFind(row,'slot_used').hidden,empty:!slotFind(row,'slot_empty').hidden,delete:!slotFind(row,'slot_delete').hidden,stars:slotFind(row,'label_stars').text,name:slotFind(row,'label_slot_name').text}}
function match(actual,expected){for(const key of Object.keys(expected))if(key!=='stars'||!expected.empty)assert.equal(actual[key],expected[key],key)}
for(const native of read('analysis/slots-view-oracle.json')){
 const progress=native.slot?{levels:Object.fromEntries(native.slot.levels.map((l,i)=>[i+1,{...(l.stars?{campaign:l.stars}:{}),...(l[3]?{iron:true}:{})}]))}:undefined
 const entries=[1,2,3].map(index=>({index,progress:index===native.index?progress:undefined}))
 match(snapshot(slotMenuView(data,entries),native.index),native.initial)
 if(progress){match(snapshot(slotMenuView(data,entries,native.index),native.index),native.actions.request);match(snapshot(slotMenuView(data,entries),native.index),native.actions.cancel);entries[native.index-1].progress=undefined;match(snapshot(slotMenuView(data,entries),native.index),native.actions.confirm)}
}
for(const native of read('analysis/slots-route-oracle.json')){
 const memory=storage(),slots=new SaveSlots(memory);if(native.used)slots.select(native.index)
 const result=slots.select(native.index);assert.equal(result.next,native.next);assert.equal(result.fresh,!native.used);assert.equal(slots.active,native.active);assert.deepEqual(slots.read(native.index),{levels:{},onboarding:{}})
}
{
 const memory=storage(),legacy={levels:{1:{campaign:3}},heroes:{hero_gerald:250}};memory.setItem(PROGRESS_KEY,JSON.stringify(legacy));const slots=new SaveSlots(memory)
 assert.deepEqual(slots.read(1),legacy);assert.equal(slots.list().filter(s=>s.progress).length,1)
 slots.select(2);slots.saveActive({levels:{2:{campaign:2}}});assert.deepEqual(slots.read(1),legacy);assert.deepEqual(new SaveSlots(memory).loadActive(),{levels:{2:{campaign:2}}})
 slots.delete(1);assert.equal(new SaveSlots(memory).read(1),undefined);assert.deepEqual(slots.read(2),{levels:{2:{campaign:2}}});slots.delete(2);assert.equal(memory.getItem(PROGRESS_KEY),null);assert.equal(new SaveSlots(memory).read(1),undefined);assert.equal(new SaveSlots(memory).read(2),undefined)
 assert.equal(slots.select(1).next,'game');assert.equal(slots.select(1).next,'map');assert.equal(memory.getItem(SLOT_MIGRATION_KEY),'1')
 for(const index of [0,4,1.5,NaN]){assert.throws(()=>slots.select(index));assert.throws(()=>slots.delete(index));assert.throws(()=>slots.read(index))}
 memory.setItem(slotKey(3),'bad json');assert.equal(slots.read(3),undefined);memory.setItem(slotKey(3),JSON.stringify({version:1,progress:{levels:[]}}));assert.equal(slots.read(3),undefined)
 memory.setItem(ACTIVE_SLOT_KEY,'999');assert.equal(new SaveSlots(memory).active,1)
}
{
 const memory=storage();memory.setItem(PROGRESS_KEY,JSON.stringify({levels:{1:{campaign:3}}}));const original=memory.setItem;memory.setItem=(key,value)=>{if(key===slotKey(1))throw new Error('quota');original(key,value)};assert.throws(()=>new SaveSlots(memory),/quota/);assert.equal(memory.getItem(SLOT_MIGRATION_KEY),null)
 memory.setItem=original;assert.equal(new SaveSlots(memory).read(1).levels[1].campaign,3)
}
assert.equal(data.panelFrames.in[12].disabled,true);assert.equal(data.panelFrames.in[13].disabled,false);assert.equal(data.panelFrames.out[12].hidden,false);assert.equal(data.panelFrames.out[13].hidden,true)
assert.equal(data.menuFrames.findIndex(f=>f.startAge!==undefined),36)
console.log('Native 15 slot row/delete states and 6 fresh/existing routes match; three independent saves, legacy migration, cancellation, deletion persistence, invalid/corrupt slots and failed-write recovery verified')

for(const row of read('analysis/button-halo-oracle.json')){const pose=buttonHalo(row.base,row.halo,row.offset);for(const axis of ['x','y']){assert(Math.abs(pose.anchor[axis]-row.anchor[axis])<1e-9);assert(Math.abs(pose.pos[axis]-(row.offset[axis]-row.anchor[axis]))<1e-9)}}
console.log('Original GG5Button separate focus-halo anchors and image offsets match all menu buttons')
