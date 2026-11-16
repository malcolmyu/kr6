export interface IdleFlip {chance:number;cooldown:number;ts_counter:number;ts:number;last_animation:string;loop:boolean|number;animations?:string[]}
export interface IdleVisual {name:string;at:number;loop:boolean}
/** Original SU.soldier_idle2486. Animation selection takes effect on the next
 * call; the strict accumulated clock and >2-tick interruption reset are native. */
export class SoldierIdle {
 readonly state:IdleFlip
 private random:()=>number
 constructor(config:IdleFlip,random:()=>number){this.state=structuredClone(config);this.random=random}
 advance(time:number,dt:number,previous:IdleVisual,flip:boolean,stunned=false,forceTs=false){
  const s=this.state,loop=s.loop===true||s.loop===-1,visual={name:s.last_animation,at:loop&&!forceTs?previous.at:time,loop}
  if(stunned)return{visual,flip}
  if(time-s.ts>2*dt)s.ts_counter=0
  s.ts=time;s.ts_counter+=dt
  if(s.cooldown<s.ts_counter){s.ts_counter=0;if(this.random()<s.chance)flip=!flip;if(s.animations?.length)s.last_animation=s.animations[Math.floor(this.random()*s.animations.length)]}
  return {visual,flip}
 }
}
