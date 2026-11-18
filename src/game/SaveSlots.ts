import {mergeSavedProgress} from './SaveMerge.ts'
import {PROGRESS_KEY,parseProgress,migrateUsedOnboarding} from './ProgressStore.ts'
import type {Progress} from './ProgressStore'
export const ACTIVE_SLOT_KEY='kingdom-rush-6.active-slot.v1'
export const SLOT_MIGRATION_KEY='kingdom-rush-6.slots-migrated.v1'
export const slotBackupKey=(index:number)=>`kingdom-rush-6.slot.${index}.backup.v1`
export const slotKey=(index:number)=>`kingdom-rush-6.slot.${index}.v1`
type SlotStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>
function validIndex(index:number){if(!Number.isInteger(index)||index<1||index>3)throw new Error('无效存档位置')}
function validProgress(value:unknown):value is Progress{return !!value&&typeof value==='object'&&'levels'in value&&!!value.levels&&typeof value.levels==='object'&&!Array.isArray(value.levels)}
/** Three native local slots; the old progress key remains an active-slot compatibility mirror. */
export class SaveSlots {
 active=1
 private baseline?:Progress
 private storage:SlotStorage
 constructor(storage:SlotStorage){
  this.storage=storage
  const index=Number(storage.getItem(ACTIVE_SLOT_KEY));if(Number.isInteger(index)&&index>=1&&index<=3)this.active=index
  if(storage.getItem(SLOT_MIGRATION_KEY)!=='1'){
   let legacy:unknown;try{legacy=JSON.parse(storage.getItem(PROGRESS_KEY)??'null')}catch{}
   if(validProgress(legacy)&&!this.read(1))this.write(1,parseProgress(JSON.stringify(legacy)))
   storage.setItem(SLOT_MIGRATION_KEY,'1')
  }else if(![1,2,3].some(i=>this.read(i))){
   let legacy:unknown;try{legacy=JSON.parse(storage.getItem(PROGRESS_KEY)??'null')}catch{}
   if(validProgress(legacy))this.write(this.active,parseProgress(JSON.stringify(legacy)))
  }
 }
 read(index:number):Progress|undefined{
  validIndex(index)
  for(const key of [slotKey(index),slotBackupKey(index)])try{const value=JSON.parse(this.storage.getItem(key)??'null');if(value?.version===1&&validProgress(value.progress))return parseProgress(JSON.stringify(value.progress))}catch{}
 }
 list(){return [1,2,3].map(index=>({index,progress:this.read(index)}))}
 loadActive(){this.baseline=this.read(this.active);return this.baseline}
 private write(index:number,progress:Progress){const value=JSON.stringify({version:1,progress});this.storage.setItem(slotBackupKey(index),value);this.storage.setItem(slotKey(index),value)}
 select(index:number){validIndex(index);const existing=this.read(index),progress=existing?migrateUsedOnboarding(existing):{levels:{},onboarding:{}}
  this.write(index,progress);this.storage.setItem(ACTIVE_SLOT_KEY,String(index));this.active=index;this.baseline=progress;this.storage.setItem(PROGRESS_KEY,JSON.stringify(progress))
  return {progress,index,fresh:!existing,next:existing?'map' as const:'game' as const}
 }
 saveActive(progress:Progress){const next=mergeSavedProgress(this.read(this.active),progress,this.baseline);this.write(this.active,next);this.storage.setItem(PROGRESS_KEY,JSON.stringify(next));this.baseline=next;return next}
 delete(index:number){validIndex(index);this.storage.removeItem(slotKey(index));this.storage.removeItem(slotBackupKey(index));if(index===this.active)this.storage.removeItem(PROGRESS_KEY)}
}
