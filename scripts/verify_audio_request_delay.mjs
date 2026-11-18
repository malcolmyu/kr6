import assert from 'node:assert/strict'
import {AudioManager} from '../src/game/AudioManager.ts'
function fixture(definitionDelay){
 const starts=[],context={currentTime:100,createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),createBufferSource:()=>({playbackRate:{value:1},connect(){},disconnect(){},stop(){},start(at,offset){starts.push({at,offset})}})},audio=new AudioManager()
 audio.context=context;audio.data={sounds:{cast:{files:['cast.ogg'],delay:definitionDelay}},settings:{source_groups:{DEFAULT:{max_sources:16}}}};audio.fxBus={};audio.musicBus={};audio.buffers.set('cast.ogg',Promise.resolve({duration:2}));return {audio,context,starts}
}
for(const [definition,option,wanted]of [[undefined,.7,100.7],[.2,undefined,100.2],[.2,0,100]]){const f=fixture(definition);await f.audio.play('cast',option===undefined?undefined:{delay:option});assert.deepEqual(f.starts,[{at:wanted,offset:0}])}
for(const decodedAt of [100.5,100.9]){const f=fixture();let resolve;f.audio.buffers.set('cast.ogg',new Promise(r=>resolve=r));const request=f.audio.play('cast',{delay:.7});f.context.currentTime=decodedAt;resolve({duration:2});await request;assert.equal(f.starts[0].at,Math.max(decodedAt,100.7))}
{const f=fixture();await f.audio.play('cast',{delay:.7});f.context.currentTime=100.3;f.audio.pause();f.context.currentTime=103;f.audio.resume();assert(Math.abs(f.starts[1].at-103.4)<1e-9);assert.equal(f.starts[1].offset,0)}
{const f=fixture();let resolve;f.audio.buffers.set('cast.ogg',new Promise(r=>resolve=r));const request=f.audio.play('cast',{delay:.7});f.audio.stopAll();resolve({duration:2});await request;assert.deepEqual(f.starts,[])}
console.log('WebAudio request delay: original C .7s override, definition fallback, explicit0, timely/late decode, pause preserves remaining delay, restart cancels queued decode')
