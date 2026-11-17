import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import {resetSkillTimestamp} from './TowerSkillCooldown.ts'
import type {SkillClock} from './TowerSkillCooldown'
interface Attack extends SkillClock {cooldown:number;cast_time:number;min_hp:number;vis_flags:number;vis_bans:number;sound:string;eagle:string;mod:string}
export interface ArcherMarkCastState {site:TowerSite;instance:number;level:number;ts:number;started?:number;target?:EnemyInstance}
/** The tower's C coroutine blocks new basic triggers; child shooters continue. */
export class ArcherMarkCaster {
 readonly states=new Map<string,ArcherMarkCastState>()
 onEagle:(name:string,enemy:EnemyInstance,time:number)=>void=()=>{}
 onMark:(enemy:EnemyInstance,level:number,site:TowerSite,time:number)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 private attack:Attack
 constructor(attack:Attack){this.attack=attack}
 resetSkillCooldowns(site:TowerSite,time:number){const state=this.states.get(site.id),ts=resetSkillTimestamp(this.attack,time);if(state&&ts!==undefined)state.ts=ts}
 private state(site:TowerSite){
  let state=this.states.get(site.id)
  if(!state||state.instance!==(site.instance??0)){state={site,instance:site.instance??0,level:0,ts:0};this.states.set(site.id,state)}
  return state
 }
 syncUpgrades(site:TowerSite,time:number){const state=this.state(site),level=site.powerLevels?.skill_c??0;if(level!==state.level){state.level=level;if(level===1)state.ts=time-this.attack.cooldown}}
 advance(site:TowerSite,time:number,find:()=>EnemyInstance|undefined){
  const state=this.state(site),a=this.attack,upgrades=()=>this.syncUpgrades(site,time)
  if(state.started!==undefined){
   // changed powers are processed inside each yield of the ongoing cast.
   if(time-state.started<a.cast_time){upgrades();return true}
   this.onMark(state.target!,site.powerLevels?.skill_c??0,site,time);state.ts=state.started;state.started=undefined;state.target=undefined
  }
  if(site.towerBlocked)return true
  upgrades()
  if(state.level>0&&time-state.ts>a.cooldown){
   const enemy=find()
   if(!enemy)state.ts=time-a.cooldown+10/30-1e-6
   else{state.started=time;state.target=enemy;this.onEagle(a.eagle,enemy,time);this.onSound(a.sound);return true}
  }
  return false
 }
}
