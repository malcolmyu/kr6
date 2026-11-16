import type {Point} from './types'
export interface ForceMotion {a_step:number;max_v:number;max_a:number;v:Point;a:Point}
export interface BoltMotionConfig {force_motion:ForceMotion;initial_impulse?:number;initial_impulse_duration?:number;initial_impulse_angle_abs?:number;initial_impulse_angle?:number}
function trim(vector:Point,max:number):Point {
  // hump.vector-light125 scales by sqrt(max²/len²), not max/sqrt(len²).
  const ratio=max*max/(vector.x*vector.x+vector.y*vector.y),factor=ratio<=1?Math.sqrt(ratio):1
  return {x:vector.x*factor,y:vector.y*factor}
}
function normalized(vector:Point):Point {const length=Math.sqrt(vector.x*vector.x+vector.y*vector.y);return length>0?{x:vector.x/length,y:vector.y/length}:vector}
/** kr6 bolt.update (1664): initial impulse and its local steering integrator. */
export class BoltMotion {
  velocity:Point
  acceleration:Point
  private config:BoltMotionConfig
  private initialDirection:Point
  constructor(config:BoltMotionConfig,from:Point,to:Point) {
    this.config=config;this.velocity={...config.force_motion.v};this.acceleration={...config.force_motion.a}
    this.initialDirection=normalized({x:to.x-from.x,y:to.y-from.y})
  }
  step(pos:Point,to:Point,age:number,dt:number):boolean {
    const c=this.config,fm=c.force_motion
    if(c.initial_impulse!==undefined && age<c.initial_impulse_duration!) {
      const absolute=c.initial_impulse_angle_abs!==undefined,angle=absolute?c.initial_impulse_angle_abs!:(c.initial_impulse_angle??0)*(this.initialDirection.x<0?-1:1),v=absolute?{x:1,y:0}:this.initialDirection,cos=Math.cos(angle),sin=Math.sin(angle),force=(1-age)*c.initial_impulse
      this.acceleration={x:force*(cos*v.x-sin*v.y),y:force*(sin*v.x+cos*v.y)}
      this.integrate(pos,dt)
      return false
    }
    const delta={x:to.x-pos.x,y:to.y-pos.y},distance=Math.sqrt(delta.x*delta.x+delta.y*delta.y),direction=normalized(delta)
    let steer={x:direction.x*fm.max_v-this.velocity.x,y:direction.y*fm.max_v-this.velocity.y}
    if(distance<=4*fm.max_v*dt){const n=normalized(steer);steer={x:n.x*fm.max_a,y:n.y*fm.max_a}}
    const force=trim({x:steer.x*fm.a_step,y:steer.y*fm.a_step},fm.max_a)
    this.acceleration.x+=force.x;this.acceleration.y+=force.y
    this.integrate(pos,dt)
    this.acceleration={x:0,y:0}
    return distance<=fm.max_v*dt
  }
  private integrate(pos:Point,dt:number) {
    this.velocity=trim({x:this.velocity.x+this.acceleration.x*dt,y:this.velocity.y+this.acceleration.y*dt},this.config.force_motion.max_v)
    pos.x+=this.velocity.x*dt;pos.y+=this.velocity.y*dt
  }
}
