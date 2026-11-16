import {LuaEntityTable} from './LuaEntityTable.ts'
import rawDefaults from '../../public/data/scene-entities.json' with {type:'json'}
import {NativeEntityRegistry} from './NativeEntityRegistry.ts'
import {NativePersistentEntities} from './NativePersistentEntities.ts'
import {bootstrapLevelEntities,createLevelEntity} from './LevelEntityBootstrap.ts'
import {insertLevelEntity} from './LevelEntityInsertion.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {BootstrapEntity,BootstrapTemplateDefaults} from './LevelEntityBootstrap'
import type {TowerSite} from './TowerSystem'
import type {LevelData,GameMode} from './types'

const defaults=rawDefaults as unknown as Record<string,BootstrapTemplateDefaults>
export interface RuntimeEntityEvent {tick:number;kind:string;id:number;template:string;holder?:string}
type Binding={kind:'archerMark'|'copyBounce'|'copyAura'|'firebookBurn'|'enemyTeleport'|'heroLife'|'enemyArrow'|'enemyArrowEffect'|'zefiraHammer'|'geraldModifier'|'zefiraShield'|'smoke'|'royal'|'rainControl'|'meteor'|'particle'|'reinforcementControl'|'archerShooter'|'ambient'|'fishing'|'tower'|'enemy'|'soldier'|'hero'|'heroProjectile'|'projectile'|'pop'|'scene';model:object}
/** Actual normal-session allocation/queue owner. Unported script families
 * still need their callbacks wired here; events expose those gaps rather
 * than reading a native trace to guess missing IDs. */
