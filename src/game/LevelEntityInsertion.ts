import type {NativeEntityRegistry} from './NativeEntityRegistry'
import {createLevelEntity} from './LevelEntityBootstrap.ts'
import type {BootstrapEntity,BootstrapTemplateDefaults} from './LevelEntityBootstrap'

/** Allocation and acceptance effects of the first level insertion flush.
 * This handler does not stand in for all native health/render/SSO callbacks.
 * Its entities are registry descriptors, not the running gameplay models. */
export function insertLevelEntity(registry:NativeEntityRegistry<BootstrapEntity>,entity:BootstrapEntity,defaults:Record<string,BootstrapTemplateDefaults>):boolean {
 // scripts.editor_wave_flag.insert6105 records an entrance, then returns false.
 if(entity.template==='editor_wave_flag')return false
 if(entity.template==='controller_tower_knights_tutorial'){
  const holder=[...registry.entities.values()].find(e=>e.holderId==='5')
  if(!holder)throw new Error('Original tutorial holder 5 missing at insertion')
  const tower=createLevelEntity(registry,defaults,'tower_knights_lvl1',{holderId:holder.holderId})
  registry.queueInsert(tower);registry.queueRemove(holder)
 }
 // scripts_game35080 queries already inserted entities. Other chess pieces
 // cannot see a newly queued controller until it is actually inserted.
 if(entity.controllerT&&![...registry.entities.values()].some(e=>e.template===entity.controllerT)){
  registry.queueInsert(createLevelEntity(registry,defaults,entity.controllerT))
 }
 return true
}
