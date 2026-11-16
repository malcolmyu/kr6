import data from '../../public/data/health-bars.json' with {type:'json'}
import type {Point} from './types'
export interface HealthBarConfig {z?:number;draw_order?:number;sort_y_offset?:number;hidden:boolean;offset:Point;type:string;alpha:number;hide_duration:number;show_duration:number;disable_fade?:boolean;colors?:{fg:number[];bg:number[]}}
export class HealthBar {
  alpha:number
  fadeAt?:number
  readonly config:HealthBarConfig
  constructor(config:HealthBarConfig){this.config=config;this.alpha=config.alpha}
  sample(time:number,hp:number,maxHp:number,pos:Point,hidden=this.config.hidden) {
    const c=this.config,size=data.sizes[c.type as keyof typeof data.sizes]
    if(!hidden && !c.disable_fade) {
      if(hp===maxHp) {
        if(this.alpha>0){this.fadeAt??=time;this.alpha=255*Math.max(0,Math.min(1,1-(time-this.fadeAt)/c.hide_duration))}
        else this.fadeAt=undefined
      }else if(this.alpha<255){this.fadeAt??=time;this.alpha=255*Math.max(0,Math.min(1,(time-this.fadeAt)/c.show_duration))}
      else this.fadeAt=undefined
    }
    return {x:Math.floor(pos.x)+c.offset.x-size.x/2,y:Math.ceil(pos.y)+c.offset.y,width:size.x,height:size.y,fillWidth:hp/maxHp*size.x,opacity:(c.disable_fade?255:this.alpha)/255,hidden,colors:c.colors??data.colors}
  }
}
