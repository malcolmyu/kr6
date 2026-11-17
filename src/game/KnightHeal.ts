import data from '../../public/data/knight-heal.json' with {type:'json'}
import {soldierIsDead} from './SoldierHealth.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {SoldierInstance} from './BarracksCombat'
import type {TowerSite} from './TowerSystem'
export interface KnightHealState {disabled?:boolean;ts:number;hpFraction?:number;cast?:{at:number;phase:1|2|3;firstAt?:number}}
/** Original knight B: a two-pulse, yielding cast during melee cooldown only. */
export class KnightHealSystem {
 private states=new WeakMap<SoldierInstance,KnightHealState>()
 onSound:(name:string)=>void=()=>{}
 state(s:SoldierInstance){let state=this.states.get(s);if(!state){state={disabled:data.attack.disabled,ts:data.attack.ts};this.states.set(s,state)}return state}
 insertSoldier(s:SoldierInstance){const rank=s.powerLevels?.skill_b??0;if(s.name==='soldier_knights_lvl4'&&rank>0){const state=this.state(s);state.disabled=undefined;state.hpFraction=data.fractions[rank-1]}}
 towerLoop(site:TowerSite,soldiers:SoldierInstance[]){
  if(site.tower!=='tower_knights_lvl4'||!site.powerChanges?.has('skill_b'))return
  for(const s of soldiers)if(s.siteId===site.id){s.powerLevels={...s.powerLevels,skill_b:site.powerLevels?.skill_b??0};(s.powerChanges??=new Set()).add('skill_b')}
  site.powerChanges.delete('skill_b')
 }
 powerMain(s:SoldierInstance,outer:boolean,time:number){
  if(s.name!=='soldier_knights_lvl4'||!outer||s.diedAt!==undefined||!s.powerChanges?.has('skill_b'))return
  s.powerChanges.delete('skill_b');const state=this.state(s),rank=s.powerLevels!.skill_b
  state.disabled=undefined;state.hpFraction=data.fractions[rank-1];if(rank===1)state.ts=time-data.attack.cooldown
 }
 tryStart(s:SoldierInstance,time:number){
  if(s.name!=='soldier_knights_lvl4')return false
  const state=this.state(s)
  if(state.disabled||!(time-state.ts>data.attack.cooldown)||s.hp>=s.template.health.hp_max)return false
  state.cast={at:time,phase:1};s.visualOverride={name:data.attack.animation,at:time,loop:false};this.onSound(data.attack.sound);return true
 }
 /** Active waits own the soldier's main slot, including the completion frame. */
 advance(s:SoldierInstance,time:number){
  const state=this.states.get(s),cast=state?.cast;if(!state||!cast)return false
  if(cast.phase===1){
   if(time-cast.at<data.attack.cast_times[0]){
    if(soldierIsDead(s)||s.template.unit?.is_stunned||s.rallyRequested)state.cast=undefined
    return true
   }
   state.ts=cast.at;this.pulse(s,state);cast.firstAt=time;cast.phase=2
  }
  if(cast.phase===2){
   if(time-cast.firstAt!<data.attack.cast_times[1]-data.attack.cast_times[0])return true
   this.pulse(s,state);cast.phase=3
  }
  if(nativeLogicAnimationFrame(data.frames,time,cast.at,false,30).runs>0)state.cast=undefined
  return true
 }
 private pulse(s:SoldierInstance,state:KnightHealState){s.hp=Math.max(0,Math.min(s.template.health.hp_max,s.hp+s.template.health.hp_max*state.hpFraction!/2))}
}
