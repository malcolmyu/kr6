import {NativeEntityRegistry} from './NativeEntityRegistry.ts'
import type {PersistentEntity} from './NativePersistentEntities'

export interface BootstrapEntity extends PersistentEntity {id:number;template:string;pending_removal?:boolean;mapIndex?:number;holderId?:string;controllerT?:string}
interface MapEntity {template:string;'editor.game_mode'?:number;'tower.holder_id'?:string;editor?:{game_mode?:number}}
export interface BootstrapTemplateDefaults {timed?:{frames?:number;duration?:number;runs?:number;fps:number};hasEditor:boolean;gameMode?:number;controllerT?:string;indexComponents?:Omit<PersistentEntity,'id'>}
interface BootstrapOptions {stage:number;mode:number;team:string[];campaignComplete:boolean;restarted?:boolean;skipCutscenes?:boolean;debug?:boolean}

export function createLevelEntity(registry:NativeEntityRegistry<BootstrapEntity>,defaults:Record<string,BootstrapTemplateDefaults>,template:string,fields:Partial<BootstrapEntity>={}){
 return registry.create(id=>({id,template,template_name:template,...defaults[template]?.indexComponents,...(defaults[template]?.controllerT?{controllerT:defaults[template].controllerT}:{}),...fields}))
}

/** Allocation/queue portion of systems.level.init76, LU.insert_entities293,
 * level01.init/load and level02.init/load. Descriptors preserve native IDs for
 * scene objects, including unqueued mode-filtered objects. This is the prefix
 * before the first simulation insertion flush, not a full entity controller. */
export function bootstrapLevelEntities(
 registry:NativeEntityRegistry<BootstrapEntity>,items:MapEntity[],defaults:Record<string,BootstrapTemplateDefaults>,options:BootstrapOptions,
){
 if(registry.nextId!==1||registry.count||registry.pendingInserts.length||registry.pendingRemovals.length)throw new Error('Level bootstrap requires a fresh native registry')
 const create=(template:string,fields:Partial<BootstrapEntity>={})=>createLevelEntity(registry,defaults,template,fields)
 const insert=(template:string)=>{const entity=create(template);registry.queueInsert(entity);return entity}
 const mapEntities:BootstrapEntity[]=[]
 for(const [index,item]of items.entries()){
  if(item.template==='debug_path_renderer'&&!options.debug)continue
  const entity=create(item.template,{mapIndex:index+1,...(item['tower.holder_id']===undefined?{}:{holderId:item['tower.holder_id']})})
  mapEntities.push(entity)
  const base=defaults[item.template];if(!base)throw new Error(`Missing original bootstrap template ${item.template}`)
  const hasEditor=base.hasEditor||item.editor!==undefined||Object.keys(item).some(key=>key.startsWith('editor.'))
  const gameMode=item['editor.game_mode']??item.editor?.game_mode??base.gameMode
  if(hasEditor&&gameMode!==0&&gameMode!==options.mode)continue
  registry.queueInsert(entity)
 }
 const campaign=options.mode===1
 const firstVisit=campaign&&!options.campaignComplete
 const manualHeroInsertion=options.stage===1?firstVisit:options.stage===2&&firstVisit&&!options.restarted&&!options.skipCutscenes&&options.team.slice(0,2).includes('hero_zefira')
 if(options.stage===1&&firstVisit)insert('controller_tower_knights_tutorial')
 if(options.stage===2&&manualHeroInsertion){
  const first=options.team[0]==='hero_zefira'?(options.team[1]??options.team[0]):options.team[0]
  insert(first);insert('enemy_bandit');insert('enemy_blackguard')
 }else if(!manualHeroInsertion){for(const name of options.team)insert(name)}
 return {mapEntities,manualHeroInsertion}
}
