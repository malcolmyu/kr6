import {enemyIsDead} from './EnemyDeath.ts'
import sceneDefaults from '../../public/data/scene-entities.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {ellipseDistanceFactor} from './CatapultMotion.ts'
import type {Point} from './types'
import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
interface Template {image_width:number;ray_duration:number;bullet:{hit_payload:string;hit_decal?:string;level:number};aura:{radius:number;damage_min:number;damage_max:number;damage_type:number;vis_flags:number;vis_bans:number;reduce_armor?:number;explosive_factor?:number;ignore_dist_factor?:boolean;chance_ignore_dist_factor?:number}}
export interface NativeCulverineRay {kind:'ray';id:number;name:string;pos:Point;to:Point;target?:EnemyInstance;sourceId?:number;factor:number;level:number;queuedAt:number;born?:number;rotation:number;scale:Point;hidden:boolean;removed:boolean}
export interface NativeCulverineAura {kind:'aura';name:string;pos:Point;sourceId?:number;factor:number;level:number;queued:boolean}
export interface NativeCulverineDecal {kind:'decal';name:string;pos:Point;born?:number;alpha:number;fading:boolean;tweenAt:number;queued:boolean}
export type NativeCulverineModel=NativeCulverineDecal|NativeCulverineRay|NativeCulverineAura
/** ray_simple and its one-main damage payload, in the actual registry/main/health phases. */
export class CulverineNativeRuntime {
 readonly rays:NativeCulverineRay[]=[]
 readonly decals=new Set<NativeCulverineDecal>()
 readonly auras=new Set<NativeCulverineAura>()
 private nextId=5_000_000
 id:(model:object)=>number|undefined=()=>undefined
 present:(model:object)=>boolean=()=>true
 candidates:(at:Point,radius:number)=>EnemyInstance[]=()=>[]
 valid:(enemy:EnemyInstance)=>boolean=()=>true
 onQueue:(model:NativeCulverineModel)=>void=()=>{}
 onRemove:(model:NativeCulverineModel)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number,type:number,reduceArmor?:number,explosiveFactor?:number)=>void=()=>{}
 private templates:Record<string,Template>
 private random:()=>number
 constructor(templates:Record<string,Template>,random:()=>number){this.templates=templates;this.random=random}
 queue(name:string,from:Point,to:Point,target:EnemyInstance,site:TowerSite,factor:number,time:number){
  const r:NativeCulverineRay={kind:'ray',id:this.nextId++,name,pos:{...from},to:{...to},target,sourceId:this.id(site),factor,level:this.templates[name].bullet.level,queuedAt:time,rotation:0,scale:{x:1,y:1},hidden:false,removed:false}
  this.onQueue(r);return r
 }
 insert(m:NativeCulverineModel){if(m.kind==='ray')this.rays.push(m);else if(m.kind==='decal')this.decals.add(m);else this.auras.add(m);return true}
 advance(m:NativeCulverineModel,time:number){
  const t=this.templates[m.name]
  if(m.kind==='ray'){
   if(m.removed)return
   if(m.born===undefined){
    m.born=time
    if(m.target&&!this.present(m.target))m.target=undefined
    m.rotation=Math.atan2(m.to.y-m.pos.y,m.to.x-m.pos.x)
    m.scale={x:Math.hypot(m.to.x-m.pos.x,m.to.y-m.pos.y)/t.image_width,y:1};m.hidden=true
    this.onQueue({kind:'aura',name:t.bullet.hit_payload,pos:{...(m.target?.path.position??m.to)},sourceId:this.id(m),factor:m.factor,level:m.level,queued:false})
    if(t.bullet.hit_decal)this.onQueue({kind:'decal',name:t.bullet.hit_decal,pos:{...m.to},alpha:255,fading:false,tweenAt:0,queued:false})
   }else m.hidden=false
   if(time-m.born>=t.ray_duration){m.removed=true;this.onRemove(m)}
  }else if(m.kind==='decal'){
   if(m.queued||m.fading)return
   m.born??=time
   const frames=(sceneDefaults as unknown as Record<string,{timed:{frames:number}}>)[m.name].timed.frames
   if(nativeLogicAnimationFrame(frames,time,m.born,false,30).runs>0){m.queued=true;this.onRemove(m)}
  }else{
   if(m.queued)return
   const a=t.aura,enemies=this.candidates(m.pos,a.radius).filter(e=>!enemyIsDead(e)&&this.valid(e)&&!(e.template.vis.flags&a.vis_bans)&&!(e.template.vis.bans&a.vis_flags)&&(e.path.position.x-m.pos.x)**2*.7*.7+(e.path.position.y-m.pos.y)**2<=a.radius*a.radius*.7*.7)
   const ignore=enemies.length>0&&(a.ignore_dist_factor||a.chance_ignore_dist_factor!==undefined&&this.random()<=a.chance_ignore_dist_factor)
   for(const e of enemies){const raw=ignore?a.damage_max:Math.floor(a.damage_max-(a.damage_max-a.damage_min)*ellipseDistanceFactor(e.path.position,m.pos,a.radius));this.onDamage(e,Math.ceil(raw*m.factor),a.damage_type,a.reduce_armor,a.explosive_factor)}
   m.queued=true;this.onRemove(m)
  }
 }
 tween(m:NativeCulverineModel,time:number){
  if(m.kind!=='decal'||!m.fading||m.queued)return
  const age=time-m.tweenAt;m.alpha=255*Math.max(0,Math.min(1,(2-age)/2))
  if(age>=2){m.queued=true;this.onRemove(m)}
 }
 remove(m:NativeCulverineModel,time:number){
  if(m.kind==='decal'){if(!m.fading){m.fading=true;m.queued=false;m.tweenAt=time;return false}this.decals.delete(m);return true}
if(m.kind==='ray'){const index=this.rays.indexOf(m);if(index>=0)this.rays.splice(index,1)}else this.auras.delete(m);return true}
}
