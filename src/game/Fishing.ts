import data from '../../public/data/fishing.json' with {type:'json'}
import {nativeAnimationFrame,nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {GameMode,LevelData,Point} from './types'

export interface FishingSprite {
 key:string;template:string;pos:Point;name:string;ts:number;hidden:boolean;loop:boolean;flip:boolean
 insertAt:number;removeAt?:number;canClick?:boolean;clicked?:boolean
}
interface Fish extends FishingSprite {jumpAt?:number;cooldown?:number}
const templates=data.templates
export const fishingTemplates=templates
const frameCount=(s:FishingSprite)=>(data.counts as Record<string,Record<string,number>>)[templates[s.template as keyof typeof templates].render.sprites[0].prefix][s.name]
const finished=(s:FishingSprite,time:number)=>nativeLogicAnimationFrame(frameCount(s),time,s.ts,s.loop,30).runs>0
const sprite=(key:string,template:keyof typeof templates,pos:Point):FishingSprite=>{
 const s=templates[template].render.sprites[0]
 return {key,template,pos:{...pos},name:s.name,ts:s.ts,hidden:'hidden'in s&&!!s.hidden,loop:s.loop,flip:s.flip_x,insertAt:0}
}
/** Shipped stage03 fish35520/fisherman35565 coroutines. This preserves the
 * discarded jump RNG draw and the boolean (not queued) fish_tapped signal. */
export class FishingSystem {
 readonly fishes:Fish[]=[]
 readonly taps:FishingSprite[]=[]
 readonly fisherman?:FishingSprite
 bubble?:FishingSprite
 fishTapped=false
 found=false
 count=0
 completed=false
 onCreate:(entity:FishingSprite,time:number)=>void=()=>{}
 onRemove:(entity:FishingSprite,time:number)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 onSignal:(name:string,args:unknown[])=>void=()=>{}
 private phase:'outer'|'windup'|'yield'|'end'='outer'
 private waitAt=0
 private bubbleAt=0
 private bubbleCooldown=6
 private random:()=>number
 constructor(level:LevelData,mode:GameMode,random:()=>number){
  this.random=random
  for(const e of level.data.entities_list){
   const filter=Number(e['editor.game_mode']??0)
   if(filter&&filter!==(mode==='campaign'?1:3))continue
   if(e.template==='decal_stage_03_fish'){
    const s=sprite(`fish${this.fishes.length+1}`,e.template,e.pos!);s.flip=Number(e['editor.flip']??0)>0;s.canClick=true;this.fishes.push(s)
   }else if(e.template==='decal_stage_03_fisherman')this.fisherman=sprite('fisherman',e.template,e.pos!)
  }
 }
 private draw(min:number,max:number){return min+Math.floor(this.random()*(max-min+1))}
 private animate(s:FishingSprite,name:string,time:number){s.name=name;s.ts=time;s.loop=false}
 click(pos:Point):boolean{
  const rect=templates.decal_stage_03_fish.ui.click_rect
  const fish=this.fishes.find(f=>f.removeAt===undefined&&f.canClick&&pos.x>=f.pos.x+rect.pos.x&&pos.x<=f.pos.x+rect.pos.x+rect.size.x&&pos.y>=f.pos.y+rect.pos.y&&pos.y<=f.pos.y+rect.pos.y+rect.size.y)
  if(!fish)return false
  fish.clicked=true;return true
 }
 advance(time:number){
  if(!this.fisherman)return
  for(const fish of this.fishes)this.advanceFish(fish,time)
  this.advanceFisherman(time)
  this.advanceTimed(time)
 }
 advanceTimed(time:number){
  // Original timed8 observes runs from the previous render22.
  for(const tap of this.taps)if(time>=tap.insertAt&&tap.removeAt===undefined&&finished(tap,time))this.remove(tap,time)
 }
 advanceActor(model:FishingSprite,time:number){if(model===this.fisherman)this.advanceFisherman(time);else if(this.fishes.includes(model as Fish))this.advanceFish(model as Fish,time)}
 private advanceFish(fish:Fish,time:number){
   if(fish.removeAt!==undefined)return
   if(fish.jumpAt===undefined){fish.jumpAt=time;fish.cooldown=this.draw(5,10)*30*(1/30)}
   if(this.found){if(finished(fish,time))this.remove(fish,time);return}
   if(fish.clicked){
    fish.clicked=false
    if(!fish.hidden){
     const tap=sprite(`tap${this.taps.length+1}`,'decal_stage_03_fish_tap',fish.pos);tap.ts=time;tap.insertAt=(Math.round(time*30)+1)*(1/30);this.taps.push(tap);this.onCreate(tap,time)
     this.fishTapped=true;fish.jumpAt=time;fish.cooldown=this.draw(15,20)*30*(1/30);fish.canClick=false
    }
   }
   if(time-fish.jumpAt>fish.cooldown!){
    this.draw(5,10) // Native local shadows the persistent cooldown; retain this draw.
    fish.jumpAt=time;fish.hidden=false;fish.canClick=true;this.animate(fish,'jump',time)
   }
   if(fish.name==='jump'&&finished(fish,time))fish.hidden=true
 }
 private remove(entity:FishingSprite,time:number){entity.removeAt=(Math.round(time*30)+1)*(1/30);this.onRemove(entity,time)}
 private advanceFisherman(time:number){
  const fisherman=this.fisherman!,config=templates.decal_stage_03_fisherman
  if(this.completed)return
  if(!this.bubble){
   this.bubble=sprite('bubble','decal_stage_03_fisherman_bubble',fisherman.pos);this.animate(this.bubble,'tap',time);this.bubble.insertAt=(Math.round(time*30)+1)*(1/30);this.bubbleAt=time;this.onCreate(this.bubble,time)
  }
  if(this.phase==='windup'){
   if(time-this.waitAt<Math.round(config.wait_sound_single*30)*(1/30))return
   this.onSound(this.count>=3?config.sound_pile:config.sound_single);this.bubbleCooldown=15;this.phase='yield';return
  }
  if(this.phase==='yield')this.phase='outer'
  if(this.count>=5){
   this.found=true;this.phase='end'
   if(finished(fisherman,time)){
    this.completed=true;this.onSignal('thats-a-lot-of-fish-stage03',[]);this.onSignal('got-gold',[config.fisherman_pos,config.reward])
   }
   return
  }
  if(time-this.bubbleAt>this.bubbleCooldown){this.animate(this.bubble,'tap',time);this.bubbleAt=time}
  if(this.fishTapped){
   this.count++;this.fishTapped=false;this.onSound(config.sound_feedback);this.animate(fisherman,`action_${this.count}`,time);this.waitAt=time;this.phase='windup'
  }
 }
 visible(time:number):FishingSprite[]{return [...this.fishes,...this.taps,...(this.fisherman?[this.fisherman]:[]),...(this.bubble?[this.bubble]:[])].filter(s=>time>=s.insertAt&&(s.removeAt===undefined||time<s.removeAt))}
 snapshot(time:number){return Object.fromEntries(this.visible(time).map(s=>[s.key,{name:s.name,ts:s.ts,hidden:s.hidden,loop:s.loop,flip:s.flip,frame:nativeAnimationFrame(frameCount(s),time-s.ts,s.loop,30).frame+1,...(s.canClick===undefined?{}:{canClick:s.canClick})}]))}
}
