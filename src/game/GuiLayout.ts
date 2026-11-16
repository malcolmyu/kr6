import type {Point} from './types'
export interface SafeFrame {l:number;r:number;t:number;b:number;lt:number;rt:number;lb:number;rb:number;tl:number;tr:number;bl:number;br:number}
export interface GuiLayout {sw:number;sh:number;scale:number;origin:Point;safe:SafeFrame}
/** screen_utils.clamp_window_aspect and its fallback browser safe frame.
 * Native notch overrides do not apply to the browser's unnotched game viewport.
 */
export function guiLayout(w:number,h:number,mobile=false):GuiLayout {
  const refHeight=768,minAspect=mobile?1.5:4/3,maxAspect=mobile?2.25:16/9,origin={x:0,y:0}
  let sw:number,sh:number,scale:number
  if(w/h<minAspect){sw=refHeight*minAspect;sh=refHeight;scale=w/sw;origin.y=(h-sh*scale)/2}
  else {sw=refHeight*w/h;sh=refHeight;scale=h/refHeight;if(sw/sh>maxAspect){sw=sh*maxAspect;origin.x=(w-sw*scale)/2}}
  const base=w/h>=2.053125?{l:14,r:14,t:6,b:10}:{l:4,r:4,t:6,b:6}
  const safe:SafeFrame={...base,lt:base.l,rt:base.r,lb:base.l,rb:base.r,tl:base.t,tr:base.t,bl:base.b,br:base.b}
  if(mobile){const factor=refHeight/h;for(const key of ['l','r','lt','rt','lb','rb'] as const)safe[key]=Math.max(safe[key],20*factor);for(const key of ['t','tl','tr'] as const)safe[key]=Math.max(safe[key],28*factor);for(const key of ['b','bl','br'] as const)safe[key]=Math.max(safe[key],18*factor)}
  return {sw,sh,scale,origin,safe}
}
