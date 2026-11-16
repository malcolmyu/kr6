import data from '../../public/data/zefira-hammer.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {stunEnemy} from './EnemyModifiers.ts'
import type {ZefiraSkills,ZefiraCast} from './ZefiraSkills'
import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Stun {kind:'stun';key:string;enemy:EnemyInstance;pos:Point;ts:number;spriteTs:number;name:string;started?:boolean;applied?:boolean;queued?:boolean}
interface Decal {kind:'decal';key:string;pos:Point;at:number;ts:number;started?:number;name:'idle'|'out';queued?:boolean}
export type HammerModel=Stun|Decal
/** SU single area attack1707, mod_stun4679/4729/4790, decal1592. */
export class ZefiraHammerRuntime {
 readonly stuns=new Map<EnemyInstance,Stun>()
 readonly decals:Decal[]=[]
 selectionTargets:(hero:HeroUnit)=>EnemyInstance[]=()=>[]
 hitTargets:(pos:Point)=>EnemyInstance[]=()=>[]
 present:(enemy:EnemyInstance)=>boolean=()=>true
 onQueue:(name:string,model:HammerModel)=>void=()=>{}
 onRemove:(model:HammerModel)=>void=()=>{}
 onCreateDamage:()=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onStopSound:(name:string)=>void=()=>{}
 private owner:ZefiraSkills
 private random:()=>number
 private lastA=0
 private serial=1
 constructor(owner:ZefiraSkills,random:()=>number){this.owner=owner;this.random=random}
 tryStart(hero:HeroUnit,time:number){
  const o=this.owner,a=data.attack
  if(!o.levelA||o.cast||hero.attack||hero.scriptLocked||hero.rangedUntil!==undefined||time-this.lastA<=o.cooldownA)return false
  if(hero.target&&((hero.target.template.vis.bans&a.vis_flags)||(hero.target.template.vis.flags&a.vis_bans)))return false
  this.random()
  if(this.selectionTargets(hero).length<a.min_count)return false
  o.cast={hero,at:time,flip:hero.facingLeft,hit:false};hero.scriptLocked=true;hero.visualOverride={name:a.animation,at:time};hero.xpQueued+=[0,12,24,36][o.levelA];o.onSound(a.sound);return true
 }
 advanceCast(time:number){
  const c=this.owner.cast;if(!c)return
  const a=data.attack,h=c.hero,interrupted=h.hp<=0||h.template.unit?.is_stunned||!h.scriptLocked||h.visualOverride?.name!==a.animation
  if(!c.hit&&time-c.at<a.hit_time){if(interrupted)this.finish(c);return}
  if(!c.hit){
   c.hit=true;this.lastA=c.at;const pos={x:h.pos.x+(c.flip?-a.hit_offset.x:a.hit_offset.x),y:h.pos.y+a.hit_offset.y}
   for(const enemy of this.hitTargets(pos)){
    this.onCreateDamage();this.onDamage(enemy,[0,20,50,80][this.owner.levelA]+Math.floor(this.random()*21))
    this.onQueue(a.mod,{kind:'stun',key:`native-hammer-stun-${this.serial++}`,enemy,pos:{x:0,y:0},ts:time,spriteTs:0,name:data.mod_zefira_skill_a_stun.render.sprites[0].name})
   }
   this.onEffect(a.hit_fx,{...pos},time)
   this.onQueue(a.hit_decal,{kind:'decal',key:`native-hammer-decal-${this.serial++}`,pos:{...pos},at:time,ts:time,name:'idle'})
  }
  if(interrupted||nativeLogicAnimationFrame(46,time,c.at,false,30).runs>0)this.finish(c)
 }
 private finish(c:ZefiraCast){const h=c.hero;if(h.visualOverride?.name===data.attack.animation){h.visualOverride=undefined;h.scriptLocked=false;h.idleVisual={name:data.attack.animation,at:c.at,loop:false}}this.owner.cast=undefined;this.onStopSound(data.attack.sound)}
 insert(m:HammerModel,time:number){
  if(m.kind==='decal'){this.decals.push(m);return true}
  const previous=this.stuns.get(m.enemy);if(previous){previous.ts=time;return false}
  const d=data.mod_zefira_skill_a_stun.modifier,e=m.enemy
  if(!this.present(e)||e.hp<=0||(e.template.vis.bans&d.vis_flags)||(e.template.vis.flags&d.vis_bans))return false
  m.ts=m.spriteTs=time;m.applied=true;stunEnemy(e,1);this.stuns.set(e,m);return true
 }
 advance(m:HammerModel,time:number){
  if(m.queued)return
  if(m.kind==='stun'){
   if(!m.started){m.started=true;if(!this.present(m.enemy)){m.queued=true;this.onRemove(m);return}m.pos=m.enemy.path.position;m.name='loop'}
   if(time-m.ts>=data.mod_zefira_skill_a_stun.modifier.duration||m.enemy.hp<=0){m.queued=true;this.onRemove(m)}
  }else{
   m.started??=time
   if(m.name==='idle'&&time-m.started>=data.decal_zefira_skill_a_hit.duration){m.name='out';m.ts=time}
   if(m.name==='out'&&nativeLogicAnimationFrame(21,time,m.ts,false,30).runs>0){m.queued=true;this.onRemove(m)}
  }
 }
 remove(m:HammerModel){if(m.kind==='stun'){if(m.applied&&this.present(m.enemy))stunEnemy(m.enemy,-1);if(this.stuns.get(m.enemy)===m)this.stuns.delete(m.enemy)}else{const i=this.decals.indexOf(m);if(i>=0)this.decals.splice(i,1)}return true}
}
