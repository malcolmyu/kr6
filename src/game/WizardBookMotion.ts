import {EnemyArrowMotion} from './EnemyArrowMotion.ts'
import type {Point} from './types'
/** Original copies.insert30317 computes flight time from initial distance,
 * then arrow.insert2118 adds linear movement prediction and per-axis error. */
export class WizardBookMotion extends EnemyArrowMotion {
 readonly aim:Point
 constructor(from:Point,target:Point,velocity:Point,config:{g:number;hit_distance:number;predict_target_pos?:boolean;prediction_error?:boolean},random:()=>number){
  const dx=target.x-from.x,dy=target.y-from.y,distance=Math.sqrt(dx*dx+dy*dy),duration=Math.sqrt(2*distance/-config.g),to={...target}
  if(config.predict_target_pos){const x=config.prediction_error&&velocity.x!==0?random()*10:0,y=config.prediction_error&&velocity.y!==0?-random()*10:0;to.x+=velocity.x*duration+x;to.y+=velocity.y*duration+y}
  super(from,to,{...config,fixed_height:0},duration);this.aim=to;this.hidden=false
 }
}