export class RuntimeEntities {
 readonly registry:NativeEntityRegistry<BootstrapEntity>
 readonly persistent=new NativePersistentEntities<BootstrapEntity>()
 readonly events:RuntimeEntityEvent[]=[]
 onModelInsert:(model:object,kind:string)=>boolean|void=()=>{}
 onTowerInsert:(template:string)=>void=()=>{}
 onTowerReplace:(site:TowerSite,id:number)=>void=()=>{}
 onModelRemove:(model:object,kind:string,template:string)=>boolean|void=()=>{}
 private bindings=new Map<BootstrapEntity,Binding>()
 private byModel=new WeakMap<object,BootstrapEntity>()
 private tweens=new WeakMap<object,(time:number)=>void>()
 private jobs:{tick:number;site:TowerSite;run:()=>void}[]=[]
 private timed=new WeakMap<BootstrapEntity,{ts:number;frames?:number;duration?:number;runs?:number;fps:number}>()
 constructor(level:LevelData,stage:number,mode:GameMode,team:string[],campaignComplete:boolean,sites:TowerSite[],restarted=false,skipCutscenes=false){
  this.registry=new NativeEntityRegistry(1,{
   onQueue:(e,inserting)=>this.record(inserting?'queueInsert':'queueRemove',e),
   onInsert:e=>{
    if(!insertLevelEntity(this.registry,e,defaults)){this.record('insertRejected',e);return false}
    const binding=this.bindings.get(e);if(binding&&this.onModelInsert(binding.model,binding.kind)===false){this.record('insertRejected',e);return false}
    this.persistent.insert(e);this.record('insert',e)
    if(e.holderId){const site=sites.find(s=>s.id===e.holderId);if(site){this.bind(e,site,'tower');this.onTowerInsert(e.template)}}
    return true
   },
   onRemove:e=>{const b=this.bindings.get(e);if(b&&this.onModelRemove(b.model,b.kind,e.template)===false){e.pending_removal=false;this.record('removeRejected',e);return false}this.persistent.remove(e);this.record('remove',e);return true},
  })
  const create=this.registry.create.bind(this.registry)
  this.registry.create=factory=>{const e=create(factory);this.record('create',e);return e}
  const data=level.data as LevelData['data']&{level_mode_overrides?:Record<number,{entities_list?:Parameters<typeof bootstrapLevelEntities>[1]}>}
  bootstrapLevelEntities(this.registry,data.level_mode_overrides?.[mode==='campaign'?1:3]?.entities_list??data.entities_list as Parameters<typeof bootstrapLevelEntities>[1],defaults,{stage,mode:mode==='campaign'?1:3,team,campaignComplete,restarted,skipCutscenes})
 }
 private record(kind:string,e:BootstrapEntity){this.events.push({tick:this.registry.tick,kind,id:e.id,template:e.template,...(e.holderId?{holder:e.holderId}:{})})}
 bind(entity:BootstrapEntity,model:object,kind:Binding['kind']){this.bindings.set(entity,{kind,model});this.byModel.set(model,entity)}
 entity(model:object){return this.byModel.get(model)}
 /** mod_lifecycle filters the persistent table into a fresh Lua table before
  * iterating it; retaining all target modifiers preserves that table order. */
 *modifiersFor(target:object):Generator<Binding>{
  const filtered=new LuaEntityTable<Binding>()
  for(const entity of this.persistent.get('modifiers').values()){
   const binding=this.bindings.get(entity),model=binding?.model as {enemy?:object;target?:object}|undefined
   if(binding&&model&&(model.enemy===target||model.target===target))filtered.set(entity.id,binding)
  }
  yield*filtered.values()
 }
 bindInitial(model:object,name:string,kind:Binding['kind']){
  const entity=this.registry.pendingInserts.find(e=>e.template===name&&!this.bindings.has(e))
  if(entity)this.bind(entity,model,kind)
 }
 allocate(template:string,holderId?:string){return createLevelEntity(this.registry,defaults,template,holderId?{holderId}:{})}
 rebind(from:object,to:object,kind:Binding['kind']='scene'){const e=this.entity(from);if(e)this.bind(e,to,kind)}
 queue(template:string,model?:object,kind:Binding['kind']='scene',holderId?:string){
  const e=this.allocate(template,holderId)
  if(model)this.bind(e,model,kind)
  this.registry.queueInsert(e);if(defaults[template]?.timed)this.timed.set(e,{ts:this.registry.time,...defaults[template].timed!});return e
 }
 remove(model:object){this.registry.queueRemove(this.entity(model))}
 beginTick(){this.registry.beginTick()}
 /** GUI flags and construction completion are consumed by tower_upgrade18. */
 scheduleTower(site:TowerSite,name:string,tick:number,dust=false,afterReplace?:()=>void,onDust?:()=>void,beforeReplace?:()=>void){
  this.jobs.push({tick,site,run:()=>{
   beforeReplace?.()
   const old=this.entity(site),replacement=this.queue(name,undefined,'tower',site.id)
   // Binding switches on insertion; the original source remains in this tick's table.
   if(old)this.registry.queueRemove(old)
   this.onTowerReplace(site,replacement.id)
   afterReplace?.()
   if(dust){if(onDust)onDust();else this.queue('fx_tower_buy_dust')}
  }})
 }
 towerPhase(){
  const ranks=new Map([...this.registry.entities.values()].map((entity,index)=>[entity.id,index]))
  this.jobs.sort((a,b)=>(ranks.get(this.entity(a.site)?.id??-1)??Infinity)-(ranks.get(this.entity(b.site)?.id??-1)??Infinity))
  for(let i=0;i<this.jobs.length;){const job=this.jobs[i];if(job.tick>this.registry.tick){i++;continue}this.jobs.splice(i,1);job.run()}
 }
 timedPhase(){
  for(const entity of this.registry.entities.values()){
   const t=this.timed.get(entity);if(!t)continue
   if(t.frames!==undefined&&nativeLogicAnimationFrame(t.frames,this.registry.time,t.ts,false,t.fps).runs===(t.runs??1)||t.duration!==undefined&&this.registry.time-t.ts>t.duration){this.registry.queueRemove(entity);this.timed.delete(entity)}
  }
 }
 setTween(model:object,update:(time:number)=>void){this.tweens.set(model,update)}
 tweenPhase(){for(const entity of this.registry.entities.values()){const b=this.bindings.get(entity);if(b)this.tweens.get(b.model)?.(this.registry.time)}}
 *bindingsInOrder(kind?:Binding['kind']):Generator<Binding>{
  for(const entity of this.registry.entities.values()){const binding=this.bindings.get(entity);if(binding&&(!kind||binding.kind===kind))yield binding}
 }
 *mainBindings():Generator<Binding>{
  for(const entity of this.registry.entities.values()){
   if(!entity.main_script)continue
   const binding=this.bindings.get(entity);if(!binding)continue
   if(binding.kind==='tower'){
    const site=binding.model as TowerSite
    if(site.tower!==entity.template)continue
   }
   yield binding
  }
 }
}
