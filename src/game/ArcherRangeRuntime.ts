import type {ArcherRangeSystem,ArcherRangeBuff,ArcherRangeEagle,ArcherRangePreview} from './ArcherRange'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
export interface NativeRangeBuff extends ArcherRangeBuff {kind:'buff';sourceId?:number;targetId?:number;lastTargetId?:number;pos:Point;offset:Point;inserted:boolean;applied:boolean;appliedId?:number;started:boolean;queued:boolean;alpha:number}
export interface NativeRangeEagle extends ArcherRangeEagle {kind:'eagle';pos:Point;inserted:boolean}
export interface NativeRangePreview extends ArcherRangePreview {kind:'preview';pos:Point;inserted:boolean;alpha:number}
export type NativeRangeModel=NativeRangeBuff|NativeRangeEagle|NativeRangePreview
/** mod_lifecycle + mod_tower_factors5256/5303/5282; eagle19277 and plain preview. */
export class ArcherRangeRuntime {
 readonly models=new Set<NativeRangeModel>()
 id:(site:TowerSite)=>number|undefined=()=>undefined
 present:(id:number|undefined)=>boolean=()=>true
 candidates:(target:TowerSite)=>NativeRangeBuff[]=target=>[...this.models].filter((m):m is NativeRangeBuff=>m.kind==='buff'&&m.target===target)
 onQueue:(name:string,model:NativeRangeModel)=>void=()=>{}
 onRemove:(model:NativeRangeModel)=>void=()=>{}
 private owner:ArcherRangeSystem
 constructor(owner:ArcherRangeSystem){this.owner=owner}
 queueBuff(p:{source:TowerSite;target:TowerSite;sourceInstance:number;targetInstance:number;level:number;factor:number;queued:number}){
  const m:NativeRangeBuff={...p,kind:'buff',sourceId:this.id(p.source),targetId:this.id(p.target),pos:{x:0,y:0},offset:this.owner.offset(p.target),at:0,spriteAt:0,tweenAt:p.queued,inserted:false,applied:false,started:false,queued:false,alpha:255}
  this.onQueue('mod_archers_skill_b_range',m);return m
 }
 queueEagle(e:ArcherRangeEagle){const m=Object.assign(e,{kind:'eagle' as const,pos:e.source.pos,inserted:false});this.onQueue('decal_archers_skill_b_eagle',m)}
 queuePreview(p:ArcherRangePreview){const m=Object.assign(p,{kind:'preview' as const,pos:p.target.pos,inserted:false,alpha:255});this.onQueue('decal_archers_skill_b_preview',m)}
 insert(m:NativeRangeModel,time:number){
  if(m.kind==='buff'){
   m.at=m.spriteAt=time
   for(const old of this.candidates(m.target)){
    if(old.level<m.level){this.removeLater(old);m.spriteAt=old.spriteAt}
    else{if(old.level===m.level)old.at=time;return false}
   }
   if(!this.present(m.targetId))return false
   if(this.id(m.target)===m.targetId&&m.target.tower){m.target.rangeFactor=(m.target.rangeFactor??1)*m.factor;m.appliedId=m.targetId}m.applied=true
   this.owner.buffs.set(m.target.id,m)
  }else if(m.kind==='preview')m.at=m.queued
  m.inserted=true;this.models.add(m);return true
 }
 advance(m:NativeRangeModel,time:number){
  if(m.kind==='buff'){
   if(m.queued)return
   if(!m.started){m.started=true;m.lastTargetId=m.targetId;if(this.present(m.targetId))m.pos=m.target.pos;m.at=m.tweenAt=time}
   // Tower upgrade transfers target_id; the new tower starts with its own base range.
   if(m.targetId!==m.lastTargetId&&this.present(m.targetId)){m.lastTargetId=m.targetId;m.target.rangeFactor=(m.target.rangeFactor??1)*m.factor;m.appliedId=m.targetId}
  }else if(m.kind==='eagle'){
   m.started??=time
   const age=time-m.started;m.draw=age>130/30?-1:age>90/30?10:age>60/30?-1:age>12/30?10:-1
  }
 }
 tween(m:NativeRangeModel,time:number){if(m.kind==='buff')m.alpha=Math.max(0,Math.min(255,(time-m.tweenAt)/.5*255));else if(m.kind==='preview')m.alpha=Math.max(0,Math.min(255,(time-m.queued)/.5*255))}
 removeLater(m:NativeRangeModel){if(m.kind==='buff'){if(m.queued)return;m.queued=true}this.onRemove(m)}
 remove(m:NativeRangeModel){
  if(m.kind==='buff'){
   if(m.applied&&m.appliedId===this.id(m.target)&&this.present(m.appliedId))m.target.rangeFactor=(m.target.rangeFactor??1)/m.factor
   if(this.owner.buffs.get(m.target.id)===m)this.owner.buffs.delete(m.target.id)
   m.applied=false;m.appliedId=undefined
  }else{const list=m.kind==='eagle'?this.owner.eagles:this.owner.previews,index=list.indexOf(m as never);if(index>=0)list.splice(index,1)}
  m.inserted=false;this.models.delete(m);return true
 }
 removeSource(site:TowerSite,sourceId:number|undefined){
  // Tower.remove queues its last eagle, then source-owned modifiers in SSO order.
  const eagle=[...this.owner.eagles].reverse().find(e=>e.source===site)
  if(eagle)this.onRemove(eagle as NativeRangeEagle)
  for(const m of this.candidatesForSource(sourceId))this.removeLater(m)
  for(const p of this.owner.states.get(site.id)?.preview??[])this.onRemove(p as NativeRangePreview)
  this.owner.states.delete(site.id)
 }
 candidatesForSource:(id:number|undefined)=>NativeRangeBuff[]=id=>[...this.models].filter((m):m is NativeRangeBuff=>m.kind==='buff'&&m.sourceId===id)
 retarget(site:TowerSite,id:number,previousId=this.id(site)){
  for(const m of this.models)if(m.kind==='buff'&&m.target===site&&m.targetId===previousId){if(m.appliedId!==undefined)m.target.rangeFactor=(m.target.rangeFactor??1)/m.factor;m.appliedId=undefined;m.targetId=id}
 }
}
