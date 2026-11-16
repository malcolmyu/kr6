import {LuaEntityTable} from './LuaEntityTable.ts'
export interface RegistryEntity {id:number;pending_removal?:boolean}
interface Hooks<T> {onQueue?:(entity:T,inserting:boolean)=>void;onInsert?:(entity:T)=>unknown;onRemove?:(entity:T)=>unknown;onDequeue?:(entity:T,inserting:boolean)=>void}
/** E.create_entity125 and simulation112/139/150/166/186 lifecycle primitives.
 * The caller supplies the original creation/queue events and initial ID state.
 * This does not guess the game's scene bootstrap or replace all controllers. */
export class NativeEntityRegistry<T extends RegistryEntity> {
 readonly entities=new LuaEntityTable<T>()
 readonly pendingInserts:T[]=[]
 readonly pendingRemovals:T[]=[]
 count=0
 max=0
 tick=0
 time=0
 nextId:number
 private hooks:Hooks<T>
 constructor(firstId=1,hooks:Hooks<T>={}){this.nextId=firstId;this.hooks=hooks}
 create(factory:(id:number)=>T):T{return factory(this.nextId++)}
 /** entity_db142 copies first, then assigns the new ID to the SOURCE. The
  * returned copy retains the old ID. Component copying is supplied by the
  * caller, as with create's factory; do not silently fix the shipped behavior. */
 clone(entity:T,copy:(source:T)=>T):T{const result=copy(entity);entity.id=this.nextId++;return result}
 queueInsert(entity:T|undefined){if(!entity)return;this.hooks.onQueue?.(entity,true);entity.pending_removal=undefined;this.pendingInserts.push(entity)}
 queueRemove(entity:T|undefined){if(!entity||entity.pending_removal)return;this.hooks.onQueue?.(entity,false);entity.pending_removal=true;this.pendingRemovals.push(entity)}
 beginTick(){
  this.time=++this.tick*(1/30)
  // Inserts queued by insert hooks join this flush. Inserts queued by remove
  // hooks wait until the next tick, as the first loop has already ended.
  while(this.pendingInserts.length)this.insert(this.pendingInserts.shift()!)
  while(this.pendingRemovals.length)this.remove(this.pendingRemovals.shift()!)
 }
 insert(entity:T){
  const result=this.hooks.onInsert?this.hooks.onInsert(entity):true
  if(result===false||result===undefined||result===null){this.hooks.onDequeue?.(entity,true);return}
  entity.pending_removal=undefined;this.entities.set(entity.id,entity);this.count++;this.max=Math.max(this.max,this.count)
 }
 remove(entity:T){
  const result=this.hooks.onRemove?this.hooks.onRemove(entity):true
  if(result===false||result===undefined||result===null){this.hooks.onDequeue?.(entity,false);return}
  entity.pending_removal=undefined;this.entities.delete(entity.id);this.count--
 }
}
