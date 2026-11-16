import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {Point} from './types'
interface Config {_bullet:string;_range:number;bullet_count:number[];min_damage:number[];max_damage:number[]}
export interface WizardBookShot {name:string;from:Point;to:Point;target?:number|string;min:number;max:number}
export interface WizardBookAura {pos:Point;level:number;phase:'new'|'land'|'idle'|'windup'|'linger'|'fade';animation:string;at:number;loop:boolean;alpha:number;lastAt:number;waitAt:number;remaining:number;tweenAt?:number;pending:boolean;removed:boolean}
/** Shipped aura_wizard_skill_c18351. Its own main and tween have separate slots. */
export class WizardBookAuraSystem {
 onCreateShot:(name:string)=>void=()=>{}
 onShot:(shot:WizardBookShot,time:number)=>void=()=>{}
 onRemove:(aura:WizardBookAura)=>void=()=>{}
 targets:(pos:Point,range:number)=>{id:number|string;pos:Point}[]=()=>[]
 private config:Config
 private landFrames:number
 private random:()=>number
 constructor(config:Config,landFrames:number,random:()=>number){this.config=config;this.landFrames=landFrames;this.random=random}
 create(pos:Point,level:number):WizardBookAura{return{pos:{...pos},level,phase:'new',animation:'land',at:0,loop:true,alpha:255,lastAt:0,waitAt:0,remaining:0,pending:false,removed:false}}
 private idle(a:WizardBookAura,time:number){a.animation='idle';a.at=time;a.loop=false}
 advance(a:WizardBookAura,time:number){
  if(a.removed||a.pending)return
  if(a.phase==='new'){a.phase='land';a.animation='land';a.at=time;a.loop=false}
  if(a.phase==='land'){
   if(!nativeLogicAnimationFrame(this.landFrames,time,a.at,false,30).runs)return
   a.lastAt=time;a.remaining=this.config.bullet_count[a.level-1];a.phase='idle'
  }
  if(a.phase==='windup'){
   if(time-a.waitAt<.5)return
   const targets=this.targets(a.pos,this.config._range)
   this.onCreateShot(this.config._bullet)
   let to:Point,target:number|string|undefined
   if(targets.length){target=targets[0].id;to={...targets[0].pos}}
   else{let x=10+Math.floor(this.random()*21);if(this.random()>.5)x=-x;let y=10+Math.floor(this.random()*21);if(this.random()>.5)y=-y;to={x:a.pos.x+x,y:a.pos.y+y}}
   this.onShot({name:this.config._bullet,from:{...a.pos},to,target,min:this.config.min_damage[a.level-1],max:this.config.max_damage[a.level-1]},time)
   a.remaining--;a.phase=a.remaining>0?'idle':'linger'
   if(a.phase==='linger'){this.idle(a,time);a.waitAt=time}
  }
  if(a.phase==='idle'){
   this.idle(a,time)
   if(.5<time-a.lastAt){a.animation='shoot';a.at=time;a.loop=false;a.lastAt=time-.5;a.waitAt=time;a.phase='windup'}
  }else if(a.phase==='linger'&&time-a.waitAt>=1){a.phase='fade';a.tweenAt=time}
 }
 tween(a:WizardBookAura,time:number){
  if(a.removed||a.tweenAt===undefined||a.pending)return
  const elapsed=time-a.tweenAt;a.alpha=255+(0-255)*Math.max(0,Math.min(1,elapsed/.5))
  if(elapsed>=.5){a.pending=true;this.onRemove(a)}
 }
 remove(a:WizardBookAura){a.removed=true}
}
