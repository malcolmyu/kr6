import {soldierIsDead} from './SoldierHealth.ts'
import frames from '../../public/data/enemy-melee-frames.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {EnemyInstance} from './GameSession'
import type {SoldierInstance,MeleeAttack,MeleeCycle} from './BarracksCombat'
import type {DodgeSystem} from './DodgeSystem'
import type {Point} from './types'
type Sprite={name:string;at:number;loop:boolean;facingLeft:boolean}
interface State {phase:'walk'|'slot'|'melee'|'attack'|'exit';target?:SoldierInstance;ts:number;sprite:Sprite;quadrant?:number;slotYield?:boolean}
/** Shipped generic enemy main + y_enemy_melee_attacks continuation, at 30 Hz. */
export class EnemyMelee {
 readonly states=new WeakMap<EnemyInstance,State>()
 beforeAbility?:(enemy:EnemyInstance)=>boolean
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onDamage:(enemy:EnemyInstance,target:SoldierInstance,attack:MeleeAttack,value:number,time:number)=>void=()=>{}
 private random:()=>number
 private blockers:(enemy:EnemyInstance)=>SoldierInstance[]
 private dodges:DodgeSystem
 constructor(random:()=>number,blockers:(enemy:EnemyInstance)=>SoldierInstance[],dodges:DodgeSystem){this.random=random;this.blockers=blockers;this.dodges=dodges}
 supports(e:EnemyInstance){return !!(frames as Record<string,unknown>)[e.template.render?.sprites[0]?.prefix]}
 private state(e:EnemyInstance){let s=this.states.get(e);if(!s){s={phase:'walk',ts:e.template.melee?.attacks[0]?.ts||e.born,sprite:{name:'idle',at:e.born,loop:true,facingLeft:false}};this.states.set(e,s)}return s}
 private sprite(e:EnemyInstance,s:State,name:string,time:number,loop:boolean,target?:Pick<SoldierInstance,'pos'>){
  if(name==='idle')e.idleStartedAt??=time;else e.idleStartedAt=undefined
  s.sprite={name,at:loop?s.sprite.at:time,loop,facingLeft:target?target.pos.x<e.path.position.x:s.sprite.facingLeft};e.visualOverride=s.sprite
 }
 /** utils.animation_name_for_angle: the three-direction walk keeps hysteresis. */
 walk(e:EnemyInstance){
  const s=this.state(e)
  e.idleStartedAt=undefined
  const config=e.template.render.sprites[0],direction=e.path.walkDirection??e.path.direction,angle=(Math.atan2(direction.y,direction.x)*180/Math.PI+360)%360
  let [a1,a2,a3,a4]=config.angles_custom.walk
  const stickiness=config.angles_stickiness?.walk
  if(stickiness&&s.quadrant){const skew=stickiness*(s.quadrant===1||s.quadrant===3?1:-1);a1-=skew;a2+=skew;a3-=skew;a4+=skew}
  const quadrant=angle>=a1&&angle<a2?1:angle>=a2&&angle<a3?2:angle>=a3&&angle<a4?3:4,index=quadrant===1?1:quadrant===3?2:0
  if(stickiness)s.quadrant=quadrant
  s.sprite={name:config.angles.walk[index],at:s.sprite.at,loop:true,facingLeft:quadrant===2};e.visualOverride=s.sprite
 }
 private canMelee(e:EnemyInstance,s:SoldierInstance){return !soldierIsDead(s)&&!e.template.unit.is_stunned&&this.blockers(e).includes(s)}
 resumeDeath(e:EnemyInstance,time:number){
  const s=this.states.get(e)
  if(s&&s.phase==='melee'){s.phase='exit';return false}
  if(s?.phase==='attack'){this.advance(e,time);return this.states.get(e)?.phase!=='melee'}
  return true
 }
 advance(e:EnemyInstance,time:number){
  const s=this.state(e)
  e.meleeManaged=true;e.meleeHolding=false
  if(s.phase==='attack'&&!e.meleeAttack){s.phase='walk';s.target=undefined}
  if(s.phase==='attack'){
   const c=e.meleeAttack!,a=c.attack,target=s.target!,elapsed=time-c.startedAt,times=a.hit_times??[a.hit_time??0]
   while(c.nextHit<times.length){
    const i=c.nextHit,hitTime=Math.round(times[i]*30)/30
    if(target.dodge&&a.dodge_time!==undefined&&c.dodged?.[i]===undefined){
     const dodgeTime=target.dodge.time_before_hit!==undefined?hitTime-target.dodge.time_before_hit:Math.round(a.dodge_time*30)/30
     if(elapsed<dodgeTime){if(e.hp<=0||e.template.unit.is_stunned&&!a.ignore_stun){s.phase='walk';e.meleeAttack=undefined;break}e.meleeHolding=true;return}
     c.dodged??=[];c.dodged[i]=this.dodges.check(target,time,false,a)
    }
    if(elapsed<hitTime){if(e.hp<=0||e.template.unit.is_stunned&&!a.ignore_stun){s.phase='walk';e.meleeAttack=undefined;break}e.meleeHolding=true;return}
    if(a.sound_hit)this.onSound(a.sound_hit)
    const dodged=c.dodged?.[i]??false
    if(dodged&&target.dodge?.active&&target.dodge.show_pop)this.dodges.show(target,time)
    if(!dodged&&this.blockers(e).includes(target)){
     const value=Math.ceil((e.template.unit.damage_factor??1)*(a.hit_damage_factor?.[i]??1)*(a.damage_min+Math.floor(this.random()*(a.damage_max-a.damage_min+1))))
     this.onDamage(e,target,a,value,time)
    }
    if(a.hit_fx&&(!a.hit_fx_once||i===0)){const offset=a.hit_offset??{x:0,y:0};this.onEffect(a.hit_fx,{x:e.path.position.x+(s.sprite.facingLeft?-1:1)*offset.x,y:e.path.position.y+offset.y},time)}
    c.nextHit++
   }
   if(e.hp<=0&&s.phase!=='attack')return
   if(s.phase==='attack'){
    const prefix=e.template.render.sprites[0].prefix,count=(frames as unknown as Record<string,Record<string,number>>)[prefix][a.animation]
    if(nativeLogicAnimationFrame(count,time,c.startedAt,false,30).runs>0){s.phase='melee';e.meleeAttack=undefined;this.sprite(e,s,'idle',time,true,target);e.meleeHolding=true;return}
    if(e.hp<=0){s.phase='walk';e.meleeAttack=undefined;return}
    // Original has a reversed ignore_stun test in the post-hit animation wait.
    if(e.template.unit.is_stunned&&a.ignore_stun){s.phase='walk';e.meleeAttack=undefined}
    else{e.meleeHolding=true;return}
   }
  }
  if(s.phase==='exit'){s.phase='walk'}
  if(e.template.unit.is_stunned){s.phase='walk';this.sprite(e,s,'idle',time,true,s.target);e.meleeHolding=true;return}
  if(s.phase==='melee'){
   if(!s.target||!this.canMelee(e,s.target)){s.phase='exit';e.meleeHolding=true;return}
  }else{
   const target=this.blockers(e)[0]
   if(!target){s.phase='walk';s.target=undefined;if(e.visualOverride===s.sprite)e.visualOverride=undefined;return}
   if(s.phase==='walk'){s.target=target;s.phase='slot';s.slotYield=false;this.sprite(e,s,'idle',time,true,{pos:target.motionArrived===false?target.motionDest??target.pos:target.pos})}
   if(s.phase==='slot'){
    const target=s.target!
    if(s.slotYield&&!this.canMelee(e,target)){s.phase='walk';s.target=undefined;this.advance(e,time);return}
    // y_wait_for_blocker reads persistent motion.arrived. The transient walk
    // pose can stop during a ranged/skill continuation before arrival is true.
    if(target.motionArrived===false){s.slotYield=true;e.meleeHolding=true;return}
    if(!this.canMelee(e,target)){s.phase='exit';e.meleeHolding=true;return}
    s.phase='melee'
   }
  }
  e.meleeHolding=true
  if(this.beforeAbility?.(e)){s.phase='exit';return}
  const target=s.target!,a=e.template.melee?.attacks.find(a=>!a.disabled)
  if(!a||a.cooldown>time-s.ts||(a.vis_flags&(target.visBans??target.template.vis?.bans??0))||(a.vis_bans&(target.template.vis?.flags??0)))return
  s.ts=time
  if((a.chance??1)<=this.random())return
  s.phase='attack';e.meleeAttack={startedAt:time,nextHit:0,attack:a,targetId:target.id,dodged:[]};this.sprite(e,s,a.animation,time,false,target)
  if(a.sound)this.onSound(a.sound)
  // Native attacks can contain an immediate hit.
  this.advance(e,time)
 }
}
