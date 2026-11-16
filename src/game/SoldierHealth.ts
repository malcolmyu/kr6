import {recordEnemyDamage} from './EnemyDeath.ts'
import {predictDamage} from './Damage.ts'
import type {Damage} from './Damage'
import type {SoldierInstance} from './BarracksCombat'
import type {EnemyInstance} from './GameSession'
export interface SoldierBuff {armor:number;magicArmor:number;spikedArmor:number;nativeApplied?:boolean}
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
export function soldierDamageFactor(s:SoldierInstance){return (s.template.unit?.damage_factor??1)*(s.reinforcementDamageFactor??1)}
/** Keep unclamped contributions separate: removing a stacked modifier must restore the raw armour. */
export function soldierHealth(s:SoldierInstance){
 let armor=s.template.health.armor,magic=s.template.health.magic_armor,spiked=s.template.health.spiked_armor??0
 for(const buff of s.buffs?.values()??[]){if(buff.nativeApplied)continue;armor+=buff.armor;magic+=buff.magicArmor;spiked+=buff.spikedArmor}
 return {...s.template.health,hp:s.hp,armor:clamp(armor),magic_armor:clamp(magic),spiked_armor:clamp(spiked)}
}
const nativeArmorHealth=new WeakMap<SoldierInstance,object>()
/** Native SU.armor_inc/dec keeps raw values and reverses by arithmetic, including floating-point residue. */
export function adjustSoldierArmor(s:SoldierInstance,armor:number,magic:number,spiked=0){
 if(nativeArmorHealth.get(s)!==s.template.health){s.template={...s.template,health:{...s.template.health}};nativeArmorHealth.set(s,s.template.health)}
 const h=s.template.health as SoldierInstance['template']['health']&{raw_armor?:number;raw_magic_armor?:number;raw_spiked_armor?:number}
 h.raw_armor=(h.raw_armor??h.armor)+armor;h.armor=clamp(h.raw_armor)
 h.raw_magic_armor=(h.raw_magic_armor??h.magic_armor)+magic;h.magic_armor=clamp(h.raw_magic_armor)
 if(spiked!==0){h.raw_spiked_armor=(h.raw_spiked_armor??h.spiked_armor??0)+spiked;h.spiked_armor=clamp(h.raw_spiked_armor)}
}
/** Native health damage reflects the incoming raw value to the soldier's current melee target. */
export function damageSoldier(s:SoldierInstance,damage:Damage,time:number,onKill:(enemy:EnemyInstance)=>void=()=>{},onReflect?: (enemy:EnemyInstance,value:number)=>void){
 if(s.ignoreDamage||((s.rallyImmunity??0)&damage.damage_type)!==0)return 0
 const health=soldierHealth(s),target=s.target,applied=predictDamage(health,damage,true)
 s.hp-=applied;s.lastHitAt=time
 if(health.spiked_armor>0 && !(damage.damage_type&64) && target && target.hp>0 && !target.template.health.ignore_damage){
  if(onReflect)onReflect(target,Math.ceil(health.spiked_armor*damage.value))
  else{
  recordEnemyDamage(target,64,time)
  target.hp-=predictDamage({...target.template.health,hp:target.hp},{value:Math.ceil(health.spiked_armor*damage.value),damage_type:64})
  if(target.hp<=0){target.diedAt=time;onKill(target)}
  }
 }
 if(s.hp<=0){
  if(s.name.startsWith('soldier_knights_lvl')||s.nativeReinforcement||s.nativeHeroLife){
   // health11 marks death; the yielding main_script still owns target/animation.
   if(s.nativeHeroLife&&s.deathHealthAt===undefined){s.deathTarget=target;s.deathContinuation=!!(s.attack||s.rangedUntil!==undefined||s.deploying||s.scriptLocked)}
   s.hp=0;s.deathHealthAt??=time;s.holdsBlockWhileDead=true
  }else{if(s.hero)s.deathTarget=target;s.diedAt=time;s.target=undefined;s.attack=undefined}
 }
 return applied
}
