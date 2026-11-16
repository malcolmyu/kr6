import assert from 'node:assert/strict'
import {AudioManager} from '../src/game/AudioManager.ts'
class Gain {gain={value:1,setValueAtTime(value){this.value=value}};connect(target){this.target=target}disconnect(){this.target=undefined}}
class Source {playbackRate={value:1};connect(target){this.target=target}disconnect(){}start(at,offset=0){this.at=at;this.offset=offset;this.started=true}stop(){this.stopped=true;this.onended?.()}}
class Context {currentTime=0;destination={};sources=[];createGain(){return new Gain()}createBufferSource(){const source=new Source();this.sources.push(source);return source}async resume(){}async close(){}async decodeAudioData(){return {duration:10}}}
const contextGlobal=globalThis.AudioContext,fetchGlobal=globalThis.fetch
const sounds={music:{files:['music.ogg'],source_group:'MUSIC',loop:true,pitch:2,gain:.4},fx:{files:['fx.ogg'],source_group:'SFX',delay:3,pitch:.5},gui:{files:['gui.ogg'],source_group:'GUI'}}
globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:true,json:async()=>({sounds,settings:{source_groups:{MUSIC:{max_sources:1},SFX:{max_sources:4},GUI:{max_sources:4}}}}),arrayBuffer:async()=>new ArrayBuffer(0)})
try{
 const audio=new AudioManager();audio.setVolumes({volume_music:.3,volume_fx:.7});await audio.init();await audio.unlock();const ctx=audio.context
 await audio.play('music');await audio.play('fx');assert.equal(audio.musicBus.gain.value,.3);assert.equal(audio.fxBus.gain.value,.7)
 assert.equal(audio.voices[0].gain.target,audio.musicBus);assert.equal(audio.voices[1].gain.target,audio.fxBus)
 ctx.currentTime=1;audio.pause();const music=audio.voices[0],fx=audio.voices[1];assert.equal(music.offset,2);assert.equal(fx.offset,0);assert.equal(fx.delay,2);assert.equal(music.node,undefined)
 await audio.play('gui');const gui=audio.voices[2];assert(gui.node.started,'new UI sound can play while existing sources are paused')
 ctx.currentTime=20;audio.resume();assert.equal(music.node.offset,2);assert.equal(music.node.at,20);assert.equal(fx.node.at,22);assert.equal(gui.node.at,1)
 ctx.currentTime=27;audio.pause();assert.equal(music.offset,6,'loop offsets wrap by duration and retain pitch');assert.equal(fx.offset,2.5)
 audio.setVolumes({volume_music:0,volume_fx:.2});assert.equal(audio.musicBus.gain.value,0);assert.equal(audio.fxBus.gain.value,.2)
 audio.stopGroup('MUSIC');assert.equal(audio.voices.some(v=>v.group==='MUSIC'),false);audio.stopAll();audio.resume();assert.equal(audio.voices.length,0)
 await audio.play('fx');await audio.play('gui');const fxNode=audio.voices.find(v=>v.name==='fx').node;audio.stopEvent('fx');assert(fxNode.stopped);assert.deepEqual(audio.voices.map(v=>v.name),['gui'],'stopping an event leaves unrelated voices playing');audio.stopAll();
 const pending=audio.play('fx');audio.stopEvent('fx');await pending;assert.equal(audio.voices.length,0,'an event stopped during buffer loading cannot start late');
 await audio.play('music');const voice=audio.voices[0];voice.node.onended();assert.equal(audio.voices.length,0);audio.dispose()
 console.log('Audio buses update active sources independently; native pause/resume preserves pitch-adjusted loop offsets, delayed starts, UI voices and stop/ended cleanup')
}finally{globalThis.AudioContext=contextGlobal;globalThis.fetch=fetchGlobal}
