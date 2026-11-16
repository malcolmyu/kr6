import nativeTweens from '../../public/data/static-effects-tweens.json' with {type:'json'}
import type {Point} from './types'
type Value=number|boolean|Point
interface Prop {name:string;keys:[number,Value,string?][];sprite_id:number|number[];disabled?:boolean;loop?:boolean;ts?:number;time_offset?:number;interp?:string;multiply?:boolean}
interface Sprite {z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;pos?:Point;name:string;anchor:Point;offset:Point;scale?:Point;alpha?:number;r?:number;flip_x?:boolean;hidden_count?:number;animated?:boolean;exo?:boolean;[key:string]:unknown}
interface Template {main_script?:unknown;modifier?:unknown;particle_system?:unknown;tween?:{remove?:boolean;disabled?:boolean;reverse?:boolean;ts?:number;random_ts?:number;props:Prop[]};render?:{sprites:Sprite[]}}
export interface StaticEffect {name:string;at:number;pos:Point;sprites:Sprite[];removalQueuedAt?:number}
const functions:Record<string,(t:number)=>number>={linear:t=>t,step:()=>0,quad:t=>t*t,quad_out:t=>1-(1-t)*(1-t),sine:t=>.5*(1-Math.cos(t*Math.PI))}
function lerp(a:Value,b:Value,t:number,fn:string):Value {
 if(typeof a==='boolean')return a
 if(typeof a==='object'){const end=b as Point;return{x:lerp(a.x,end.x,t,fn)as number,y:lerp(a.y,end.y,t,fn)as number}}
 return a+((b as number)-a)*functions[fn](t)
}
/** Original tween9 for finite atlas/EXO decals. Controller-driven
 * effects retain their own source-specific controllers. */
export class StaticEffects {
 readonly models:StaticEffect[]=[]
 onCreate:(model:StaticEffect)=>void=()=>{}
 onRemove:(model:StaticEffect)=>void=()=>{}
 onRegisterTween:(model:StaticEffect,update:(time:number)=>void)=>void=()=>{}
 private templates:Record<string,Template>
 constructor(templates:Record<string,Template>){this.templates=Object.fromEntries(Object.entries(templates).map(([name,t])=>[name,{...t,tween:(nativeTweens as unknown as Record<string,Template['tween']>)[name]??t.tween}]))}
 accepts(name:string){
  const t=this.templates[name],w=t?.tween
  return !!w?.remove&&!w.disabled&&!w.reverse&&w.ts===undefined&&w.random_ts===undefined&&!t.main_script&&!t.modifier&&!t.particle_system&&!name.startsWith('pop_')&&!!t.render?.sprites.length&&t.render.sprites.every(s=>s.animated===false||s.exo===true)&&w.props.every(p=>['alpha','scale','r','hidden_count','hidden','flip_x','offset','anchor'].includes(p.name)&&!p.loop&&!p.multiply&&p.ts===undefined&&!!functions[p.interp??'linear']&&p.keys.length>0&&p.keys.every(k=>typeof k[0]==='number'&&Number.isFinite(k[0])&&(typeof k[1]==='number'||typeof k[1]==='boolean'||typeof k[1]==='object'&&k[1]!==null&&typeof k[1].x==='number'&&typeof k[1].y==='number')&&!!functions[k[2]??p.interp??'linear']))
 }
 queue(name:string,pos:Point,time:number,transform?:{rotation?:number;flipX?:boolean}):StaticEffect|undefined {
  if(!this.accepts(name))return
  const model:StaticEffect={name,at:time,pos:{...pos},sprites:structuredClone(this.templates[name].render!.sprites)}
  for(const s of model.sprites){s.ts=time;s.alpha??=255;s.scale??={x:1,y:1};s.r=transform?.rotation??s.r??0;if(transform?.flipX)s.flip_x=!s.flip_x}
  this.models.push(model);this.onCreate(model);this.onRegisterTween(model,t=>this.advanceOne(model,t));return model
 }
 beginTick(time:number){for(let i=this.models.length-1;i>=0;i--){const m=this.models[i];if(m.removalQueuedAt!==undefined&&time>m.removalQueuedAt)this.models.splice(i,1)}}
 advanceOne(model:StaticEffect,time:number){
  if(time<=model.at||model.removalQueuedAt!==undefined)return
  let finished=true
  for(const p of this.templates[model.name].tween!.props){
   if(p.disabled)continue
   const keys=p.keys,elapsed=Math.max(keys[0][0],Math.min(keys.at(-1)![0],time-model.at+(p.time_offset??0)))
   let a=0,b=keys.length-1
   for(let i=0;i<keys.length;i++){if(keys[i][0]<=elapsed)a=i;if(elapsed<=keys[i][0]){b=i;break}}
   const value=a===b?structuredClone(keys[a][1]):lerp(keys[a][1],keys[b][1],(elapsed-keys[a][0])/(keys[b][0]-keys[a][0]),keys[a][2]??p.interp??'linear')
   for(const sid of Array.isArray(p.sprite_id)?p.sprite_id:[p.sprite_id])model.sprites[sid-1][p.name]=structuredClone(value)
   finished=finished&&a===keys.length-1
  }
  if(finished){model.removalQueuedAt=time;this.onRemove(model)}
 }
 advance(time:number){for(const m of this.models)this.advanceOne(m,time)}
}
