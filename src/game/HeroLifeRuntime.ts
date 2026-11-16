import data from '../../public/data/hero-life-runtime.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {HeroUnit} from './HeroSystem'
import type {Point} from './types'
export interface HeroTombstone {name:string;pos:Point;at:number;facingLeft:boolean;alpha:number;tweenAt?:number;removalQueued?:boolean}
export interface HeroLifeState {at:number;phase:'death'|'wait'|'respawn';animationAt:number;finishedAt?:number;tomb?:HeroTombstone;hidden:boolean}
/** SU.y_hero_death_and_respawn_kr5, ordinary two-hero life coroutine. */
export class HeroLifeRuntime {
 readonly states=new WeakMap<HeroUnit,HeroLifeState>()
 readonly tombs:HeroTombstone[]=[]
 onQueue:(tomb:HeroTombstone)=>void=()=>{}
 onRemove:(tomb:HeroTombstone)=>void=()=>{}
 onRelease:(hero:HeroUnit)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 advance(h:HeroUnit,time:number){
  let s=this.states.get(h);if(!s&&h.hp>0)return false
  const c=data[h.name as keyof typeof data]
  if(!s){s={at:time,phase:'death',animationAt:time,hidden:false};this.states.set(h,s);h.diedAt=time;h.deathFinishedAt=undefined;this.onRelease(h);h.attack=undefined;h.meleeVisual=undefined;h.moving=false;h.deploying=false;h.scriptLocked=true;h.holdsBlockWhileDead=false;h.lifeCanClick=false;h.visualOverride={name:c.deathAnimation,at:time,loop:false};this.onSound(c.sound.death)}
  if(s.phase==='death'){
   const tomb='tombstone'in c?c.tombstone:undefined
   if(tomb&&tomb.concurrent&&!s.tomb&&time-s.at>=tomb.showTime)this.queueTomb(h,s,time,tomb.name)
   if(nativeLogicAnimationFrame(c.frames[c.deathAnimation as keyof typeof c.frames],time,s.animationAt,false,30).runs===0)return true
   s.finishedAt=h.deathFinishedAt=time;s.phase='wait'
  }
  if(s.phase==='wait'){
   const tomb='tombstone'in c?c.tombstone:undefined
   if(tomb&&!s.tomb){if(time-s.at<tomb.showTime)return true;this.queueTomb(h,s,time,tomb.name)}
   if(time-s.at<h.template.health.dead_lifetime)return true
   s.phase='respawn';s.animationAt=time;h.deathFinishedAt=undefined;h.ignoreDamage=true;h.respawnEndsAt=time+c.frames[c.respawnAnimation as keyof typeof c.frames]/30;h.visualOverride={name:c.respawnAnimation,at:time,loop:false};if(s.tomb)s.tomb.tweenAt=time;this.onSound(c.sound.respawn)
  }
  if(s.phase==='respawn'&&nativeLogicAnimationFrame(c.frames[c.respawnAnimation as keyof typeof c.frames],time,s.animationAt,false,30).runs>0){
   if(s.tomb)this.onRemove(s.tomb)
   h.hp=h.template.health.hp_max;h.diedAt=undefined;h.deathHealthAt=undefined;h.deathContinuation=false;h.ignoreDamage=false;h.healthBarHidden=false;h.lifeCanClick=true;h.scriptLocked=false;h.respawnEndsAt=undefined;h.idleVisual={name:c.respawnAnimation,at:s.animationAt,loop:false};h.visualOverride=undefined;this.states.delete(h);return false
  }
  return true
 }
 private queueTomb(h:HeroUnit,s:HeroLifeState,time:number,name:string){const m:HeroTombstone={name,pos:h.pos,at:time,facingLeft:h.facingLeft,alpha:255};s.tomb=m;this.tombs.push(m);this.onQueue(m)}
 tween(m:HeroTombstone,time:number){if(m.tweenAt===undefined||m.removalQueued)return;m.alpha=0;if(time-m.tweenAt>=1/30){m.removalQueued=true;this.onRemove(m)}}
 remove(m:HeroTombstone){const i=this.tombs.indexOf(m);if(i>=0)this.tombs.splice(i,1)}
}
