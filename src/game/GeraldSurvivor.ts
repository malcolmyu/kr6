import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import data from '../../public/data/gerald-survivor-runtime.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
interface Recovery {hero:HeroUnit;at:number;healed:boolean}
/** Original hero_gerald death branch: two-second rewind, restore health, then finish the same animation. */
export class GeraldSurvivor {
 native=false
 level=0
 cooldown=50
 hpFactor=.4
 private lastCast?:number
 private recovery?:Recovery
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onTeleport:(enemy:EnemyInstance,time:number)=>void=()=>{}
 targetPresent:(enemy:EnemyInstance)=>boolean=()=>true
 onNativeEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 configure(nodes:string[]){this.level=nodes.includes('upg_sc2')?3:nodes.includes('upg_sc1')?2:nodes.includes('skill_c')?1:0;this.cooldown=this.level===3?40:50;this.hpFactor=[.4,.4,.7,1][this.level]}
 get active(){return this.recovery!==undefined}
 get nativeLastCast(){return this.lastCast}
 advance(time:number,hero:HeroUnit|undefined,mayStart=true){
  if(this.native)return
  time=Math.round(time*30)/30
  if(!hero)return
  this.lastCast??=hero.born-this.cooldown
  const recovery=this.recovery
  if(recovery){
   if(recovery.healed&&(hero.hp<=0||hero.visualOverride?.name!=='fated_survivor')){this.finish(hero);return}
   if(!recovery.healed&&time-recovery.at>=2){
    recovery.healed=true;this.onEffect('decal_gerald_skill_c',hero.pos,time)
    const target=hero.deathTarget
    if(target&&target.hp>0&&target.escapedAt===undefined)this.onTeleport(target,time)
    hero.xpQueued+=[0,50,100,150][this.level];hero.hp=hero.template.health.hp_max*this.hpFactor;hero.diedAt=undefined;hero.ignoreDamage=false;hero.deathTarget=undefined;hero.holdsBlockWhileDead=false
   }
   if(time-recovery.at+1e-9>=Math.round(hero.template.webAnimationDurations.fated_survivor*30)/30)this.finish(hero)
   return
  }
  if(!mayStart||!this.level||hero.hp>0||hero.diedAt===undefined||time-this.lastCast<=this.cooldown)return
  this.lastCast=time;this.recovery={hero,at:time,healed:false};hero.hp=0;hero.target=hero.deathTarget;hero.holdsBlockWhileDead=!!hero.target;hero.ignoreDamage=true;hero.scriptLocked=true;hero.attack=undefined;hero.respawnEndsAt=undefined;hero.visualOverride={name:'fated_survivor',at:time};this.onSound('HeroGeraldFatedSurvivorCast')
 }
 /** Initialization belongs to the hero's first main resume, not its creation. */
 beginNativeMain(time:number){this.lastCast??=time-this.cooldown}
 advanceNative(time:number,hero:HeroUnit,rallyPending=false):boolean {
  this.beginNativeMain(time)
  let r=this.recovery
  if(!r){
   if(!this.level||hero.hp>0||time-this.lastCast!<=this.cooldown)return false
   this.lastCast=time;r={hero,at:time,healed:false};this.recovery=r
   hero.hp=0;hero.diedAt=hero.deathHealthAt??time;hero.ignoreDamage=true;hero.scriptLocked=true;hero.attack=undefined;hero.moving=false;hero.respawnEndsAt=undefined;hero.visualOverride={name:data.attack.animation,at:time,loop:false};this.onSound(data.attack.sound)
  }
  if(!r.healed){
   if(time-r.at<data.attack.cast_time)return true
   r.healed=true;this.onNativeEffect(data.attack.decal,hero.pos,time)
   const target=hero.target
   if(target&&target.hp>0&&target.escapedAt===undefined&&this.targetPresent(target))this.onTeleport(target,time)
   hero.xpQueued+=data.skill.xp_gain[this.level-1];hero.hp=hero.template.health.hp_max*this.hpFactor;hero.diedAt=undefined;hero.deathHealthAt=undefined;hero.deathFinishedAt=undefined;hero.deathContinuation=false;hero.healthBarHidden=false;hero.lifeCanClick=true;hero.ignoreDamage=false;hero.deathTarget=undefined;hero.holdsBlockWhileDead=false
  }
  if(hero.hp<=0||rallyPending||nativeLogicAnimationFrame(data.frames,time,r.at,false,30).runs>0){
   hero.idleVisual={name:hero.hp<=0?'idle':data.attack.animation,at:r.at,loop:hero.hp<=0};this.finish(hero);hero.deathContinuation=false
   // A second lethal packet interrupts the helper; the outer hero main sees
   // that death on its following resume, after the normal outer yield.
   return hero.hp<=0
  }
  return true
 }
 private finish(hero:HeroUnit){if(hero.visualOverride?.name==='fated_survivor'){hero.visualOverride=undefined;hero.scriptLocked=false}this.recovery=undefined}
}
