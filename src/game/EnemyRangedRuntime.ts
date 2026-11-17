import {soldierIsDead} from './SoldierHealth.ts'
import data from '../../public/data/enemy-ranged-runtime.json' with {type:'json'}
import {luaSort} from './LuaSort.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {EnemyArrowMotion} from './EnemyArrowMotion.ts'
import {bulletDamageValue} from './BulletDamage.ts'
import type {EnemyRangedCombat,EnemyRangedState,EnemyArrow,EnemyRangedAttack} from './EnemyRangedCombat'
import type {EnemyInstance} from './GameSession'
import type {SoldierInstance} from './BarracksCombat'
import type {Point} from './types'
interface State extends EnemyRangedState {phase:'walk'|'range'|'attack'|'exit';lastAt:number;spriteAt:number}
export interface NativeEnemyArrow extends EnemyArrow {from:Point;queuedAt:number;inserted:boolean;doneAt?:number;source:EnemyInstance;damageFactor:number}
export interface EnemyArrowEffect {kind:'fx'|'miss';name:string;pos:Point;at:number;rotation:number;alpha:number;queued?:boolean;bloodColor?:string}
export class EnemyRangedRuntime {
 readonly states=new WeakMap<EnemyInstance,State>()
 readonly misses:EnemyArrowEffect[]=[]
 candidates:(enemy:EnemyInstance,radius:number)=>SoldierInstance[]=()=>[]
 present:(target:SoldierInstance)=>boolean=()=>true
 nodeValid:(enemy:EnemyInstance)=>boolean=()=>true
 blocked:(enemy:EnemyInstance)=>boolean=()=>false
 canEnter:(enemy:EnemyInstance)=>boolean=()=>true
 cellAt:(pos:Point)=>number=()=>1
 onQueueArrow:(arrow:NativeEnemyArrow)=>void=()=>{}
 onRemoveArrow:(arrow:NativeEnemyArrow)=>void=()=>{}
 onQueueEffect:(effect:EnemyArrowEffect)=>void=()=>{}
 onRemoveEffect:(effect:EnemyArrowEffect)=>void=()=>{}
 onCreateDamage:()=>number|void=()=>{}
 onDamage:(arrow:NativeEnemyArrow,value:number,popOrder?:number)=>void=()=>{}
 onEffect:(effect:EnemyArrowEffect)=>void=()=>{}
 onSprite:(enemy:EnemyInstance,sprite:{name:string;at:number;loop:boolean;facingLeft:boolean})=>void=(e,s)=>{e.visualOverride=s}
 private owner:EnemyRangedCombat
 private random:()=>number
 private nextId=-2000000
 constructor(owner:EnemyRangedCombat,random:()=>number){this.owner=owner;this.random=random}
 private canRange(e:EnemyInstance,t:SoldierInstance,a:EnemyRangedAttack){
  const vis=t.template.vis??{flags:1025,bans:0},bans=t.visBans??vis.bans,dx=t.pos.x-e.path.position.x,dy=t.pos.y-e.path.position.y,d=dx*dx+dy*dy/(.7*.7)
  return e.hp>0&&!e.template.unit.is_stunned&&!soldierIsDead(t)&&this.present(t)&&!(bans&a.vis_flags)&&!(vis.flags&a.vis_bans)&&d<=a.max_range**2&&(a.min_range===0||d>a.min_range**2)
 }
 private sprite(e:EnemyInstance,s:State,name:string,at:number,loop:boolean){s.spriteAt=at;s.animationAt=at;this.onSprite(e,{name,at,loop,facingLeft:s.facingLeft})}
 advanceEnemy(e:EnemyInstance,time:number):boolean{
  if(e.name!=='enemy_shadow_archer')return false
  const a=e.template.ranged!.attacks[0]
  let s=this.states.get(e);if(!s){s={phase:'walk',lastAt:0,spriteAt:e.visualOverride?.at??e.born,readyAt:0,facingLeft:e.visualOverride?.facingLeft??false,animationAt:e.born,holding:false};this.states.set(e,s);this.owner.states.set(e.id,s)}
  s.holding=false;e.rangedHolding=false
  const hold=()=>{s!.holding=true;e.rangedHolding=true;e.meleeHolding=false;return true}
  if(s.phase==='attack'){
   const c=s.cycle!,interrupted=e.hp<=0||e.template.unit.is_stunned
   if(!c.fired&&time-c.startedAt<data.attack.shoot_time){if(interrupted){s.phase='walk';s.cycle=undefined;e.rangedAttackActive=false;return false}return hold()}
   if(!c.fired){this.fire(e,s,time);c.fired=true}
   if(nativeLogicAnimationFrame(24,time,c.startedAt,false,30).runs>0){s.phase='range';s.cycle=undefined;e.rangedAttackActive=false;this.sprite(e,s,'idle',c.startedAt,true);return hold()}
   if(interrupted){s.phase='walk';s.cycle=undefined;e.rangedAttackActive=false;return false}
   return hold()
  }
  if(s.phase==='exit'){s.phase='walk';s.target=undefined}
  if(e.hp<=0||e.escapedAt!==undefined||e.template.unit.is_stunned||e.frozen||e.skillLocked)return false
  if(s.phase==='walk'){
   if(this.blocked(e)||!this.canEnter(e)||!this.nodeValid(e))return false
   const found=luaSort(this.candidates(e,a.max_range).filter(t=>this.canRange(e,t,a)),(t,u)=>Math.sqrt((t.pos.x-e.path.position.x)**2+(t.pos.y-e.path.position.y)**2)<Math.sqrt((u.pos.x-e.path.position.x)**2+(u.pos.y-e.path.position.y)**2))
   if(!found.length)return false
   s.target=found[0];s.facingLeft=e.visualOverride?.facingLeft??s.facingLeft;s.phase='range';this.sprite(e,s,'idle',e.visualOverride?.at??s.spriteAt,true)
  }
  if(!s.target||!this.canRange(e,s.target,a)||this.blocked(e)){s.phase='exit';return hold()}
  if(time-s.lastAt>=a.cooldown){
   s.lastAt=time;s.readyAt=time+a.cooldown
   if(this.random()<a.chance){s.facingLeft=s.target.pos.x<e.path.position.x;s.cycle={startedAt:time,target:s.target,fired:false,attack:a};s.phase='attack';e.rangedAttackActive=true;this.sprite(e,s,a.animation,time,false)}
  }
  return hold()
 }
 resumeDeath(e:EnemyInstance,time:number){const s=this.states.get(e);if(!s)return true;if(s.phase==='attack'){this.advanceEnemy(e,time);return this.states.get(e)?.phase!=='range'}if(s.phase==='range'){s.phase='exit';return false}return true}
 private fire(e:EnemyInstance,s:State,time:number){
  const c=s.cycle!,t=c.target,a=c.attack,vis=t.template.vis??{flags:1025,bans:0};if((t.visBans??vis.bans)&a.vis_flags||vis.flags&a.vis_bans)return
  const o=a.bullet_start_offset[0],from={x:e.path.position.x+o.x*(s.facingLeft?-1:1),y:e.path.position.y+o.y},hit=t.template.unit?.hit_offset??{x:0,y:0},to={x:t.pos.x+hit.x,y:t.pos.y+hit.y}
  const p:NativeEnemyArrow={id:this.nextId--,name:a.bullet,source:e,queuedAt:time,born:time,from,pos:{...from},to,rotation:0,hidden:true,motion:new EnemyArrowMotion(from,to,data.bullet),target:t,inserted:false,damageFactor:data.bullet.damage_factor}
  this.onQueueArrow(p)
 }
 insertArrow(p:NativeEnemyArrow,time:number){if(!this.present(p.target))return false;p.born=time;p.motion=new EnemyArrowMotion(p.from,p.to,data.bullet);p.pos=p.motion.pos;p.inserted=true;this.owner.projectiles.push(p);this.owner.onSound('ArrowSound');return true}
 advanceArrow(p:NativeEnemyArrow,time:number,dt:number){
  if(p.doneAt!==undefined)return
  const t=p.target,offset=t.template.unit?.hit_offset??{x:0,y:0},hit={x:t.pos.x+offset.x,y:t.pos.y+offset.y}
  const done=p.motion.step(time-p.born,dt,hit);p.pos=p.motion.pos;p.rotation=p.motion.rotation;p.hidden=p.motion.hidden;if(!done)return
  const b=data.bullet,valid=this.present(t)&&!soldierIsDead(t),close=valid&&Math.hypot(p.pos.x-hit.x,p.pos.y-hit.y)<b.hit_distance,dodged=close&&this.owner.dodges.check(t,time,true)
  if(close&&!dodged){
   const order=this.onCreateDamage();this.onDamage(p,bulletDamageValue(b.damage_min,b.damage_max,p.damageFactor,this.random),typeof order==='number'?order:undefined)
   if(b.hit_blood_fx&&t.template.unit?.blood_color!=='none')this.effect('fx',b.hit_blood_fx,hit,time,p.rotation,t.template.unit?.blood_color)
  }
  if(valid&&t.dodge?.active&&t.dodge.show_pop)this.owner.dodges.show(t,time)
  if(!close||dodged){if(this.cellAt(p.pos)&2)this.effect('fx',b.miss_fx_water,p.to,time,0);else if(this.cellAt(p.to)&2049)this.effect('miss','decal_tween',p.to,time,p.rotation)}
  p.doneAt=time;this.onRemoveArrow(p)
 }
 private effect(kind:EnemyArrowEffect['kind'],name:string,pos:Point,at:number,rotation:number,bloodColor?:string){const m:EnemyArrowEffect={kind,name,pos:{...pos},at,rotation,alpha:255,bloodColor};this.onQueueEffect(m);if(kind==='miss')this.misses.push(m);this.onEffect(m)}
 insertEffect(m:EnemyArrowEffect){if(m.name==='fx_blood_splat')this.owner.onSound('HitSound')}
 tween(m:EnemyArrowEffect,time:number){if(m.kind!=='miss'||m.queued)return;const age=time-m.at;m.alpha=255+(0-255)*Math.min(1,Math.max(0,age/2.1));if(age>=2.1){m.queued=true;this.onRemoveEffect(m)}}
 removeEffect(m:EnemyArrowEffect){const i=this.misses.indexOf(m);if(i>=0)this.misses.splice(i,1)}
 removeEnemy(e:EnemyInstance){this.states.delete(e);this.owner.states.delete(e.id)}
 removeArrow(p:NativeEnemyArrow){const i=this.owner.projectiles.indexOf(p);if(i>=0)this.owner.projectiles.splice(i,1)}
}
