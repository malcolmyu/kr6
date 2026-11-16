import {luaSort} from './LuaSort.ts'
import {recordEnemyDamage} from './EnemyDeath.ts'
import {DodgeSystem} from './DodgeSystem.ts'
import {soldierDamageFactor} from './SoldierHealth.ts'
import {bulletDamageValue} from './BulletDamage.ts'
import type {EnemyInstance} from './GameSession'
import type {HeroUnit,HeroRangedAttack} from './HeroSystem'
import type {Point} from './types'
import {predictDamage} from './Damage.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {FirebookTrailSystem} from './FirebookTrail.ts'
import {HomingBoltMotion} from './HomingBoltMotion.ts'
import type {HomingConfig} from './HomingBoltMotion'
interface BulletTemplate {bullet:HomingConfig&{particles_name?:string;damage_type:number;damage_factor:number;use_unit_damage_factor?:boolean;critical_chance?:number;pop?:string[];pop_chance?:number;pop_conds?:number;max_track_distance:number;hit_fx?:string};sound_events?:Record<string,string>}
export interface HeroProjectile {nativePsCreated?:boolean;particleRotation?:number;id:number;name:string;born:number;pos:Point;to:Point;rotation:number;target:EnemyInstance;tracking:boolean;queuedAt:number;doneAt?:number;motion:HomingBoltMotion;damage:[number,number];damageFactor?:number;source?:HeroUnit;xpFactor?:number;pop?:string[];popChance?:number;popConds?:number}
interface HeroRangedCycle {attack:HeroRangedAttack;target:EnemyInstance;predicted:Point;at:number;startedAt:number;previousReadyAt:number;previousRangedAt?:number;fired:boolean;critical:boolean}
export class HeroRangedCombat {
  deferProjectileInsertSound=false
  readonly projectiles:HeroProjectile[]=[]
  readonly trails:FirebookTrailSystem
  onParticleCreate:(name:string,time:number,p:HeroProjectile)=>void=()=>{}
  readonly queuedProjectiles:HeroProjectile[]=[]
  onQueueProjectile:(p:HeroProjectile,time:number)=>void=()=>{}
  onRemoveProjectile:(p:HeroProjectile)=>void=()=>{}
  onDamageCreate:()=>number|void=()=>{}
  onEffectCreate:(name:string)=>void=()=>{}
  private hits:{p:HeroProjectile;value:number;result?:number;popOrder?:number}[]=[]
  readonly pops:DodgeSystem
  onSound:(name:string)=>void=()=>{}
  onEffect:(name:string,pos:Point,time:number,transform?:{rotation:number})=>void=()=>{}
  predictTarget:(enemy:EnemyInstance,seconds:number)=>{pos:Point;valid:boolean}=(e,seconds)=>({pos:e.path.predict(e.blocked||e.meleeHolding||e.frozen||e.rangedHolding||e.skillLocked?0:e.template.motion.max_speed*seconds),valid:!e.path.finished})
  /** soldier_pick_ranged_target_and_attack applies both range gates to FFE's
   * forecast point. Flying targets bypass the minimum range only. */
  enemyCandidates:(enemies:EnemyInstance[],pos:Point,radius:number)=>EnemyInstance[]=enemies=>enemies
  acquire(hero:HeroUnit,attack:HeroRangedAttack,enemies:EnemyInstance[]){
    return luaSort(this.enemyCandidates(enemies,hero.pos,attack.max_range+attack.node_prediction*150).filter(e=>e.hp>0&&!e.path.finished&&!(e.template.vis.flags&attack.vis_bans)&&!(e.template.vis.bans&attack.vis_flags)).map(target=>({target,position:this.predictTarget(target,attack.node_prediction)})).filter(({target,position})=>{
      const distance=(position.pos.x-hero.pos.x)**2+((position.pos.y-hero.pos.y)/.7)**2
      return position.valid&&distance<=attack.max_range**2&&((target.template.vis.flags&128)!==0||distance>attack.min_range**2)
     }),(a,b)=>a.target.path.remainingNodes<b.target.path.remainingNodes)[0]
  }
  private shots=new Map<number,HeroRangedCycle>()
  private rangedClocks=new WeakMap<HeroUnit,number>()
  private interruptions=new Map<number,HeroUnit>()
  private nextId=-1
  private templates:Record<string,BulletTemplate>
  private random:()=>number
  private onKill:(enemy:EnemyInstance)=>void
  constructor(templates:Record<string,BulletTemplate>,random:()=>number,onKill:(enemy:EnemyInstance)=>void,pops?:DodgeSystem){this.trails=new FirebookTrailSystem(random);this.pops=pops??new DodgeSystem(random,templates as unknown as ConstructorParameters<typeof DodgeSystem>[1]);this.templates=templates;this.random=random;this.onKill=onKill}
  private releaseCritical(hero:HeroUnit,shot:HeroRangedCycle|undefined){if(shot?.critical){hero.template.unit!.damage_factor=(hero.template.unit!.damage_factor??1)/2;shot.critical=false}}
  requestInterrupt(hero:HeroUnit){if(this.shots.has(hero.id)||hero.rangedUntil!==undefined)this.interruptions.set(hero.id,hero)}
  isAttacking(hero:HeroUnit){return this.shots.has(hero.id)}
  /** The ranged helper returns whether it fired, even when death ends its tail.
   * A fired shot resumes the hero main below ranged, through idle, before yield. */
  resumeDeath(hero:HeroUnit,time:number){
    const shot=this.shots.get(hero.id)
    if(!shot)return false
    if(!shot.fired&&time-shot.startedAt>=Math.round(shot.attack.shoot_time*30)/30){this.fire(hero,shot.attack,shot.target,time,shot.predicted);shot.fired=true}
    if(!shot.fired){hero.readyAt=shot.previousReadyAt;if(shot.previousRangedAt===undefined)this.rangedClocks.delete(hero);else this.rangedClocks.set(hero,shot.previousRangedAt)}
    hero.idleVisual={name:shot.attack.animation,at:shot.startedAt,loop:false}
    if(hero.visualOverride?.name===shot.attack.animation)hero.visualOverride=undefined
    hero.rangedUntil=undefined;this.releaseCritical(hero,shot);this.shots.delete(hero.id);this.interruptions.delete(hero.id)
    return shot.fired
  }
  processInterrupts(time:number){
    for(const [id,hero]of this.interruptions){
      const shot=this.shots.get(id)
      if(shot&&!shot.fired&&hero.hp>0&&time-shot.startedAt>=Math.round(shot.attack.shoot_time*30)/30){this.fire(hero,shot.attack,shot.target,time,shot.predicted);shot.fired=true}
      if(shot&&!shot.fired){hero.readyAt=shot.previousReadyAt;if(shot.previousRangedAt===undefined)this.rangedClocks.delete(hero);else this.rangedClocks.set(hero,shot.previousRangedAt)}
      this.releaseCritical(hero,shot);this.shots.delete(id)
      if(hero.visualOverride?.name===shot?.attack.animation)hero.visualOverride=undefined
      hero.rangedUntil=undefined;hero.actionYieldUntil=time+1/30;this.interruptions.delete(id)
    }
  }
  advance(time:number,dt:number,heroes:HeroUnit[],enemies:EnemyInstance[]) {
    this.processInterrupts(time)
    this.beginTick(time)
    for(const hero of heroes)this.advanceHero(time,hero,enemies)
    this.advanceProjectiles(time,dt,enemies)
    this.resolveHits(time)
    this.advanceParticles(time)
  }
  beginTick(time:number){
    for(let i=this.projectiles.length-1;i>=0;i--)if(this.projectiles[i].doneAt!==undefined&&time>this.projectiles[i].doneAt!)this.projectiles.splice(i,1)
    for(let i=0;i<this.queuedProjectiles.length;){const p=this.queuedProjectiles[i];if(time<=p.queuedAt){i++;continue}this.queuedProjectiles.splice(i,1);p.born=time;p.rotation=Math.atan2(p.to.y-p.pos.y,p.to.x-p.pos.x);this.projectiles.push(p);const sound=this.templates[p.name].sound_events?.insert;if(sound&&!this.deferProjectileInsertSound)this.onSound(sound)}
  }
  advanceHero(time:number,hero:HeroUnit,enemies:EnemyInstance[]){

      const shot=this.shots.get(hero.id)
      if(hero.hp<=0 || hero.deploying){if(shot&&!shot.fired){hero.readyAt=shot.previousReadyAt;if(shot.previousRangedAt===undefined)this.rangedClocks.delete(hero);else this.rangedClocks.set(hero,shot.previousRangedAt)};this.releaseCritical(hero,shot);this.shots.delete(hero.id);if(hero.visualOverride?.name===shot?.attack.animation)hero.visualOverride=undefined;hero.rangedUntil=undefined;return}
      if(hero.scriptLocked||time+1e-9<(hero.actionYieldUntil??0))return
      if(shot&&!shot.fired&&time-shot.startedAt>=Math.round(shot.attack.shoot_time*30)/30){this.fire(hero,shot.attack,shot.target,time,shot.predicted);shot.fired=true}
      if(shot&&hero.rangedUntil!==undefined&&nativeLogicAnimationFrame(Math.round(hero.template.webAnimationDurations[shot.attack.animation]*30),time,shot.startedAt,false,30).runs>0){hero.rangedUntil=undefined;hero.idleVisual={name:shot.attack.animation,at:shot.startedAt,loop:false};hero.visualOverride=undefined;this.releaseCritical(hero,shot);this.shots.delete(hero.id);return}
      if(hero.target || hero.moving || hero.attack || hero.rangedUntil!==undefined || time+1e-9<hero.readyAt)return
      const attack=hero.template.ranged?.attacks[0]
      if(!attack)return
      const previousRangedAt=this.rangedClocks.get(hero);if(previousRangedAt!==undefined&&time-previousRangedAt<attack.cooldown)return
      const acquired=this.acquire(hero,attack,enemies)
      if(!acquired)return
      const {target,position}=acquired,predicted={...position.pos}
      if(this.random()>(attack.chance??1)){hero.readyAt=time+attack.cooldown;return}
      const chance=hero.rangedCriticalChance??this.templates[attack.bullet].bullet.critical_chance,critical=chance!==undefined&&this.random()<chance
      if(critical)hero.template.unit!.damage_factor=(hero.template.unit!.damage_factor??1)*2
      const previousReadyAt=hero.readyAt;this.rangedClocks.set(hero,time)
      hero.facingLeft=predicted.x<hero.pos.x;hero.readyAt=time+attack.cooldown
      hero.rangedUntil=time+hero.template.webAnimationDurations[attack.animation]
      hero.visualOverride={name:attack.animation,at:time}
      this.shots.set(hero.id,{attack,target,predicted,at:time+attack.shoot_time,startedAt:time,previousReadyAt,previousRangedAt,fired:false,critical})
      }
  advanceProjectiles(time:number,dt:number,enemies:EnemyInstance[]){for(const p of [...this.projectiles])this.advanceProjectile(p,time,dt,enemies)}
  advanceProjectile(p:HeroProjectile,time:number,dt:number,enemies:EnemyInstance[]){
    if(!this.projectiles.includes(p)||p.doneAt!==undefined)return

      const b=this.templates[p.name].bullet,e=p.target,offset=e.template.unit.hit_offset
      const firstUpdate=time===p.born
      if(!p.nativePsCreated&&b.particles_name){p.nativePsCreated=true;p.particleRotation=0;this.trails.queue(p,time,'zefira');this.onParticleCreate(b.particles_name,time,p)}
      if(!firstUpdate&&p.tracking && e.hp>0 && !e.path.finished && !(e.template.vis.bans&2)) {
        const to={x:e.path.position.x+offset.x,y:e.path.position.y+offset.y}
        if(Math.max(Math.abs(to.x-p.to.x),Math.abs(to.y-p.to.y))>b.max_track_distance)p.tracking=false
        else p.to=to
      } else if(!firstUpdate)p.tracking=false
      const arrived=p.motion.step(p.pos,p.to,dt);if(!firstUpdate){p.rotation=p.motion.rotation;p.particleRotation=p.rotation}
      if(!arrived)return
      p.pos={...p.to}
      if(!firstUpdate&&p.tracking&&e.hp>0&&!e.template.health.ignore_damage){const order=this.onDamageCreate();this.hits.push({p,popOrder:typeof order==='number'?order:undefined,value:bulletDamageValue(p.damage[0],p.damage[1],p.damageFactor??1,this.random)})}
      if(b.hit_fx){this.onEffectCreate(b.hit_fx);this.onEffect(b.hit_fx,p.to,time,{rotation:p.rotation})}
      p.doneAt=time;this.onRemoveProjectile(p)
      }
  advanceParticles(time:number){this.trails.advance(time,this.projectiles.map(p=>({id:p.id,pos:p.pos,rotation:p.particleRotation??0})))}
  resolveHits(time:number){
    for(let i=this.hits.length-1;i>=0;i--){const hit=this.hits[i],{p,value}=hit,e=p.target,b=this.templates[p.name].bullet;hit.result=0;if(e.hp<=0||e.template.health.ignore_damage)continue;recordEnemyDamage(e,b.damage_type,time);const before=e.hp,applied=predictDamage({...e.template.health,hp:e.hp},{value,damage_type:b.damage_type});e.hp=Math.max(0,e.hp-applied);hit.result=(applied>0?1:0)|(before>0&&e.hp<=0?2:0);if(p.source&&applied>0&&p.xpFactor)p.source.xpQueued+=applied*p.xpFactor;if(e.hp<=0){e.diedAt=time;this.onKill(e)}}
    for(const {p,result,popOrder}of this.hits)this.pops.showDamage(undefined,p.target,time,p.pop,p.popChance,p.popConds,result,popOrder)
    this.hits=[]
  }

