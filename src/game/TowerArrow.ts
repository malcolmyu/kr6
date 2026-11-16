import type {Point} from './types'
export interface TowerArrowConfig {fixed_height:number;g:number;predict_target_pos?:boolean;prediction_error?:boolean}
/** The fixed-height insert replaces flight_time before the base arrow adds linear prediction. */
export function towerArrowAim(target:Point,velocity:Point,config:TowerArrowConfig,random:()=>number) {
 const duration=-2*Math.sqrt(-2*config.fixed_height*config.g)/config.g,to={...target}
 if(config.predict_target_pos){const x=config.prediction_error&&velocity.x!==0?random()*10:0,y=config.prediction_error&&velocity.y!==0?-random()*10:0;to.x+=velocity.x*duration+x;to.y+=velocity.y*duration+y}
 return {to,duration}
}
