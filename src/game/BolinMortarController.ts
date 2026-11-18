import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import data from '../../public/data/bolin-mortar.json' with {type:'json'}
import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {EnemyPath} from './EnemyPath'
import type {LevelData,Point} from './types'
export interface MortarAttack {disabled:boolean;ts:number;cooldown:number;shoot_time:number;animation:string;min_range:number;max_range:number;min_targets:number;bullet_count:number;mortar_gap:number;bullet:string;bullet_start_offset:Point;damage_min:number;damage_max:number;sound:string;sound_hit:string;vis_flags:number;vis_bans:number}
interface Cast {at:number;phase:'windup'|'tail';points:Point[];flight:number}
export class BolinMortarController {
 readonly casts=new WeakMap<HeroUnit,Cast>()
 readonly timestamps=new WeakMap<HeroUnit,number>()
 level?:LevelData
 select:(h:HeroUnit,a:MortarAttack,prediction:number)=>EnemyInstance[]=()=>[]
 predict:(e:EnemyInstance,time:number)=>Point=e=>e.path.position
 landingValid:(pi:number,ni:number,pos:Point)=>boolean=()=>true
 onFire:(h:HeroUnit,a:MortarAttack,points:Point[],flight:number,time:number)=>void=()=>{}
 fixedHeight=data.height
 gravity=data.gravity
 attack(h:HeroUnit){return (h.template as unknown as {timed_attacks:{list:MortarAttack[]}}).timed_attacks.list[0]}
 active(h:HeroUnit){return this.casts.has(h)}
 private release(h:HeroUnit,c:Cast){h.idleVisual={name:'mortarskill',at:c.at,loop:false};h.visualOverride=undefined;h.rangedUntil=undefined;this.casts.delete(h)}
 advance(h:HeroUnit,time:number){
  const a=this.attack(h),c=this.casts.get(h);this.timestamps.set(h,this.timestamps.get(h)??a.ts)
  if(c){
   if(c.phase==='windup'){
    if(time-c.at<a.shoot_time){if(h.hp<=0||h.template.unit?.is_stunned||h.deploying){this.timestamps.set(h,time-a.cooldown+10/30-1e-6);this.release(h,c)}return true}
    this.onFire(h,a,c.points,c.flight,time);this.timestamps.set(h,time);c.phase='tail'
   }
   if(nativeLogicAnimationFrame(Math.round(h.template.webAnimationDurations[a.animation]*30),time,c.at,false,30).runs>0||h.hp<=0||h.template.unit?.is_stunned||h.deploying)this.release(h,c)
   return true
  }
  if(a.disabled||h.hp<=0||h.scriptLocked||h.deploying||h.moving||h.attack||h.template.unit?.is_stunned||time-(this.timestamps.get(h)??0)<=a.cooldown)return false
  const flight=-Math.sqrt(2*this.fixedHeight*this.gravity*-1)/this.gravity*2,targets=this.select(h,a,flight)
  if(targets.length<a.min_targets){this.timestamps.set(h,time-a.cooldown+10/30-1e-6);return false}
  const e=targets[0],pi=(e.path as EnemyPath).pi,level=this.level!,lane=level.paths.paths[pi-1][0],pred=this.predict(e,flight+a.shoot_time)
  let ni=0,best=Infinity;for(const [i,p]of lane.entries()){const d=(p.x-pred.x)**2+(p.y-pred.y)**2;if(d<best){best=d;ni=i+1}}
  if(ni-a.mortar_gap*2<0)ni=a.mortar_gap*2+1
  const points:Point[]=[],valid=level.navigation?.noBackwardsNodes?.[pi-1]
  for(let i=0;i<a.bullet_count;i++){
   ni=Math.max(1,Math.min(lane.length,ni))
   const direction=i===0?-1:1;while(ni>=1&&ni<=lane.length&&valid?.[ni-1]===false)ni+=direction
   if(ni<1||ni>lane.length)break
   if(this.landingValid(pi,ni,lane[ni-1]))points.push({...lane[ni-1]});ni-=a.mortar_gap
  }
  if(!points.length){this.timestamps.set(h,time-a.cooldown+10/30-1e-6);return false}
  h.facingLeft=e.path.position.x<h.pos.x;h.visualOverride={name:a.animation,at:time,loop:false};h.rangedUntil=time+h.template.webAnimationDurations[a.animation];h.idleRequestedAt=undefined
  this.casts.set(h,{at:time,phase:'windup',points,flight});return true
 }
}
