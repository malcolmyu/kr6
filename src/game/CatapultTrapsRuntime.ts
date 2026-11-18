import {enemyIsDead} from './EnemyDeath.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {ArcherPierceStunSystem} from './ArcherPierceStun.ts'
import type {ArcherPierceStun} from './ArcherPierceStun'
import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
interface Config {aura:{radius:number;vis_flags:number;vis_bans:number;mod:string};damage_min_conf:number[];damage_max_conf:number[];damage_type:number;sound_open:string;sound_trigger:string}
export interface NativeCatapultTrap {id:number;pos:Point;level:number;sourceId?:number;ownerId?:number;at:number;spriteAt:number;name:'set'|'ready'|'activate';loop:boolean;runs:number;hit:boolean;hidden:boolean;pending:boolean;started:boolean}
/** Original trap main coroutine, captured active_traps owner and queued mod_stun. */
export class CatapultTrapsRuntime {
 readonly traps=new Set<NativeCatapultTrap>()
 readonly stuns:ArcherPierceStunSystem
 readonly active=new Map<number,NativeCatapultTrap[]>()
 private config:Config
 private durations:number[]
 private random:()=>number
 constructor(templates:Record<string,object>,random:()=>number){
  this.config=templates.aura_catapult_skill_c_trap as Config;this.random=random
  this.durations=(templates.mod_catapult_skill_c_stun as {stun_duration_config:number[]}).stun_duration_config
  this.stuns=new ArcherPierceStunSystem(templates as unknown as ConstructorParameters<typeof ArcherPierceStunSystem>[0],random)
  // This family's lifecycle below handles rank replacement before own insert.
  this.stuns.candidates=()=>[];this.stuns.dead=enemyIsDead
 }
 id:(m:object)=>number|undefined=()=>undefined
 resolveSource:(id:number|undefined)=>TowerSite|undefined=()=>undefined
 candidates:(pos:Point,radius:number)=>EnemyInstance[]=()=>[]
 modifiers:(enemy:EnemyInstance)=>ArcherPierceStun[]=enemy=>this.stuns.stuns.filter(s=>s.enemy===enemy)
 valid:(enemy:EnemyInstance)=>boolean=()=>true
 onQueue:(trap:NativeCatapultTrap)=>void=()=>{}
 onRemove:(trap:NativeCatapultTrap)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 onCreateDamage:()=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number,type:number)=>void=()=>{}
 queue(pos:Point,level:number,sourceId?:number){const t:NativeCatapultTrap={id:0,pos:{...pos},level,sourceId,at:0,spriteAt:0,name:'set',loop:false,runs:0,hit:false,hidden:false,pending:false,started:false};this.onQueue(t);t.id=this.id(t)!;return t}
 insert(t:NativeCatapultTrap,time:number){t.at=t.spriteAt=time;this.traps.add(t);return true}
 count(site:TowerSite){return this.active.get(this.id(site)??-1)?.length??0}
 private targets(t:NativeCatapultTrap){const a=this.config.aura;return this.candidates(t.pos,a.radius).filter(e=>!enemyIsDead(e)&&this.valid(e)&&!(e.template.vis.flags&a.vis_bans)&&!(e.template.vis.bans&a.vis_flags)&&(e.path.position.x-t.pos.x)**2+(e.path.position.y-t.pos.y)**2/(.7*.7)<=a.radius*a.radius)}
 advance(t:NativeCatapultTrap,time:number){
  if(t.pending)return
  if(!t.started){t.started=true;if(this.resolveSource(t.sourceId)){t.ownerId=t.sourceId;const list=this.active.get(t.ownerId!)??[];list.push(t);this.active.set(t.ownerId!,list)}this.onSound(this.config.sound_open)}
  t.runs=nativeLogicAnimationFrame(t.name==='set'?18:t.name==='ready'?1:28,time,t.spriteAt,t.loop,30).runs
  if(t.name==='set'&&t.runs>0){t.name='ready';t.loop=true;t.runs=0}
  if(t.name==='ready'&&this.targets(t).length){t.name='activate';t.spriteAt=time;t.loop=false;t.runs=0}
  if(t.name==='activate'&&!t.hit&&time-t.spriteAt>=12*(1/30)){
   t.hit=true;this.onSound(this.config.sound_trigger)
   for(const enemy of this.targets(t)){
    this.onCreateDamage();const min=this.config.damage_min_conf[t.level-1],max=this.config.damage_max_conf[t.level-1],value=min+Math.floor(this.random()*(max-min+1));this.onDamage(enemy,value,this.config.damage_type)
    const s=this.stuns.queue(this.config.aura.mod,enemy,{sourceId:this.id(t),targetId:this.id(enemy),level:t.level});s.duration=this.durations[t.level-1]
   }
  }
  if(t.hit&&t.runs>0){t.hidden=true;if(t.ownerId!==undefined){const list=this.active.get(t.ownerId),i=list?.indexOf(t)??-1;if(i>=0)list!.splice(i,1)}t.pending=true;this.onRemove(t)}
 }
 insertStun(s:ArcherPierceStun,time:number){
  let inheritedTs:number|undefined
  for(const old of this.modifiers(s.enemy)){if(old.key!==s.key)continue;if((old.level??1)<(s.level??1)){this.stuns.onRemove(old);inheritedTs=old.spriteTs;continue}if(old.level===s.level)old.ts=time;return false}
  const inserted=this.stuns.insert(s,time);if(inserted&&inheritedTs!==undefined)s.spriteTs=inheritedTs;return inserted
 }
 remove(t:NativeCatapultTrap){this.traps.delete(t);return true}
}
