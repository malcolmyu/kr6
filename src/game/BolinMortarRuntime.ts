import data from '../../public/data/bolin-mortar.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {enemyIsDead} from './EnemyDeath.ts'
import {FirebookTrailSystem} from './FirebookTrail.ts'
import type {HeroUnit} from './HeroSystem'
import type {MortarAttack} from './BolinMortarController'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {bullet:{g:number;particles_name:string;payload:string;hit_fx:string;hit_decal:string;rotation_speed:number;damage_radius:number;damage_flags:number;damage_bans:number;damage_type:number};aura:{duration:number;duration_inc:number;cycle_time:number;radius:number;vis_flags:number;vis_bans:number;mod:string};modifier:{duration:number};slow:{factor:number};loop_time:number;wait_time:number;tween:{props:{keys:number[][]}[]}}
interface Base {kind:'bullet'|'area'|'slow'|'smoke'|'crater';name:string;id:number;pos:Point;pending:boolean}
export interface MortarBullet extends Base {kind:'bullet';sourceId?:number;from:Point;to:Point;flight:number;speed:Point;at?:number;started:boolean;phase:'fly'|'explode';spriteAt:number;rotation:number;z:number;min:number;max:number}
export interface MortarArea extends Base {kind:'area';sourceId?:number;level:number;at:number;last?:number;duration:number}
export interface MortarSlow extends Base {kind:'slow';enemy:EnemyInstance;targetId?:number;sourceId?:number;level:number;at:number;started:boolean;inserted:boolean;factor:number}
export interface MortarVisual extends Base {kind:'smoke'|'crater';at?:number;spriteAt:number;animation:string;loop:boolean;phase:'in'|'loop'|'wait'|'fade';waitAt?:number;alpha:number;tweenAt?:number;tweenDisabled:boolean;reverse:boolean}
export type MortarModel=MortarBullet|MortarArea|MortarSlow|MortarVisual
/** Shipped mortar, aura_apply_mod, mod_slow and delayed reverse-tween coroutines. */
export class BolinMortarRuntime {
 readonly models=new Set<MortarModel>()
 readonly trails:FirebookTrailSystem
 private templates:()=>Record<string,object>
 private random:()=>number
 constructor(templates:()=>Record<string,object>,random:()=>number){this.templates=templates;this.random=random;this.trails=new FirebookTrailSystem(random)}
 private config(name:string){return this.templates()[name] as Config}
 id:(m:object)=>number|undefined=()=>undefined
 present:(e:object)=>boolean=()=>true
 enemies:()=>EnemyInstance[]=()=>[]
 slows:(e:EnemyInstance)=>MortarSlow[]=e=>[...this.models].filter((m):m is MortarSlow=>m.kind==='slow'&&m.enemy===e)
 onQueue:(m:MortarModel)=>void=()=>{}
 onRemove:(m:MortarModel)=>void=()=>{}
 onParticle:(name:string,source:MortarBullet,time:number)=>void=()=>{}
 onSound:(name:string,options?:{delay?:number})=>void=()=>{}
 onCreateDamage:()=>number|undefined=()=>undefined
 onDamage:(e:EnemyInstance,value:number,type:number,order:number|undefined)=>void=()=>{}
 private queue<T extends MortarModel>(m:T){this.onQueue(m);m.id=this.id(m)!;return m}
 private removeLater(m:MortarModel){if(!m.pending){m.pending=true;this.onRemove(m)}}
 crater(pos:Point){return this.queue<MortarVisual>({kind:'crater',name:'decal_bolin_crater',id:0,pos:{...pos},spriteAt:0,animation:'bolin_mine_decal_animations',loop:true,phase:'wait',alpha:255,tweenDisabled:false,reverse:false,pending:false})}
 fire(h:HeroUnit,a:MortarAttack,points:Point[],flight:number){
  this.onSound(a.sound);this.onSound(a.sound_hit,{delay:flight})
  for(let i=0;i<a.bullet_count;i++){
   const from={x:h.pos.x+(h.facingLeft?-1:1)*a.bullet_start_offset.x,y:h.pos.y+a.bullet_start_offset.y}
   this.queue<MortarBullet>({kind:'bullet',name:a.bullet,id:0,pos:{...from},from,to:{...(points[i]??points[0])},sourceId:this.id(h),flight:flight+(i+1-1)*.18,speed:{x:0,y:0},started:false,phase:'fly',spriteAt:0,rotation:0,z:3000,min:a.damage_min,max:a.damage_max,pending:false})
  }
  const skill=(h.template.hero as unknown as {skills:{skill_a:{level:number;xp_gain:number[]}}}).skills.skill_a;h.xpQueued+=skill.xp_gain[skill.level-1]
 }
 insert(m:MortarModel,time:number){
  const c=this.config(m.name)
  if(m.kind==='slow'){
   for(const old of this.slows(m.enemy)){if(old.level<m.level){this.removeLater(old);continue}if(old.level===m.level)old.at=time;return false}
   if(!this.present(m.enemy)||enemyIsDead(m.enemy)||m.enemy.template.motion.invulnerable)return false
   m.factor=c.slow.factor;m.enemy.template.motion.max_speed*=m.factor;m.at=time;m.inserted=true
  }
  if(m.kind==='bullet'){m.at=time;m.speed={x:(m.to.x-m.from.x)/m.flight,y:(m.to.y-m.from.y-.5*c.bullet.g*m.flight*m.flight)/m.flight};m.rotation=0}
  if(m.kind==='area'){m.at=time;m.duration=c.aura.duration+m.level*(c.aura.duration_inc??0)}
  this.models.add(m);return true
 }
 advance(m:MortarModel,time:number){
  if(m.pending)return;const c=this.config(m.name)
  if(m.kind==='bullet'){
   if(!m.started){m.started=true;this.trails.queue(m,time,'bolinMortar');this.onParticle(c.bullet.particles_name,m,time);return}
   if(m.phase==='fly'){
    const t=time-m.at!;m.pos.x=m.speed.x*t+m.from.x;m.pos.y=c.bullet.g*t*t/2+m.speed.y*t+m.from.y
    m.rotation+=c.bullet.rotation_speed*(m.from.x<m.to.x?-1:1)/30
    if(1/6<t)m.z=3400
    if(t+1/30<m.flight)return
    this.queue<MortarArea>({kind:'area',name:c.bullet.payload,id:0,pos:{...m.to},sourceId:m.sourceId,level:0,at:0,duration:0,pending:false})
    this.queue<MortarVisual>({kind:'smoke',name:c.bullet.hit_fx,id:0,pos:{...m.to},spriteAt:0,animation:'start',loop:false,phase:'in',alpha:255,tweenDisabled:true,reverse:false,pending:false})
    this.queue<MortarVisual>({kind:'crater',name:c.bullet.hit_decal,id:0,pos:{...m.pos},spriteAt:time,animation:'bolin_mine_decal_animations',loop:true,phase:'wait',alpha:255,tweenDisabled:false,reverse:false,pending:false})
    this.trails.stop(m.id)
    for(const e of this.enemies())if(!enemyIsDead(e)&&!(e.template.vis.flags&c.bullet.damage_bans)&&!(e.template.vis.bans&c.bullet.damage_flags)&&(e.path.position.x-m.to.x)**2+(e.path.position.y-m.to.y)**2/(.7*.7)<=c.bullet.damage_radius*c.bullet.damage_radius){const order=this.onCreateDamage(),value=m.min+Math.floor(this.random()*(m.max-m.min+1));this.onDamage(e,value,c.bullet.damage_type,order)}
    m.phase='explode';m.rotation=0;m.z=3000;m.spriteAt=time;return
   }
   if(nativeLogicAnimationFrame(data.bulletExitFrames,time,m.spriteAt,false,30).runs>0)this.removeLater(m);return
  }
  if(m.kind==='area'){
   m.last??=time-c.aura.cycle_time
   if(m.duration<time-m.at){this.removeLater(m);return}
   if(time-m.last<c.aura.cycle_time)return;m.last=time
   for(const e of this.enemies())if(!enemyIsDead(e)&&!(e.template.vis.flags&c.aura.vis_bans)&&!(e.template.vis.bans&c.aura.vis_flags)&&(e.path.position.x-m.pos.x)**2+(e.path.position.y-m.pos.y)**2/(.7*.7)<=c.aura.radius*c.aura.radius)this.queue<MortarSlow>({kind:'slow',name:c.aura.mod,id:0,pos:{x:0,y:0},enemy:e,targetId:this.id(e),sourceId:m.id,level:m.level,at:0,started:false,inserted:false,factor:0,pending:false})
   return
  }
  if(m.kind==='slow'){
   if(!m.started){m.started=true;m.at=time;m.pos=m.enemy.path.position}
   if(!this.present(m.enemy)||enemyIsDead(m.enemy)||c.modifier.duration<time-m.at)this.removeLater(m);return
  }
  if(m.phase==='fade')return
  if(m.at===undefined){m.at=time;if(m.kind==='smoke')m.spriteAt=time}
  if(m.kind==='crater'){if(time-m.at>=c.wait_time)this.removeLater(m);return}
  if(m.phase==='in'&&nativeLogicAnimationFrame(data.smokeFrames.start,time,m.spriteAt,false,30).runs>0){m.phase='loop';m.spriteAt=time;m.animation='loop';m.loop=true;m.waitAt=time}
  if(m.phase==='loop'&&time-m.waitAt!>=c.loop_time)this.removeLater(m)
 }
 tween(m:MortarModel,time:number){
  if(m.kind!=='smoke'&&m.kind!=='crater'||m.tweenDisabled||m.pending)return
  const duration=this.config(m.name).tween.props[0].keys[1][0],age=time-(m.tweenAt??m.spriteAt)
  m.alpha=255*Math.max(0,Math.min(1,m.reverse?1-age/duration:age/duration))
  if(age>=duration){if(m.reverse)this.removeLater(m);else m.tweenDisabled=true}
 }
 remove(m:MortarModel,time:number){
  if((m.kind==='smoke'||m.kind==='crater')&&m.tweenDisabled){m.reverse=true;m.tweenDisabled=false;m.tweenAt=time;m.phase='fade';m.pending=false;return false}
  if(m.kind==='slow'&&m.inserted&&this.present(m.enemy)){m.enemy.template.motion.max_speed/=m.factor;m.inserted=false}
  this.models.delete(m);return true
 }
 particleSources(){return [...this.models].filter((m):m is MortarBullet=>m.kind==='bullet').map(m=>({id:m.id,pos:m.pos,rotation:m.rotation}))}
}
