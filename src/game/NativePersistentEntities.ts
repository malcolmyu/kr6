import {LuaEntityTable} from './LuaEntityTable.ts'

export interface PersistentEntity {
 id:number;template_name?:string;main_script?:unknown;enemy?:unknown;health?:unknown;death_spawns?:unknown
 spawner?:{eternal?:unknown};picked_enemies?:unknown;tunnel?:unknown;graveyard?:unknown;modifier?:unknown;tower?:unknown
}
type ListName='alive_enemies'|'graveyards'|'modifiers'|'towers'
const truthy=(v:unknown)=>v!==undefined&&v!==null&&v!==false

/** systems.sso_post541–583 persistent indexes. Their Lua tables retain deleted
 * key slots; removal writes nil even when an entity never belonged to a list.
 * This is separate from the per-tick spatial grid built by systems.sso499. */
export class NativePersistentEntities<T extends PersistentEntity> {
 readonly lists=new Map<ListName,LuaEntityTable<T>>()
 constructor(){this.reset()}
 get(name:ListName){let list=this.lists.get(name);if(!list){list=new LuaEntityTable<T>();this.lists.set(name,list)}return list}
 reset(){this.lists.clear();for(const name of ['alive_enemies','graveyards','modifiers','towers'] as const)this.lists.set(name,new LuaEntityTable<T>())}
 insert(entity:T,isKr3=false){
  if(truthy(entity.main_script)&&(
   truthy(entity.enemy)&&truthy(entity.health)||truthy(entity.enemy)&&truthy(entity.death_spawns)||
   truthy(entity.spawner)&&!truthy(entity.spawner!.eternal)||truthy(entity.picked_enemies)||truthy(entity.tunnel)||
   isKr3&&entity.template_name==='nav_faerie'
  ))this.get('alive_enemies').set(entity.id,entity)
  if(truthy(entity.graveyard))this.get('graveyards').set(entity.id,entity)
  if(truthy(entity.modifier))this.get('modifiers').set(entity.id,entity)
  if(truthy(entity.tower))this.get('towers').set(entity.id,entity)
  return true
 }
 remove(entity:T){
  if(truthy(entity.main_script))this.get('alive_enemies').delete(entity.id)
  if(truthy(entity.graveyard))this.get('graveyards').delete(entity.id)
  if(truthy(entity.modifier))this.get('modifiers').delete(entity.id)
  if(truthy(entity.tower))this.get('towers').delete(entity.id)
  return true
 }
}
