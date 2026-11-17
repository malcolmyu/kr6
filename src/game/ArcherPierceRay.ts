import {bulletDamageValue} from './BulletDamage.ts'
import type {ArcherPierceShot} from './ArcherPierceCaster'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Template {ray_duration:number;image_width:number;bullet:{damage_type:number;mod:string;level:number;hit_fx:string}}
export interface ArcherPierceRay {id:number;name:string;damageOrder?:number;shot:ArcherPierceShot;born?:number;pos:Point;rotation:number;scale:Point;hidden:boolean;removed:boolean;target?:EnemyInstance}
/** Shipped ray_simple31061 with the Archer A template: immediate first-main
 * damage/mod/FX, fixed endpoint, then a hidden-first-frame23/30s ray. */
export class ArcherPierceRaySystem {
 private nextId=4_000_000
 readonly rays:ArcherPierceRay[]=[]
 onCreateDamage:()=>number|void=()=>{}
 onDamage:(ray:ArcherPierceRay,enemy:EnemyInstance,value:number,type:number)=>void=()=>{}
 onModifier:(name:string,enemy:EnemyInstance,level:number,time:number)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onQueue:(ray:ArcherPierceRay)=>void=()=>{}
 onRemove:(ray:ArcherPierceRay)=>void=()=>{}
 private templates:Record<string,Template>
 private random:()=>number
 constructor(templates:Record<string,Template>,random:()=>number){this.templates=templates;this.random=random}
 queue(shot:ArcherPierceShot){const ray:ArcherPierceRay={id:this.nextId++,name:shot.name,shot,pos:{...shot.from},rotation:0,scale:{x:1,y:1},hidden:false,removed:false};this.onQueue(ray);return ray}
 insert(ray:ArcherPierceRay){this.rays.push(ray);return true}
 advance(ray:ArcherPierceRay,time:number,enemies:EnemyInstance[]){
  if(ray.removed)return
  const t=this.templates[ray.shot.name]
  if(ray.born===undefined){
   const shot=ray.shot;ray.born=time;ray.target=enemies.find(e=>e===shot.target)
   ray.rotation=Math.atan2(shot.to.y-ray.pos.y,shot.to.x-ray.pos.x);ray.scale={x:Math.hypot(shot.to.x-ray.pos.x,shot.to.y-ray.pos.y)/t.image_width,y:1};ray.hidden=true
   if(ray.target){
    const order=this.onCreateDamage();ray.damageOrder=typeof order==='number'?order:undefined;const damage=bulletDamageValue(shot.min,shot.max,shot.factor,this.random)
    this.onDamage(ray,ray.target,damage,t.bullet.damage_type)
    this.onModifier(t.bullet.mod,ray.target,t.bullet.level,time)
   }
   const enemy=ray.target,offset=enemy?.template.unit.hit_offset
   this.onEffect(t.bullet.hit_fx,enemy?{x:enemy.path.position.x+offset!.x,y:enemy.path.position.y+offset!.y}:{x:0,y:0},time)
  }else ray.hidden=false
  if(time-ray.born>=t.ray_duration){ray.removed=true;this.onRemove(ray)}
 }
 remove(ray:ArcherPierceRay){const index=this.rays.indexOf(ray);if(index>=0)this.rays.splice(index,1);return true}
}
