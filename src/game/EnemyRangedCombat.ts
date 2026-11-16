import {EnemyRangedRuntime} from './EnemyRangedRuntime.ts'
import type {EnemyArrowEffect} from './EnemyRangedRuntime'
import {DodgeSystem} from './DodgeSystem.ts'
import {bulletDamageValue} from './BulletDamage.ts'
import {damageSoldier} from './SoldierHealth.ts'
import {EnemyArrowMotion} from './EnemyArrowMotion.ts'
import type {EnemyArrowConfig} from './EnemyArrowMotion'
import type {EnemyInstance} from './GameSession'
import type {SoldierInstance} from './BarracksCombat'
import type {Point,LevelData} from './types'
export interface EnemyRangedAttack {ts:number;cooldown:number;min_range:number;max_range:number;max_range_variance?:number;vis_flags:number;vis_bans:number;chance:number;hold_advance:boolean;animation:string;shoot_time:number;bullet:string;bullet_start_offset:Point[]}
interface BulletTemplate {bullet:EnemyArrowConfig&{damage_min:number;damage_max:number;damage_type:number;damage_factor:number;reduce_armor:number;reduce_magic_armor:number;hit_blood_fx?:string};sound_events?:Record<string,string>}
interface RangedCycle {startedAt:number;target:SoldierInstance;fired:boolean;attack:EnemyRangedAttack}
export interface EnemyRangedState {readyAt:number;target?:SoldierInstance;cycle?:RangedCycle;facingLeft:boolean;animationAt:number;holding:boolean}
export interface EnemyArrow {id:number;name:string;born:number;pos:Point;to:Point;rotation:number;hidden:boolean;motion:EnemyArrowMotion;target:SoldierInstance}
export function canEnemyRange(enemy:EnemyInstance,soldier:SoldierInstance,attack:EnemyRangedAttack){
 if(enemy.hp<=0||soldier.hp<=0||enemy.escapedAt!==undefined)return false
 const vis=soldier.template.vis??{flags:1025,bans:0};if(vis.bans&attack.vis_flags||vis.flags&attack.vis_bans)return false
 const dx=soldier.pos.x-enemy.path.position.x,dy=soldier.pos.y-enemy.path.position.y,aspect2=.7*.7,d=aspect2*dx*dx+dy*dy
 return d<=attack.max_range*attack.max_range*aspect2 && (attack.min_range===0||d>attack.min_range*attack.min_range*aspect2)
}
export class EnemyRangedCombat {
 defer=false
 readonly runtime:EnemyRangedRuntime
 dodges:DodgeSystem
 readonly states=new Map<number,EnemyRangedState>()
 readonly projectiles:EnemyArrow[]=[]
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number,transform?:{rotation?:number;bloodColor?:string})=>void=()=>{}
 onMiss:(pos:Point,rotation:number,time:number,impact:Point,model?:EnemyArrowEffect)=>void=()=>{}
 private templates:Record<string,BulletTemplate>
 private level:LevelData
 private random:()=>number
 private nextId=-1000000
 onKill:(enemy:EnemyInstance)=>void=()=>{}
 constructor(level:LevelData,templates:Record<string,BulletTemplate>,random:()=>number){this.dodges=new DodgeSystem(random);this.level=level;this.templates=templates;this.random=random;this.runtime=new EnemyRangedRuntime(this,random)}
 advance(time:number,dt:number,enemies:EnemyInstance[],soldiers:SoldierInstance[]){
  if(this.defer)return
  time=Math.round(time*30)/30
  for(const e of enemies){
   const attack=e.template.ranged?.attacks[0];if(!attack)continue
   let s=this.states.get(e.id);if(!s){s={readyAt:e.born+attack.cooldown,facingLeft:false,animationAt:e.born,holding:false};this.states.set(e.id,s)}
   s.holding=false;e.rangedHolding=false
   if(e.hp<=0||e.escapedAt!==undefined||e.template.unit.is_stunned){s.cycle=undefined;e.rangedAttackActive=false;continue}
   const cycle=s.cycle
   if(cycle){
    if(!cycle.fired&&time-cycle.startedAt>=Math.round(attack.shoot_time*30)/30){this.fire(e,s,cycle,time);cycle.fired=true}
    if(time-cycle.startedAt+1e-9>=(e.template.webAnimationDurations?.[attack.animation]??.8)){s.cycle=undefined;s.animationAt=time;e.rangedAttackActive=false}
    else {s.holding=true;e.rangedHolding=true;continue}
   }
   if(e.blocked||e.meleeHolding||e.frozen||e.skillLocked)continue
   const nav=e.path as typeof e.path&{pi?:number;ni?:number};if(nav.pi&&nav.ni&&this.level.navigation?.targetNodes?.[nav.pi-1]?.[nav.ni-1]===false)continue
   if(!s.target||!soldiers.includes(s.target)||!canEnemyRange(e,s.target,attack))s.target=soldiers.filter(t=>canEnemyRange(e,t,attack)).sort((a,b)=>(a.pos.x-e.path.position.x)**2+(a.pos.y-e.path.position.y)**2-((b.pos.x-e.path.position.x)**2+(b.pos.y-e.path.position.y)**2))[0]
   if(!s.target)continue
   s.holding=true;e.rangedHolding=true
   if(time<s.readyAt)continue
   s.readyAt=time+attack.cooldown
   if(this.random()>=attack.chance)continue
   s.facingLeft=s.target.pos.x<e.path.position.x;s.animationAt=time;s.cycle={startedAt:time,target:s.target,fired:false,attack};e.rangedAttackActive=true
  }
  for(let i=this.projectiles.length-1;i>=0;i--){
   const p=this.projectiles[i],target=p.target,offset=target.template.unit?.hit_offset??{x:0,y:12},hit={x:target.pos.x+offset.x,y:target.pos.y+offset.y}
   const done=p.motion.step(time-p.born,dt,hit);p.pos=p.motion.pos;p.rotation=p.motion.rotation;p.hidden=p.motion.hidden
   if(!done)continue
   const b=this.templates[p.name].bullet
   const valid=soldiers.includes(target)&&target.hp>0,close=valid&&Math.hypot(p.pos.x-hit.x,p.pos.y-hit.y)<b.hit_distance
   const dodged=close&&this.dodges.check(target,time,true)
   if(close&&!dodged){
    const raw=bulletDamageValue(b.damage_min,b.damage_max,b.damage_factor,this.random)
    damageSoldier(target,{value:raw,damage_type:b.damage_type,reduce_armor:b.reduce_armor,reduce_magic_armor:b.reduce_magic_armor},time,this.onKill)
    if(b.hit_blood_fx&&target.template.unit?.blood_color!=='none'){this.onEffect(b.hit_blood_fx,hit,time);const sound=this.templates[b.hit_blood_fx]?.sound_events?.insert;if(sound)this.onSound(sound)}
    if(target.hp<=0&&target.deathHealthAt===undefined){target.diedAt=time;target.target=undefined;target.attack=undefined;const sound=target.template.sound_events?.death;if(sound)this.onSound(sound)}
   }
   // KR6's custom arrow script shows a pending dodge pop even when proximity missed.
   if(valid&&target.dodge?.active&&target.dodge.show_pop)this.dodges.show(target,time)
   if(!close||dodged)this.onMiss(p.to,p.rotation,time,p.pos)
   this.projectiles.splice(i,1)
  }
 }
 private fire(e:EnemyInstance,state:EnemyRangedState,cycle:RangedCycle,time:number){
  const t=cycle.target,vis={flags:t.template.vis?.flags??1025,bans:t.visBans??t.template.vis?.bans??0},a=cycle.attack;if(vis.bans&a.vis_flags||vis.flags&a.vis_bans)return
  const offset=a.bullet_start_offset[0],from={x:e.path.position.x+offset.x*(state.facingLeft?-1:1),y:e.path.position.y+offset.y},hit=cycle.target.template.unit?.hit_offset??{x:0,y:12},to={x:cycle.target.pos.x+hit.x,y:cycle.target.pos.y+hit.y},bullet=this.templates[a.bullet]
  const motion=new EnemyArrowMotion(from,to,bullet.bullet);this.projectiles.push({id:this.nextId--,name:a.bullet,born:time,pos:motion.pos,to,rotation:0,hidden:true,motion,target:cycle.target})
  if(bullet.sound_events?.insert)this.onSound(bullet.sound_events.insert)
 }
}
