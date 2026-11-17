import animations from '../../public/data/enemies-animations.json' with {type:'json'}
import frames from '../../public/data/enemy-melee-frames.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'

export interface BloodDecal {z?:number;sort_y_offset?:number;pos:Point;at:number;color:string;alpha:number;removalQueuedAt?:number}
export interface DeathEffect {name:string;pos:Point;at:number;sprite:string;offsetY?:number;presented?:boolean;alpha:number;removalQueuedAt?:number}
interface State {waiting?:boolean;started?:number;finished?:number;fadeAt?:number;delay?:number;duration?:number}
/** A yielding smoke cast can restore corpse HP without clearing health.dead. */
export function enemyIsDead(e:EnemyInstance){return e.hp<=0||e.diedAt!==undefined}
export function recordEnemyDamage(e:EnemyInstance,type:number,time:number){
 if(e.damageTypesAt!==time){e.damageTypesAt=time;e.lastDamageTypes=0}
 e.lastDamageTypes=(e.lastDamageTypes??0)|type
}
/** Original SU.y_enemy_death for the four basic ground enemy families.
 * Death spawns and cliff falling have separate original controllers. */
export class EnemyDeathSystem {
 readonly blood:BloodDecal[]=[]
 readonly effects:DeathEffect[]=[]
 readonly effectModels=new Set<DeathEffect>()
 isEffectPresent?:(effect:DeathEffect)=>boolean
 readonly states=new WeakMap<EnemyInstance,State>()
 readonly tweens=new Map<object,(time:number)=>void>()
 onRegisterTween:(model:object,update:(time:number)=>void)=>void=()=>{}
 onBlood:(blood:BloodDecal)=>void=()=>{}
 onEffect:(effect:DeathEffect)=>void=()=>{}
 onPresentEffect:(effect:DeathEffect)=>void=()=>{}
 onRemove:(model:object)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 cellAt:(pos:Point)=>number=()=>1
 private templates:Record<string,{tween?:{props:{name:string;keys:number[][]}[]};render?:{sprites:{name:string;size_names?:string[]}[]}}>
 constructor(templates:EnemyDeathSystem['templates']){this.templates=templates}
 supports(e:EnemyInstance){return (!!(frames as Record<string,unknown>)[e.template.render.sprites[0].prefix]||e.name==='enemy_crow')&&!e.template.death_spawns&&(e.name==='enemy_crow'||!(this.cellAt(e.path.position)&4))}
 private register(model:object,update:(time:number)=>void){this.tweens.set(model,update);this.onRegisterTween(model,update)}
 beginTick(time:number,enemies:EnemyInstance[]){
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(e.deathRemovalQueuedAt!==undefined&&time>e.deathRemovalQueuedAt){enemies.splice(i,1);this.tweens.delete(e)}}
  for(let i=this.blood.length-1;i>=0;i--){const b=this.blood[i];if(b.removalQueuedAt!==undefined&&time>b.removalQueuedAt){this.blood.splice(i,1);this.tweens.delete(b)}}
  for(const fx of this.effectModels)if(fx.removalQueuedAt!==undefined&&time>fx.removalQueuedAt||time>fx.at&&this.isEffectPresent&&!this.isEffectPresent(fx)){this.effectModels.delete(fx);this.tweens.delete(fx)}
  for(let i=0;i<this.effects.length;){const fx=this.effects[i];if(time<=fx.at){i++;continue}this.effects.splice(i,1);fx.presented=true;this.onPresentEffect(fx)}
 }
 advanceTweens(time:number){for(const update of this.tweens.values())update(time)}
 private effect(e:EnemyInstance,name:string,time:number,offsetY?:number){
  const p=this.templates[name]?.render?.sprites[0],fx:DeathEffect={name,pos:{...e.path.position},at:time,sprite:p?.size_names?.[(e.template.unit.size??1)-1]??p?.name??'',offsetY,alpha:255}
  this.effects.push(fx);this.effectModels.add(fx);this.onEffect(fx)
  const keys=this.templates[name]?.tween?.props.find(p=>p.name==='alpha')?.keys
  if(keys){const start=keys[0][0],end=keys.at(-1)![0];this.register(fx,t=>{const age=t-fx.at;fx.alpha=255*Math.max(0,Math.min(1,1-(age-start)/(end-start)));if(age>=end&&fx.removalQueuedAt===undefined){fx.removalQueuedAt=t;this.onRemove(fx)}})}
 }
 private bloodPool(e:EnemyInstance,time:number,terrain:number){
  const unit=e.template.unit;if(!unit.show_blood_pool||!unit.blood_color||(terrain&2))return
  const b:BloodDecal={z:e.template.render.sprites[0].z??3000,sort_y_offset:1,pos:{...e.path.position},at:time,color:unit.blood_color,alpha:255};this.blood.push(b);this.onBlood(b)
  this.register(b,t=>{b.alpha=255*Math.max(0,Math.min(1,1-(t-b.at-1)/4));if(t-b.at>=5&&b.removalQueuedAt===undefined){b.removalQueuedAt=t;this.onRemove(b)}})
 }
 /** resumeMelee returns false when the original outer loop still yields. */
 advanceMain(e:EnemyInstance,time:number,resumeMelee:()=>boolean=()=>true){
  if(!this.supports(e)||e.hp>0)return
  e.deathManaged=true;e.diedAt??=time
  if(e.name==='enemy_crow'){const a=animations.crowcaller_crow_in;if(nativeLogicAnimationFrame(a.to-a.from+1,time,e.born,false,30).runs===0){e.visualOverride={name:'in',at:e.born,loop:false,facingLeft:false};return}}
  let s=this.states.get(e);if(!s){s={};this.states.set(e,s)}
  if(s.started===undefined){
   if(!resumeMelee())return
   s.started=time;e.deathStartedAt=time;e.motionSpeed={x:0,y:0};e.meleeAttack=undefined;e.meleeHolding=false
   const unit=e.template.unit,terrain=this.cellAt(e.path.position),water=!!(terrain&2)&&!(e.template.vis.flags&128),type=e.lastDamageTypes??2
   const explode=!!(type&(8|1024|2147483648))&&!(type&(1073741824|2048))&&unit.can_explode&&unit.explode_fx&&!(terrain&2)
   if(explode){const sound=e.template.sound_events?.death_by_explosion;if(sound)this.onSound(sound);this.effect(e,unit.explode_fx!,time);this.bloodPool(e,time,terrain);e.deathHidden=true}
   else if((type&2048)&&unit.can_disintegrate&&unit.disintegrate_fx){this.effect(e,unit.disintegrate_fx,time,(e.template.vis.flags&128)?unit.hit_offset.y:undefined);e.deathHidden=true}
   else if(type&4096)e.deathHidden=true
   else{
    const sound=e.template.sound_events?.[water?'death_water':'death'];if(sound)this.onSound(sound)
    this.bloodPool(e,time,terrain)
    e.visualOverride={name:unit.death_animation??'death',at:time,loop:false,facingLeft:water?e.visualOverride?.facingLeft??false:Math.cos(e.headingAngle??Math.atan2(e.path.direction.y,e.path.direction.x))<0}
   }
  }
  if(s.finished!==undefined)return
  const prefix=e.template.render.sprites[0].prefix,name=e.template.unit.death_animation??'death',animation=(animations as Record<string,{from:number;to:number}>)[`${prefix}_${name}`],count=(frames as unknown as Record<string,Record<string,number>>)[prefix]?.[name]??(animation?animation.to-animation.from+1:undefined)
  if(!e.deathHidden&&count&&nativeLogicAnimationFrame(count,time,s.started,false,30).runs===0)return
  s.finished=time;e.deathFinishedAt=time;if(e.template.unit.hide_after_death)e.deathHidden=true
  const unit=e.template.unit
  if(unit.fade_time_after_death!==undefined){
   s.fadeAt=time;s.delay=unit.fade_time_after_death;s.duration=unit.fade_duration_after_death??2
   this.register(e,t=>{const elapsed=t-s!.fadeAt!;e.corpseAlpha=255*Math.max(0,Math.min(1,1-(elapsed-s!.delay!)/s!.duration!));if(elapsed>=s!.delay!+s!.duration!&&e.deathRemovalQueuedAt===undefined){e.deathRemovalQueuedAt=t;this.onRemove(e)}})
  }
 }
}
