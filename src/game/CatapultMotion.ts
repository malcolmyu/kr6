import type {Point} from './types'
export interface CatapultConfig {flight_time:number;g:number;align_with_trajectory?:boolean;rotation_speed?:number;hide_radius?:number}
/** Original bomb.insert and bomb.update, including yield-before-integration. */
export class CatapultMotion {
  readonly pos:Point
  readonly speed:Point
  rotation:number
  hidden=true
  private config:CatapultConfig
  private from:Point
  private to:Point
  private rotationSpeed:number
  constructor(from:Point,to:Point,config:CatapultConfig,startingRotation=0) {
    this.from={...from};this.to={...to};this.pos={...from};this.config=config;this.rotation=startingRotation
    this.hidden=(config.hide_radius??0)>0
    this.speed={x:(to.x-from.x)/config.flight_time,y:(to.y-from.y)/config.flight_time-config.g*config.flight_time/2}
    this.rotationSpeed=(config.rotation_speed??0)*(from.x<to.x?-1:1)
  }
  step(elapsed:number,dt:number) {
    if(elapsed<=0)return false
    const oldX=this.pos.x,oldY=this.pos.y
    this.pos.x=this.from.x+this.speed.x*elapsed;this.pos.y=this.from.y+this.speed.y*elapsed+.5*this.config.g*elapsed*elapsed
    if(this.config.align_with_trajectory)this.rotation=Math.atan2(this.pos.y-oldY,this.pos.x-oldX)
    else this.rotation+=this.rotationSpeed*dt
    const radius=this.config.hide_radius??0
    this.hidden=Math.hypot(this.pos.x-this.from.x,this.pos.y-this.from.y)<radius||Math.hypot(this.pos.x-this.to.x,this.pos.y-this.to.y)<radius
    return !(elapsed+dt<this.config.flight_time)
  }
}
/** Native U.dist_factor_inside_ellipse measures distance against the radial ellipse boundary. */
export function ellipseDistanceFactor(point:Point,center:Point,radius:number) {
  const x=point.x-center.x,y=point.y-center.y,angle=Math.atan2(y,x)
  return Math.max(0,Math.min(1,Math.hypot(x,y)/Math.hypot(radius*Math.cos(angle),radius*.7*Math.sin(angle))))
}
export function catapultDamage(min:number,max:number,factor:number,point:Point,center:Point,radius:number) {
  return Math.ceil(factor*Math.floor(max-(max-min)*ellipseDistanceFactor(point,center,radius)))
}
