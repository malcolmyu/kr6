import casingTrail from '../../public/data/bolin-casing-trail.json' with {type:'json'}
import runtime from '../../public/data/bolin-runtime.json' with {type:'json'}
import {enemyIsDead} from './EnemyDeath.ts'
import {bulletDamageValue} from './BulletDamage.ts'
import {soldierDamageFactor} from './SoldierHealth.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {FirebookTrailSystem} from './FirebookTrail.ts'
import {ellipseDistanceFactor} from './CatapultMotion.ts'
import type {HeroUnit,HeroRangedAttack} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {bullet?:{damage_factor:number;damage_type:number;reduce_armor:number;reduce_magic_armor:number;use_unit_damage_factor?:boolean;hit_fx:string;hit_fxs?:string[]};ray_duration?:number;image_width?:number;hp_pctg?:number;boss_hp_pctg?:number;allow_rotation?:boolean;sound_events?:{insert?:string};render?:{sprites:{name:string;ts:number;z:number;r:number;alpha:number}[]};spawn_offset?:Point;sound?:string;casing?:string;initial_direction_v?:Point;initial_speed?:number;bounces?:number;elasticity?:number;g?:number;rest_anim?:string;particles_name?:string}
interface Base {kind:'bullet'|'controller'|'casing'|'hit'|'deathController'|'deathAura'|'talentAura';name:string;id:number;pos:Point;queued:boolean}
export interface BolinDeathController extends Omit<Base,'pos'> {kind:'deathController';pos?:never;hero:HeroUnit;sourceId?:number;at?:number;done:boolean}
export interface BolinDeathAura extends Base {kind:'deathAura'}
export interface BolinTalentAura extends Base {kind:'talentAura';sourceId:number;level:number}
export interface BolinBullet extends Base {kind:'bullet';hero:HeroUnit;target:EnemyInstance;from:Point;to:Point;min:number;max:number;factor:number;xpFactor:number;level:number;cap?:number;payload?:string;stalled?:boolean;ray?:{at:number;rotation:number;scale:Point;hidden:boolean}}
export interface BolinCasingController extends Base {kind:'controller';hero:HeroUnit;sourceId?:number;origin:Point;delay:number;amount:number;animations:string[];at?:number}
export interface BolinCasing extends Base {kind:'casing';direction:number;yOrigin:number;phase:'fly'|'land'|'wait'|'fade';at:number;spriteAt:number;animation:string;rotation:number;z:number;alpha:number;bounces:number;vx?:number;vy?:number;nx?:number;ny?:number;speed?:number;dt:number;lastAt?:number;fadeAt?:number;waitAt?:number}
export interface BolinHit extends Base {kind:'hit';at:number;rotation:number}
export type BolinModel=BolinBullet|BolinCasingController|BolinCasing|BolinHit|BolinDeathController|BolinDeathAura|BolinTalentAura
export class BolinNativeRuntime {
 readonly models=new Set<BolinModel>()
 readonly shotCounts=new WeakMap<HeroUnit,number>()
 readonly trails:FirebookTrailSystem
 private random:()=>number
 private templates:()=>Record<string,Config>
 constructor(templates:()=>Record<string,object>,random:()=>number){this.templates=templates as ()=>Record<string,Config>;this.random=random;this.trails=new FirebookTrailSystem(random)}
 id:(model:object)=>number|undefined=()=>undefined
 present:(model:object)=>boolean=()=>true
 onQueue:(model:BolinModel)=>void=()=>{}
 onRemove:(model:BolinModel)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 onCreateDamage:()=>number|undefined=()=>undefined
 onDamage:(b:BolinBullet,value:number,type:number,armor:number,order:number|undefined)=>void=()=>{}
 onParticle:(name:string,source:BolinCasing,time:number)=>void=()=>{}
 candidates:(pos:Point,radius:number)=>EnemyInstance[]=()=>[]
 onAreaDamage:(enemy:EnemyInstance,value:number,type:number,order:number|undefined)=>void=()=>{}
 death(hero:HeroUnit){return this.queue<BolinDeathController>({kind:'deathController',name:'controller_bolin_death_explosion',id:0,queued:false,hero,sourceId:this.id(hero),done:false})}
 private queue<T extends BolinModel>(m:T){this.onQueue(m);m.id=this.id(m)!;return m}
 shoot(hero:HeroUnit,a:HeroRangedAttack,target:EnemyInstance,from:Point,to:Point){
  if(!['bullet_bolin','bullet_bolin_skill_c'].includes(a.bullet))throw new Error(`Bolin projectile not yet implemented: ${a.bullet}`)
  const skill=(hero.template.hero as unknown as {skills:{skill_c:{level:number;damage_cap:number[]}}}).skills.skill_c
  const talent=(hero.template.hero as unknown as {skills:{talent_2:{disabled:boolean;shot_count:number;aura:string}}}).skills.talent_2
  let count=this.shotCounts.get(hero)??0;const payload=count>=talent.shot_count?talent.aura:undefined;if(payload)count=0;if(!talent.disabled)count++;this.shotCounts.set(hero,count)
  const c=this.templates()[a.bullet].bullet!;return this.queue<BolinBullet>({kind:'bullet',name:a.bullet,id:0,pos:{...from},queued:false,hero,target,from:{...from},to:{...to},min:hero.rangedDamage![0],max:hero.rangedDamage![1],factor:c.use_unit_damage_factor?soldierDamageFactor(hero):c.damage_factor,xpFactor:a.xp_gain_factor??0,level:1,payload,cap:skill.damage_cap[skill.level-1]})
 }
 casing(hero:HeroUnit,a:HeroRangedAttack){const c=a as HeroRangedAttack&{casing_spawn_time:number;casings_to_spawn:number;animations_for_casings:string[]};return this.queue<BolinCasingController>({kind:'controller',name:'controller_bolin_spawn_casing',id:0,pos:{x:0,y:0},queued:false,hero,sourceId:this.id(hero),origin:{...hero.pos},delay:c.casing_spawn_time,amount:c.casings_to_spawn,animations:c.animations_for_casings})}
 insert(m:BolinModel){this.models.add(m);const sound=this.templates()[m.name].sound_events?.insert;if(sound)this.onSound(sound);return true}
 private removeLater(m:BolinModel){if(m.queued)return;m.queued=true;this.onRemove(m)}
 advance(m:BolinModel,time:number){
  if(m.queued)return
  const c=this.templates()[m.name]
  if(m.kind==='deathController'){
   const config=c as unknown as {time_to_spawn:number;aura:string};m.at??=time
   if(!m.done&&time-m.at>=config.time_to_spawn){m.done=true;this.queue<BolinDeathAura>({kind:'deathAura',name:config.aura,id:0,pos:{...m.hero.pos},queued:false})}
   return
  }
  if(m.kind==='deathAura'||m.kind==='talentAura'){
   const a=(c as unknown as {aura:{radius:number;vis_flags:number;vis_bans:number;damage_min:number;damage_max:number;damage_type:number}}).aura
   for(const e of this.candidates(m.pos,a.radius))if(!enemyIsDead(e)&&!(e.template.vis.flags&a.vis_bans)&&!(e.template.vis.bans&a.vis_flags)&&(e.path.position.x-m.pos.x)**2+(e.path.position.y-m.pos.y)**2/(.7*.7)<=a.radius*a.radius){const order=this.onCreateDamage(),value=Math.floor(a.damage_max-(a.damage_max-a.damage_min)*ellipseDistanceFactor(e.path.position,m.pos,a.radius));this.onAreaDamage(e,value,a.damage_type,order)}
   this.removeLater(m);return
  }
  if(m.kind==='hit')return
  if(m.kind==='bullet'){
   const isRay=c.ray_duration!==undefined
   if(isRay){
    if(m.stalled)return
    if(m.ray){m.ray.hidden=false;if(time-m.ray.at>=c.ray_duration!)this.removeLater(m);return}
    if(!this.present(m.target)){m.stalled=true;return}
    const hpMax=m.target.template.health.hp_max,maximum=Array.isArray(hpMax)?hpMax[1]:hpMax,pct=m.target.template.vis.flags&runtime.bossFlags?c.boss_hp_pctg!:c.hp_pctg!
    m.min+=maximum*pct;m.max+=maximum*pct
    if(m.cap!==undefined){m.min=Math.max(m.min,m.cap);m.max=Math.max(m.max,m.cap)}
    const dx=m.to.x-m.pos.x,dy=m.to.y-m.pos.y
    m.ray={at:time,rotation:Math.atan2(dy,dx),scale:{x:Math.sqrt(dx*dx+dy*dy)/c.image_width!,y:1},hidden:true}
   }
   if(isRay||this.present(m.target)&&!enemyIsDead(m.target)){
    const order=this.onCreateDamage(),value=bulletDamageValue(m.min,m.max,m.factor,this.random),skills=(m.hero.template.hero as unknown as {skills:{talent_1:{disabled:boolean;reduce_armor:number}}}).skills
    this.onDamage(m,value,c.bullet!.damage_type,skills.talent_1.disabled?c.bullet!.reduce_armor:skills.talent_1.reduce_armor,order)
    const e=m.target,p=e.path.position,o=e.template.unit.hit_offset,dx=p.x-m.hero.pos.x,dy=p.y-m.hero.pos.y,r=Math.atan2(dy,dx)
    const createPayload=()=>{if(m.payload)this.queue<BolinTalentAura>({kind:'talentAura',name:m.payload,id:0,pos:{...p},sourceId:m.id,level:m.level,queued:false})}
    if(isRay)createPayload()
    for(const name of c.bullet!.hit_fxs??[c.bullet!.hit_fx])this.queue<BolinHit>({kind:'hit',name,id:0,pos:{x:p.x+o.x,y:p.y+o.y},queued:false,at:time,rotation:this.templates()[name].allow_rotation?(r<0?r+2*Math.PI:r):0})
    if(!isRay)createPayload()
   }
   if(!isRay)this.removeLater(m);return
  }
  if(m.kind==='controller'){
   m.at??=time
   const hero=m.hero,animation=hero.visualOverride?.name??hero.meleeVisual?.name??hero.idleVisual?.name??(hero.moving?'walk':'idle'),allowed=m.animations.includes(animation)
   if(allowed&&time-m.at<m.delay)return
   if(allowed){if(m.amount>1)this.onSound(c.sound!);for(let i=1;i<=Math.min(4,m.amount);i++){const y=3*(i-2)+(-3+this.random()*6);this.queue<BolinCasing>({kind:'casing',name:c.casing!,id:0,pos:{x:m.origin.x+c.spawn_offset!.x,y:m.origin.y+c.spawn_offset!.y+y},queued:false,direction:hero.facingLeft?1:-1,yOrigin:m.origin.y+y,phase:'fly',at:time,spriteAt:0,animation:'spin',rotation:0,z:3400,alpha:255,bounces:0,dt:1/30})}}
   this.removeLater(m);return
  }
  if(m.phase==='fly'){
   if(m.vx===undefined){
    if(c.particles_name){this.trails.queue(m,time,'bolinCasing');this.onParticle(c.particles_name,m,time)}
    const x=c.initial_direction_v!.x*m.direction+(-.02+this.random()*(.02-(-.02))),y=c.initial_direction_v!.y+(-.06+this.random()*(.06-(-.06))),length=Math.sqrt(x*x+y*y)
    m.nx=x/length;m.ny=y/length;m.speed=c.initial_speed!*(.9+this.random()*(1.1-.9));m.vx=m.speed*m.nx;m.vy=m.speed*m.ny;m.lastAt=time
   }
   m.pos.y+=m.vy!*m.dt;m.pos.x+=m.vx*m.dt;m.rotation+=-Math.sign(m.nx!)*20*m.dt
   if(m.pos.y<=m.yOrigin){
    if(m.bounces===c.bounces){m.vx=m.vy=0;m.rotation=0;m.z=1400;m.phase='land';m.animation=c.rest_anim!;m.spriteAt=time;return}
    m.bounces++;m.pos.y=m.yOrigin;m.speed!*=c.elasticity!;m.vy=m.speed!*m.ny!;m.vx=m.speed!*m.nx!;if(m.bounces===c.bounces)this.trails.stop(m.id)
   }
   m.vy!+=c.g!*m.dt;m.dt=time-m.lastAt!;m.lastAt=time;return
  }
  if(m.phase==='land'){if(nativeLogicAnimationFrame(this.landFrames,time,m.spriteAt,false,30).runs===0)return;m.phase='wait';m.waitAt=time}
  if(m.phase==='wait'&&time-m.waitAt!>=2){m.phase='fade';m.fadeAt=time}
 }
 landFrames=casingTrail.landAnimation.to-casingTrail.landAnimation.from+1
 tween(m:BolinModel,time:number){if(m.kind!=='casing'||m.fadeAt===undefined||m.queued)return;const age=time-m.fadeAt;m.alpha=255+(0-255)*Math.max(0,Math.min(1,age));if(age>=1)this.removeLater(m)}
 remove(m:BolinModel){this.models.delete(m);return true}
 particleSources(){return [...this.models].filter((m):m is BolinCasing=>m.kind==='casing').map(m=>({id:m.id,pos:m.pos,rotation:m.rotation}))}
}
