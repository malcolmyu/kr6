import type {Point} from './types'
export function sliderPose(value:number,range:[number,number],bar:{pos:Point;size:Point}){
 const clean=Math.max(range[0],Math.min(range[1],value)),phase=(clean-range[0])/(range[1]-range[0])
 return {value:clean,phase,knobX:bar.pos.x+bar.size.x*phase}
}
export function sliderPointer(x:number,range:[number,number],start:number,width:number){const phase=Math.max(0,Math.min(1,(x-start)/width));return range[0]+(range[1]-range[0])*phase}