  private fire(hero:HeroUnit,attack:HeroRangedAttack,target:EnemyInstance,time:number,predicted=this.predictTarget(target,attack.node_prediction).pos) {
    const offset=attack.bullet_start_offset[0],pos={x:hero.pos.x+offset.x*(hero.facingLeft?-1:1),y:hero.pos.y+offset.y}
    const hit=target.template.unit.hit_offset,to={x:predicted.x+hit.x,y:predicted.y+hit.y}
    const b=this.templates[attack.bullet],damage:[number,number]=[hero.rangedDamage![0],hero.rangedDamage![1]]
    const projectile:HeroProjectile={id:this.nextId--,name:attack.bullet,born:time,queuedAt:time,pos,to,target,rotation:0,tracking:true,motion:new HomingBoltMotion(b.bullet),damage,damageFactor:b.bullet.damage_factor*(b.bullet.use_unit_damage_factor?soldierDamageFactor(hero):1),source:hero,xpFactor:attack.xp_gain_factor,pop:this.shots.get(hero.id)?.critical?['pop_crit']:b.bullet.pop,popChance:b.bullet.pop_chance,popConds:this.shots.get(hero.id)?.critical?2:b.bullet.pop_conds}
    this.queuedProjectiles.push(projectile);this.onQueueProjectile(projectile,time)
  }
}
