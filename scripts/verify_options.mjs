import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {AudioSettings,AUDIO_SETTINGS_KEY} from '../src/game/AudioSettings.ts'
import {pauseView,confirmationView} from '../src/game/PauseOptions.ts'
import {sliderPose,sliderPointer} from '../src/game/NativeSlider.ts'
import {slotFind} from '../src/game/SlotMenu.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/options.json')
function storage(initial){const records=new Map([[AUDIO_SETTINGS_KEY,JSON.stringify(initial)]]);return {getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)}}
let cases=0
for(const native of read('analysis/options-audio-oracle.json')){const memory=storage(native.initial),settings=new AudioSettings(memory)
 for(const row of native.rows){const [action,value]=row.action.split(':');if(value!==undefined)settings.set(action==='music'?'volume_music':'volume_fx',Number(value));else if(action==='music'||action==='sfx')settings.toggle(action==='music'?'volume_music':'volume_fx')
  assert.deepEqual(settings.values,row.settings);const view=pauseView(data,settings.values)
  for(const [key,on]of [['volume_music',row.music],['volume_fx',row.sfx]]){assert.equal(settings.values[key]!==0,on);assert.equal(slotFind(view,key).control.muted,!on)}
  assert.deepEqual(JSON.parse(memory.getItem(AUDIO_SETTINGS_KEY)),native.initial,'settings model exposes explicit commit so each native popup can own its persistence timing')
  cases++
 }
 settings.save();assert.deepEqual(new AudioSettings(memory).values,settings.values)
}
for(const row of read('analysis/options-slider-oracle.json')){const pose=sliderPose(row.input,row.range,row.bar);for(const key of ['value','phase','knobX'])assert(Math.abs(pose[key]-row[key])<1e-10);assert.equal(pose.value,row.changed)}
assert.equal(sliderPointer(-50,[0,1],0,100),0);assert.equal(sliderPointer(150,[0,1],0,100),1);assert.equal(sliderPointer(50,[-2,3],0,100),.5)
for(const kind of ['restart','quit']){const view=confirmationView(data,kind);assert.equal(slotFind(view,'label_desc').text,data.labels[kind==='restart'?'CONFIRM_RESTART':'CONFIRM_EXIT']);assert.equal(slotFind(view,'label_button_yes').text,data.labels.BUTTON_YES);assert.equal(slotFind(view,'label_button_no').text,data.labels.BUTTON_NO)}
assert.equal(data.popupFrames.show[7].disabled,true);assert.equal(data.popupFrames.show[8].disabled,false);assert.equal(data.popupFrames.hide[4].hidden,false);assert.equal(data.popupFrames.hide[5].hidden,true)
console.log(`${cases} original audio/toggle states and 14 original slider poses match; original confirmation labels and popup animation gates retained`)

{const settings=new AudioSettings(storage({volume_music:.3,volume_fx:1}));settings.toggle('volume_music');settings.beginWindow();assert.equal(settings.toggle('volume_music'),1,'a new native level window captures zero preference and restores default1')}
