import type {AudioVolumes} from './AudioSettings'
interface SoundDefinition {files:string[];gain?:number|number[];pitch?:number|number[];loop?:boolean;source_group?:string;mode?:string;delay?:number;ignore?:number}
interface SoundGroup {max_sources:number;gain_factor?:number}
interface AudioData {sounds:Record<string,SoundDefinition>;settings:{source_groups:Record<string,SoundGroup>}}
interface Voice {name:string;node?:AudioBufferSourceNode;gain:GainNode;group:string;buffer:AudioBuffer;rate:number;loop:boolean;offset:number;startAt:number;delay:number;paused:boolean}
export class AudioManager {
  private context?:AudioContext
  private master?:GainNode
  private musicBus?:GainNode
  private fxBus?:GainNode
  private volumes:AudioVolumes={volume_music:1,volume_fx:1}
  private paused=false
  private data?:AudioData
  private loading?:Promise<void>
  private buffers=new Map<string,Promise<AudioBuffer>>()
  private voices:Voice[]=[]
  private enabled=true
  private generation=0
  private eventGeneration=new Map<string,number>()
  private sequence=new Map<string,number>()
  private lastPlayed=new Map<string,number>()
  onError:(message:string)=>void=()=>{}
  init(){return this.loading??=(async()=>{const response=await fetch('data/audio.json');if(!response.ok)throw new Error('音频配置载入失败');this.data=await response.json()})()}
  async unlock(){
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.enabled?1:0;this.master.connect(this.context.destination);this.musicBus=this.context.createGain();this.fxBus=this.context.createGain();this.musicBus.connect(this.master);this.fxBus.connect(this.master);this.setVolumes(this.volumes)}
    await this.context.resume()
  }
  setMuted(muted:boolean){this.enabled=!muted;if(this.master)this.master.gain.setValueAtTime(muted?0:1,this.context!.currentTime)}
  setVolumes(values:AudioVolumes){this.volumes={...values};const time=this.context?.currentTime??0;this.musicBus?.gain.setValueAtTime(values.volume_music,time);this.fxBus?.gain.setValueAtTime(values.volume_fx,time)}
  pause(){if(this.paused||!this.context)return;this.paused=true;const time=this.context.currentTime
    for(const voice of this.voices){if(voice.paused)continue;voice.delay=Math.max(0,voice.startAt-time);voice.offset+=Math.max(0,time-voice.startAt)*voice.rate;if(voice.loop)voice.offset%=voice.buffer.duration;voice.paused=true;const node=voice.node;voice.node=undefined;if(node){node.onended=null;node.stop();node.disconnect()}}
  }
  resume(){if(!this.paused||!this.context)return;this.paused=false;for(const voice of [...this.voices])if(voice.paused){if(!voice.loop&&voice.offset>=voice.buffer.duration){this.stopVoice(voice);continue}voice.paused=false;this.startVoice(voice,this.context.currentTime+voice.delay)}}
  private startVoice(voice:Voice,at:number){const node=this.context!.createBufferSource();node.buffer=voice.buffer;node.loop=voice.loop;node.playbackRate.value=voice.rate;node.connect(voice.gain);voice.node=node;voice.startAt=at;node.onended=()=>{if(voice.node!==node)return;this.voices=this.voices.filter(v=>v!==voice);node.disconnect();voice.gain.disconnect()};node.start(at,voice.offset)}
  private choose(value:number|number[]|undefined,fallback:number):number {return Array.isArray(value)?value[0]+Math.random()*(value[1]-value[0]):value??fallback}
  private buffer(file:string):Promise<AudioBuffer>{
    let buffer=this.buffers.get(file)
    if(!buffer){buffer=fetch(`audio/${file}`).then(r=>{if(!r.ok)throw new Error(`Missing audio ${file}`);return r.arrayBuffer()}).then(data=>this.context!.decodeAudioData(data));this.buffers.set(file,buffer)}
    return buffer
  }
  async preload(name:string){
    await this.init()
    if(!this.context)throw new Error('Audio context must be unlocked before preload')
    const definition=this.data!.sounds[name]
    if(!definition)throw new Error(`Missing original audio event ${name}`)
    await Promise.all(definition.files.map(file=>this.buffer(file)))
  }
  async play(name:string,options?:{delay?:number}):Promise<void>{
    if(!this.context || !this.data)return
    const definition=this.data.sounds[name]
    if(!definition)throw new Error(`Missing original audio event ${name}`)
    const generation=this.generation,eventGeneration=this.eventGeneration.get(name)??0
    const requestedAt=this.context.currentTime
    if(definition.ignore!==undefined && requestedAt-(this.lastPlayed.get(name)??-Infinity)<definition.ignore)return
    this.lastPlayed.set(name,requestedAt)
    const sequence=this.sequence.get(name)??0
    const index=definition.mode==='sequence'?sequence%definition.files.length:Math.floor(Math.random()*definition.files.length)
    this.sequence.set(name,sequence+1)
    const file=definition.files[index]
    const decoded=await this.buffer(file)
    if(generation!==this.generation||eventGeneration!==(this.eventGeneration.get(name)??0))return
    const group=definition.source_group??'DEFAULT'
    const config=this.data.settings.source_groups[group]
    const active=this.voices.filter(v=>v.group===group)
    if(active.length>=(config?.max_sources??1))this.stopVoice(active[0])
    const rate=this.choose(definition.pitch,1),gain=this.context.createGain()
    gain.gain.value=this.choose(definition.gain,1)*(config?.gain_factor??1)
    gain.connect(group==='MUSIC'?this.musicBus!:this.fxBus!)
    const at=Math.max(this.context.currentTime,requestedAt+(options?.delay??definition.delay??0))
    const voice:Voice={name,gain,group,buffer:decoded,rate,loop:definition.loop??false,offset:0,startAt:at,delay:0,paused:false};this.voices.push(voice)
    this.startVoice(voice,at)

  }
  trigger(name:string|undefined,options?:{delay?:number}){if(name)void this.play(name,options).catch(e=>this.onError(String(e)))}
  stopEvent(name:string){this.eventGeneration.set(name,(this.eventGeneration.get(name)??0)+1);for(const voice of [...this.voices])if(voice.name===name)this.stopVoice(voice)}
  stopGroup(group:string){for(const voice of [...this.voices])if(voice.group===group)this.stopVoice(voice)}
  private stopVoice(voice:Voice){const node=voice.node;voice.node=undefined;if(node){node.onended=null;node.stop();node.disconnect()}voice.gain.disconnect();this.voices=this.voices.filter(v=>v!==voice)}
  stopAll(except:string[]=[]){this.generation++;for(const voice of [...this.voices])if(!except.includes(voice.name))this.stopVoice(voice)}
  dispose(){this.stopAll();void this.context?.close()}
}
