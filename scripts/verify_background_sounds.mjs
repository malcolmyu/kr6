import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {BackgroundSounds} from '../src/game/BackgroundSounds.ts'
const rows=JSON.parse(readFileSync('analysis/background-sounds-oracle.json'))
for(const row of rows){
 let tick=0,calls=0;const events=[],system=new BackgroundSounds({data:{entities_list:[{template:'background_sounds_kr5',min_delay:7,max_delay:13,only_on_preparation:true,sounds:['Terrain1AmbienceSoundBirds','Terrain1AmbienceSoundWind','Terrain1AmbienceSoundCicadas']}]}},()=>{calls++;return row.roll})
 system.onRemove=()=>events.push({tick,kind:'remove'});system.onSound=name=>events.push({tick,kind:'sound',name})
 for(const frame of row.frames){tick=frame.tick;system.advance(tick*(1/30),row.start>0&&tick>=row.start?1:0);assert.equal(calls,frame.calls);assert.equal(system.removed,frame.removed)}
 assert.deepEqual(events,row.events)
}
console.log('12 original ambient sound cases/14400frames: exact integer delay/selection draws, repeated preparation audio and native wave-start removal timing match')
