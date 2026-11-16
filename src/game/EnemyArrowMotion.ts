import type {Point} from './types'
export interface EnemyArrowConfig {g:number;fixed_height:number;hit_distance:number;hide_radius?:number}
/** Shipped enemy arrow fixed-height insert and yield-before-integrate parabola update. */
export class EnemyArrowMotion {
 readonly duration:number
 readonly speed:Point
 readonly pos:Point
 rotation=0
 hidden=true
 private from:Point
 private to:Point
 private config:EnemyArrowConfig
 constructor(from:Point,to:Point,config:EnemyArrowConfig,durationOverride?:number){this.from={...from};this.to={...to};this.config=config;this.pos={...from};this.duration=durationOverride??-2*Math.sqrt(-2*config.fixed_height*config.g)/config.g;this.speed={x:(to.x-from.x)/this.duration,y:(to.y-from.y)/this.duration-config.g*this.duration/2}}
 step(elapsed:number,dt:number,target?:Point){
  if(elapsed<=0)return false
  const last={...this.pos};this.pos.x=this.from.x+this.speed.x*elapsed;this.pos.y=this.from.y+this.speed.y*elapsed+.5*this.config.g*elapsed*elapsed
  this.rotation=Math.atan2(this.pos.y-last.y,this.pos.x-last.x)
  const hide=this.config.hide_radius??0;this.hidden=Math.hypot(this.pos.x-this.from.x,this.pos.y-this.from.y)<hide||Math.hypot(this.pos.x-this.to.x,this.pos.y-this.to.y)<hide
  const t=elapsed+dt,futureY=this.from.y+this.speed.y*t+.5*this.config.g*t*t
  return !!target&&futureY<this.pos.y&&futureY<target.y&&Math.abs(this.pos.x-this.to.x)<this.config.hit_distance || elapsed+dt>this.duration
 }
}
