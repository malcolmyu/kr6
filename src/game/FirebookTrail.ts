import {nativeSpriteOrder} from './NativePainterOrder.ts'
import copies from '../../public/data/wizard-copies-trail.json' with {type:'json'}
import rain from '../../public/data/rain-trail.json' with {type:'json'}
import native from '../../public/data/firebook-trail.json' with {type:'json'}
import wizard from '../../public/data/wizard-bolt-trail.json' with {type:'json'}
import catapult from '../../public/data/catapult-trail.json' with {type:'json'}
import zefira from '../../public/data/zefira-trail.json' with {type:'json'}
import {nativeAnimationFrame} from './NativeAnimation.ts'
import type {Point} from './types'
interface Source {id:number;pos:Point;rotation:number}
export interface FirebookParticle {id:number;at:number;lifetime:number;pos:Point;rotation:number;frame:string;alpha:number;scale:Point;drawOrder:number;scaleFactor?:number}
type TrailKind='copies'|'firebook'|'wizard'|'catapult'|'zefira'|'rain'
interface TrailConfig {system:{z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;emission_rate:number;ts_offset:number;particle_lifetime:number[];alphas:number[];scales_x?:number[];scales_y?:number[];scale_var?:number[];scale_same_aspect?:boolean;track_rotation?:boolean;emit_direction?:number;emit_area_spread?:Point;emit_rotation_spread?:number;animated?:boolean;animation_fps?:number;loop:boolean;name:string};animation?:{from:number;to:number;prefix:string}}
const configFor=(kind:TrailKind)=>(kind==='copies'?copies:kind==='rain'?rain:kind==='wizard'?wizard:kind==='catapult'?catapult:kind==='zefira'?zefira:native) as unknown as TrailConfig
/** Particle frame draw_order is independent of sprite indices (systems2473). */
export function nativeTrailParticleOrder(trail:FirebookTrail,particle:FirebookParticle,entity:number){
 const config=configFor(trail.kind).system,order=nativeSpriteOrder(config,particle.pos,entity)
 order[1].draw=config.draw_order!==undefined?100000*config.draw_order+entity:particle.drawOrder
 order[1].key=`${entity}:particle:${particle.at.toFixed(9)}`
 return order
}
const interpolate=(values:number[]|undefined,age:number,fallback:number)=>{if(!values?.length)return fallback;const at=age*(values.length-1),i=Math.floor(at),j=Math.ceil(at);return values[i]+(values[j]-values[i])*(at-i)}

export interface FirebookTrail {kind:TrailKind;id:number;sourceId:number;at:number;emitTs:number;lastPos?:Point;emit:boolean;sourceLifetime?:number;removeNext:boolean;particles:FirebookParticle[]}
/** Original systems.particle_system2473 for firebook and wizard-bolt configs.
 * This ports tracked position/rotation, strict emission clock, interpolation,
 * random lifetime, original60FPS frame lookup and queued source cleanup. */
export class FirebookTrailSystem {
 onRemove:(trail:FirebookTrail)=>void=()=>{}
 readonly trails:FirebookTrail[]=[]
 private pending:{sourceId:number;at:number;kind:TrailKind;emit:boolean}[]=[]
 private nextId=1
 private nextParticleId=1
 private random:()=>number
 constructor(random:()=>number){this.random=random}
 queue(source:Source,time:number,kind:TrailKind='firebook'){this.pending.push({sourceId:source.id,at:time,kind,emit:true})}
 endSource(sourceId:number){const t=this.trails.find(t=>t.sourceId===sourceId);if(t)t.sourceLifetime=0}
 stop(sourceId:number){const t=this.trails.find(t=>t.sourceId===sourceId)??this.pending.find(t=>t.sourceId===sourceId);if(!t?.emit)return;t.emit=false;return configFor(t.kind).system.particle_lifetime[1]}
 prepare(time:number){
  for(let i=this.trails.length-1;i>=0;i--)if(this.trails[i].removeNext)this.trails.splice(i,1)
  for(let i=0;i<this.pending.length;){const p=this.pending[i];if(time<=p.at){i++;continue}this.pending.splice(i,1);const c=configFor(p.kind).system,rate=c.emission_rate;this.trails.push({kind:p.kind,id:this.nextId++,sourceId:p.sourceId,at:time,emitTs:time-1/rate+c.ts_offset,emit:p.emit,removeNext:false,particles:[]})}
 }
 advance(time:number,sources:Source[]){this.prepare(time);for(const t of this.trails)this.advanceOne(t,time,sources)}
 advanceOne(t:FirebookTrail,time:number,sources:Source[]){
   const config=configFor(t.kind),c=config.system,rate=c.emission_rate
   const source=sources.find(s=>s.id===t.sourceId)
   if(!source){t.emit=false;t.sourceLifetime=0}
   else if(!t.lastPos)t.lastPos={...source.pos}
   if(!t.emit){t.emitTs=time+c.ts_offset;if(source)t.lastPos={...source.pos}}
   if(t.emit&&source&&time-t.emitTs>1/rate){
    const count=(time-t.emitTs)*rate,n=Math.floor(count),dx=(source.pos.x-t.lastPos!.x)/count,dy=(source.pos.y-t.lastPos!.y)/count
    for(let i=1;i<=n;i++){
     const at=t.emitTs+i/rate,lifetime=c.particle_lifetime[0]+this.random()*(c.particle_lifetime[1]-c.particle_lifetime[0])
     const area=c.emit_area_spread,ax=area?-area.x/2+this.random()*area.x:0,ay=area?-area.y/2+this.random()*area.y:0
     const spread=c.emit_rotation_spread??0,rotation=c.track_rotation?source.rotation:(t.kind==='zefira'?source.rotation:c.emit_direction??0)-spread+this.random()*2*spread
     const scaleFactor=c.scale_var?c.scale_var[0]+this.random()*(c.scale_var[1]-c.scale_var[0]):1
     t.particles.push({id:this.nextParticleId++,at,lifetime,pos:{x:t.lastPos!.x+dx*i+ax,y:t.lastPos!.y+dy*i+ay},rotation,frame:'',alpha:c.alphas[0],scaleFactor,scale:{x:1,y:1},drawOrder:Math.floor(at*100)})
    }
    t.emitTs+=n/rate;t.lastPos!.x+=dx*n;t.lastPos!.y+=dy*n
   }
   for(let i=t.particles.length-1;i>=0;i--){const p=t.particles[i],age=time-p.at
    if(age/p.lifetime>=1){t.particles.splice(i,1);continue}
    const progress=age/p.lifetime,factor=p.scaleFactor??1
    p.alpha=interpolate(c.alphas,progress,255);p.scale={x:interpolate(c.scales_x,progress,1)*factor,y:interpolate(c.scales_y,progress,1)*factor}
    if(c.animated){const a=config.animation!,frame=nativeAnimationFrame(a.to-a.from+1,age*(c.animation_fps??30)/30,c.loop,30).frame;p.frame=`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`}
    else p.frame=c.name
   }
   if(t.sourceLifetime!==undefined&&time-t.at>t.sourceLifetime){t.emit=false;if(!t.particles.length){t.removeNext=true;this.onRemove(t)}}
 }
}
