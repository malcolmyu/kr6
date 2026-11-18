import {recordEnemyDamage} from './EnemyDeath.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import {ellipseDistanceFactor} from './CatapultMotion.ts'
import {predictDamage} from './Damage.ts'
interface RayTemplate {ray_duration:number;image_width:number;bullet:{hit_payload:string;hit_decal?:string}}
interface AuraTemplate {aura:{radius:number;damage_min:number;damage_max:number;damage_type:number;vis_flags:number;vis_bans:number;reduce_armor?:number;explosive_factor?:number}}
export interface CulverineRay {id:number;name:string;queuedAt:number;born?:number;pos:Point;to:Point;source:string|undefined;target:EnemyInstance|undefined;factor:number;rotation:number;scale:Point;hidden:boolean;removed:boolean;removedAt?:number}
interface PendingBlast {at:number;pos:Point;name:string;factor:number}
/** Native ray_simple31061 and one-update area damage1443; neither is a ballistic projectile. */
export class CulverineRaySystem {
 readonly rays:CulverineRay[]=[]
 private blasts:PendingBlast[]=[]
 private nextId=2_000_000
 private templates:Record<string,RayTemplate&AuraTemplate>
 private onKill:(enemy:EnemyInstance)=>void
 targetValid:(enemy:EnemyInstance)=>boolean=()=>true
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number,type:number)=>void=()=>{}
 constructor(templates:Record<string,RayTemplate&AuraTemplate>,onKill:(enemy:EnemyInstance)=>void=()=>{}){this.templates=templates;this.onKill=onKill}
 launch(name:string,from:Point,to:Point,target:EnemyInstance|undefined,source:string|undefined,factor:number,time:number){
  const ray:CulverineRay={id:this.nextId++,name,queuedAt:time,pos:{...from},to:{...to},source,target,factor,rotation:Math.atan2(to.y-from.y,to.x-from.x),scale:{x:Math.hypot(to.x-from.x,to.y-from.y)/this.templates[name].image_width,y:1},hidden:true,removed:false}
  this.rays.push(ray);return ray
 }
 advance(time:number,enemies:EnemyInstance[],sourcePresent:(source:string)=>boolean){
  for(let i=this.blasts.length-1;i>=0;i--){const p=this.blasts[i];if(time<=p.at)continue
   const a=this.templates[p.name].aura
   for(const e of enemies){const dx=e.path.position.x-p.pos.x,dy=e.path.position.y-p.pos.y,k=.7*.7
    if(e.hp<=0||e.escapedAt!==undefined||e.template.vis.flags&a.vis_bans||e.template.vis.bans&a.vis_flags||!this.targetValid(e)||k*dx*dx+dy*dy>a.radius*a.radius*k)continue
    const raw=Math.ceil(Math.floor(a.damage_max-(a.damage_max-a.damage_min)*ellipseDistanceFactor(e.path.position,p.pos,a.radius))*p.factor)
    this.onDamage(e,raw,a.damage_type)
    if(e.template.health.ignore_damage)continue
    recordEnemyDamage(e,a.damage_type,time)
    e.hp-=predictDamage({...e.template.health,hp:e.hp},{value:raw,damage_type:a.damage_type,reduce_armor:a.reduce_armor,explosive_factor:a.explosive_factor})
    if(e.hp<=0){e.diedAt=time;this.onKill(e)}
   }
   this.blasts.splice(i,1)
  }
  for(let i=this.rays.length-1;i>=0;i--){const r=this.rays[i];if(r.removed){if(time>r.removedAt!)this.rays.splice(i,1);continue}
   const t=this.templates[r.name]
   if(r.born===undefined){if(time<=r.queuedAt)continue;r.born=time
    // ray_simple.hit uses the target's current feet for its payload and the fixed destination for its decal.
    this.blasts.push({at:time,pos:{...(r.target?.path.position??r.to)},name:t.bullet.hit_payload,factor:r.factor})
    if(t.bullet.hit_decal)this.onEffect(t.bullet.hit_decal,{...r.to},time)
   }else r.hidden=false
   if(r.source!==undefined&&!sourcePresent(r.source)||time-r.born>=Math.round(t.ray_duration*30)/30){r.removed=true;r.removedAt=time}
  }
 }
}
