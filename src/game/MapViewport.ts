import type {Point} from './types'
const clamp=(min:number,max:number,value:number)=>Math.min(max,Math.max(min,value))
/** Native desktop MapTouchView set_puppet/on_scroll/update_drag_limits. */
export class MapViewport {
 readonly minimum:number
 readonly maximum:number
 zoom:number
 pos:Point
 readonly width:number
 readonly height:number
 readonly mapSize:Point
 constructor(width:number,height:number,mapSize:Point={x:2486,y:1339.5},focus:Point={x:1243,y:669.75}){
  this.width=width;this.height=height;this.mapSize=mapSize
  this.minimum=Math.max(.2,Math.max(width/mapSize.x,height/mapSize.y));this.maximum=this.minimum+.2;this.zoom=this.minimum
  this.pos={x:width/2-focus.x*this.zoom,y:height/2-focus.y*this.zoom};this.constrain()
 }
 private constrain(){this.pos.x=clamp(this.width-this.mapSize.x*this.zoom,0,this.pos.x);this.pos.y=clamp(this.height-this.mapSize.y*this.zoom,0,this.pos.y)}
 pan(dx:number,dy:number){this.pos.x+=dx;this.pos.y+=dy;this.constrain()}
 scroll(direction:'wu'|'wd',point:Point){const previous=this.zoom,next=clamp(this.minimum,this.maximum,previous*(direction==='wu'?1.05:.95));this.pos={x:point.x*(1-next/previous)+this.pos.x*next/previous,y:point.y*(1-next/previous)+this.pos.y*next/previous};this.zoom=next;this.constrain()}
}
