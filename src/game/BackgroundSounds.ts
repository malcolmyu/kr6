import defaults from '../../public/data/background-sounds.json' with {type:'json'}
import type {LevelData} from './types'
/** Original background_sounds_kr5.update31354; it exits on the first delay
 * completion after a wave starts when only_on_preparation is set. */
export class BackgroundSounds {
 readonly present:boolean
 removed=false
 onRemove:()=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 private at?:number
 private delay=0
 private config:typeof defaults
 private random:()=>number
 constructor(level:LevelData,random:()=>number){
  const entity=level.data.entities_list.find(e=>e.template==='background_sounds_kr5')
  this.present=!!entity;this.config={...defaults,...entity} as typeof defaults;this.random=random
 }
 private drawDelay(time:number){this.at=time;this.delay=this.config.min_delay+Math.floor(this.random()*(this.config.max_delay-this.config.min_delay+1))}
 advance(time:number,wave:number){
  if(!this.present||this.removed)return
  if(this.at===undefined)this.drawDelay(time)
  if(time-this.at!<this.delay)return
  if(wave>0&&this.config.only_on_preparation){this.removed=true;this.onRemove();return}
  this.onSound(this.config.sounds[Math.floor(this.random()*this.config.sounds.length)])
  this.drawDelay(time)
 }
}
