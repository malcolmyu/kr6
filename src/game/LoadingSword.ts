import type {Point} from './types'
export interface SwordSizes {off:Point;on:Point;shine:Point;mask:Point}
export function loadingSwordPose(sizes:SwordSizes,progress:number,scale:number,revealed:boolean,cx:number,cy:number,debug=false){
 const p=revealed?Math.max(0,Math.min(1,debug?1:progress)):0,fill=p*.75,w=sizes.on.x,h=sizes.on.y,top=cy-h*scale/2,clipY=top+(1-fill)*h*scale+6
 const base=(size:Point,pos:Point,anchor:Point,s=scale)=>({size:{...size},pos,anchor,scale:{x:s,y:s},alpha:1,hidden:!revealed})
 return {revealed,
  off:base(sizes.off,{x:cx,y:cy},{x:sizes.off.x/2,y:sizes.off.y/2}),
  clip:base({x:w,y:fill*h},{x:cx-w*scale/2,y:clipY},{x:0,y:0}),
  on:{...base(sizes.on,{x:0,y:-(1-fill)*h},{x:0,y:0},1),hidden:false},
  shine:{...base(sizes.shine,{x:cx,y:clipY},{x:sizes.shine.x/2,y:sizes.shine.y/2}),alpha:Math.max(0,Math.min(1,p/.1))},
  mask:base(sizes.mask,{x:cx,y:cy},{x:sizes.off.x/2,y:sizes.off.y/2})}
}
