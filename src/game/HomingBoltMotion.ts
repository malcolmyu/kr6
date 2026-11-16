import type {Point} from './types'
export interface HomingConfig {min_speed:number;max_speed:number;acceleration_factor:number}
/** Zefira's original direct homing loop: yield, steer, move, then arrival test. */
export class HomingBoltMotion {
  speed:number
  rotation=0
  private started=false
  private config:HomingConfig
  constructor(config:HomingConfig){this.config=config;this.speed=config.min_speed}
  step(pos:Point,to:Point,dt:number):boolean {
    if(!this.started){this.started=true;return Math.hypot(to.x-pos.x,to.y-pos.y)<=this.speed*dt}
    const c=this.config
    this.speed=Math.max(c.min_speed,Math.min(c.max_speed,this.speed+30*Math.ceil(this.speed/30*c.acceleration_factor)))
    const dx=to.x-pos.x,dy=to.y-pos.y,d=Math.hypot(dx,dy)
    if(d){pos.x+=dx/d*this.speed*dt;pos.y+=dy/d*this.speed*dt}
    this.rotation=Math.atan2(to.y-pos.y,to.x-pos.x)
    return Math.hypot(to.x-pos.x,to.y-pos.y)<=this.speed*dt
  }
}
