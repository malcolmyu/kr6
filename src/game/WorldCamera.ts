import type {CameraRequest} from './TutorialState'
export interface CameraPose {x:number;y:number;zoom:number}
const clamp=(min:number,max:number,value:number)=>Math.min(max,Math.max(min,value))
/** Phone game.resize camera in logical pixels (REF_W=1024, REF_H=768). */
export class WorldCamera {
  pose:CameraPose
  readonly minZoom:number
  readonly maxZoom:number
  private width:number
  private transition?:{from:CameraPose;to:CameraPose;at:number;duration:number}
  constructor(width=1400) {
    this.width=width
    const visibleWidth=768*16/9
    this.minZoom=width>visibleWidth?Math.min(width,2.25*768)/visibleWidth:1
    this.maxZoom=Math.min(width,2.25*768)/(768*14/9)+.7
    this.pose={x:512,y:384,zoom:this.minZoom}
  }
  clamp(pose:CameraPose):CameraPose {
    const zoom=clamp(this.minZoom,this.maxZoom,pose.zoom),halfWidth=(768*16/9)*this.minZoom/(2*zoom),halfHeight=768/(2*zoom)
    return {x:clamp(-512/3+halfWidth,1024+512/3-halfWidth,pose.x),y:clamp(halfHeight,768-halfHeight,pose.y),zoom}
  }
  request(request:CameraRequest,gameScale=1) {
    this.advance(request.at)
    const to=this.clamp({x:request.pos.x+(request.screenOffsetX??0)/gameScale,y:request.pos.y,zoom:request.zoom})
    this.transition={from:{...this.pose},to,at:request.at,duration:request.duration}
    this.advance(request.at)
  }
  advance(time:number) {
    const tween=this.transition
    if(!tween)return
    const t=tween.duration===0?1:clamp(0,1,(time-tween.at)/tween.duration)
    const eased=t<.5?2*t*t:-1+(4-2*t)*t
    this.pose=this.clamp({x:tween.from.x+(tween.to.x-tween.from.x)*eased,y:tween.from.y+(tween.to.y-tween.from.y)*eased,zoom:tween.from.zoom+(tween.to.zoom-tween.from.zoom)*eased})
    if(t===1)this.transition=undefined
  }
  get bounds(){const {x,y,zoom}=this.pose;return {left:x-this.width/(2*zoom),right:x+this.width/(2*zoom),top:y+384/zoom,bottom:y-384/zoom}}
}
