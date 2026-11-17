import data from '../../public/data/reinforcements.json' with {type:'json'}
import {nativeAnimationFrame,nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {Point} from './types'
export function reinforcementSquad(pos:Point,special:boolean){
 const result:{name:string;pos:Point;slot:number}[]=[]
 const ellipse=(index:number)=>{const angle=index*2*Math.PI/3-Math.PI/2+15;return {x:pos.x+30*Math.cos(angle),y:pos.y+30*.7*Math.sin(angle)}}
 if(special)result.push({name:'soldier_reinforcement_special',pos:ellipse(0),slot:3})
 for(let slot=1;slot<=2;slot++)result.push({name:'soldier_reinforcement_base',pos:special?ellipse(slot):{x:pos.x+(slot===1?10:-10),y:pos.y+(slot===1?-10:10)},slot})
 return result
}
const animations=data.animations as Record<string,{from:number;to:number}>
export function reinforcementAnimationFinished(name:string,elapsed:number){const a=animations[`reinforcements_lvl3_special_unit_${name}`];return nativeAnimationFrame(a.to-a.from+1,elapsed,false,30).runs>0}
export function reinforcementFrames(prefix:string,name:string){const a=animations[`${prefix}_${name}`];return a?a.to-a.from+1:undefined}
/** Original loopable melee coroutine1871, restricted to this unit's one-loop attack. */
export class SpecialReinforcementAttack {
 name='attack_in';at:number;attackTs=0;done=false;result=false
 private phase:'in'|'hit'|'loop'|'out'='in'
 private started:number
 private nativeLogic:boolean
 constructor(time:number,nativeLogic=false){this.at=time;this.started=time;this.nativeLogic=nativeLogic}
 private finished(name:string,time:number){return this.nativeLogic?nativeLogicAnimationFrame(reinforcementFrames('reinforcements_lvl3_special_unit',name)??1,time,this.at,false,30).runs>0:reinforcementAnimationFinished(name,time-this.at)}
 advance(time:number,state:{dead?:boolean;stunned?:boolean;rally?:boolean}){
  let hit=false
  if(this.done)return hit
  const finish=()=>{this.done=true}
  const out=()=>{this.phase='out';this.name='attack_out';this.at=time}
  if(this.phase==='in'){
   if(!this.finished(this.name,time))return hit
   this.phase='hit';this.name='attack_loop';this.at=time
  }
  if(this.phase==='hit'){
   if(time-this.at<.3){if(state.stunned)out();else if(state.dead||state.rally)finish();return hit}
   this.attackTs=this.started;hit=true;this.result=true;this.phase='loop'
  }
  if(this.phase==='loop'){
   if(this.finished(this.name,time))out()
   else if(state.stunned)out()
   else if(state.dead||state.rally)finish()
  }
  if(this.phase==='out'&&(this.finished(this.name,time)||state.dead||state.rally))finish()
  return hit
 }
}
