import type {Point} from './types'
export interface ThrottleBuff {name:string;pos:Point;spriteAt:number;tweenAt:number;alpha:number;disabled:boolean;fading:boolean;queued:boolean}
/** Original C foreground has fade-on-remove; background removes immediately. */
export class CulverineThrottleRuntime {
 readonly models=new Set<ThrottleBuff>()
 onQueue:(model:ThrottleBuff)=>void=()=>{}
 onRemove:(model:ThrottleBuff)=>void=()=>{}
 queue(name:string,pos:Point,time:number){const m:ThrottleBuff={name,pos:{...pos},spriteAt:time,tweenAt:time,alpha:255,disabled:false,fading:false,queued:false};this.onQueue(m);return m}
 insert(m:ThrottleBuff){this.models.add(m);return true}
 tween(m:ThrottleBuff,time:number){
  if(m.queued||m.disabled)return
  const age=time-m.tweenAt,duration=20/30
  m.alpha=255*Math.max(0,Math.min(1,m.fading?(duration-age)/duration:age/duration))
  if(!m.fading&&age>=duration)m.disabled=true
  if(m.fading&&age>=duration){m.queued=true;this.onRemove(m)}
 }
 remove(m:ThrottleBuff,time:number){
  if(m.name==='fx_culverine_skill_c_buff_fg'&&m.disabled){m.fading=true;m.disabled=false;m.tweenAt=time;m.queued=false;return false}
  this.models.delete(m);return true
 }
}
