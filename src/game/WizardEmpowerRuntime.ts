import type {WizardEmpowerSystem,EmpowerBuff,EmpowerVisual,EmpowerTarget} from './WizardEmpower'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
export interface NativeEmpowerBuff extends EmpowerBuff {kind:'buff';sourceId?:number;targetId?:number;appliedId?:number;lastTargetId?:number;pos:Point;inserted:boolean;started:boolean;queued:boolean}
export interface NativeEmpowerVisual extends EmpowerVisual {sourceId?:number;targetId?:number;inserted:boolean;queuedRemove:boolean;alpha:number;tweenAt?:number;disabled?:boolean;reverse:boolean;mainDone:boolean}
export type NativeEmpowerModel=NativeEmpowerBuff|NativeEmpowerVisual
/** Original mod_tower_factors, plain FX lifetime and reverse-tween remove494. */
export class WizardEmpowerRuntime {
 readonly models=new Set<NativeEmpowerModel>()
 id:(site:TowerSite)=>number|undefined=()=>undefined
 present:(id:number|undefined)=>boolean=()=>true
 candidates:(id:number|undefined,kind:'buff'|'fx')=>NativeEmpowerModel[]=(id,kind)=>[...this.models].filter(m=>m.kind===kind&&m.targetId===id)
 onQueue:(name:string,model:NativeEmpowerModel)=>void=()=>{}
 onRemove:(model:NativeEmpowerModel)=>void=()=>{}
 private owner:WizardEmpowerSystem
 private serial=1
 constructor(owner:WizardEmpowerSystem){this.owner=owner}
 cast(source:TowerSite,targets:EmpowerTarget[],level:number,factor:number,duration:number,time:number){
  for(const target of targets){
   const common={source,target:target.site,targetInstance:target.instance,level,sourceId:this.id(source),targetId:target.entityId,duration}
   const visual=(kind:'fx'|'decal',dy:number):NativeEmpowerVisual=>({...common,id:this.serial++,kind,queued:time,at:0,spriteAt:kind==='fx'?0:time,pos:{x:target.site.pos.x,y:target.site.pos.y-dy},inserted:false,queuedRemove:false,alpha:255,disabled:false,reverse:false,mainDone:false,...(kind==='decal'?{tweenAt:time}:{})})
   this.onQueue('mod_wizard_skill_b_fx',visual('fx',1))
   this.onQueue('decal_tower_wizard_skill_b',visual('decal',1.01))
   this.onQueue('mod_wizard_skill_b',{...common,kind:'buff',factor,at:0,pos:{x:0,y:0},inserted:false,started:false,queued:false})
  }
 }
 preview(source:TowerSite,target:TowerSite,time:number){
  const m:NativeEmpowerVisual={id:this.serial++,kind:'preview',source,target,targetInstance:target.instance??0,level:0,queued:time,at:time,spriteAt:time,duration:-1,pos:{x:target.pos.x,y:target.pos.y-.1},inserted:false,queuedRemove:false,alpha:255,reverse:false,mainDone:true}
  this.onQueue('decal_tower_wizard_empowerment_preview',m);return m
 }
 insert(m:NativeEmpowerModel,time:number){
  if(m.kind==='buff'||m.kind==='fx'){
   m.at=time;if(m.kind==='fx')m.spriteAt=time
   for(const old of this.candidates(m.targetId,m.kind)){
    if(old.level<m.level){this.removeLater(old);if(m.kind==='fx')m.spriteAt=(old as NativeEmpowerVisual).spriteAt}
    else{if(old.level===m.level)old.at=time;return false}
   }
   if(m.kind==='buff'){
    if(!this.present(m.targetId))return false
    if(this.id(m.target)===m.targetId&&m.target.tower){m.target.damageFactor=(m.target.damageFactor??1)*m.factor;m.appliedId=m.targetId}
    this.owner.buffs.set(m.target.id,m)
   }
  }
  m.inserted=true;this.models.add(m)
  if(m.kind!=='buff')this.owner.visuals.push(m)
  return true
 }
 advance(m:NativeEmpowerModel,time:number){
  if(m.kind==='buff'){
   if(m.queued)return
   if(!m.started){m.started=true;m.lastTargetId=m.targetId;if(this.present(m.targetId))m.pos=m.target.pos;m.at=time}
   if(time-m.at>=m.duration){this.removeLater(m);return}
   if(m.targetId!==m.lastTargetId){m.lastTargetId=m.targetId;if(this.present(m.targetId)){m.target.damageFactor=(m.target.damageFactor??1)*m.factor;m.appliedId=m.targetId}}
  }else{
   if(m.mainDone||m.queuedRemove)return
   if(m.started===undefined){m.started=time;if(m.kind==='fx')m.at=time}
   if(m.kind==='fx'?(!this.present(m.targetId)||m.duration>=0&&time-m.at>m.duration):(m.duration>=0&&time-m.spriteAt>m.duration)){m.mainDone=true;this.removeLater(m)}
  }
 }
 tween(m:NativeEmpowerModel,time:number){
  if(m.kind==='buff'||m.disabled)return
  const duration=m.kind==='preview'?.1:.5,age=time-(m.tweenAt??m.spriteAt)
  m.alpha=255*Math.max(0,Math.min(1,m.reverse?1-age/duration:age/duration))
  if(age>=duration){if(m.reverse)this.removeLater(m);else if(m.kind!=='preview')m.disabled=true}
 }
 removeLater(m:NativeEmpowerModel){if(m.kind==='buff'){if(m.queued)return;m.queued=true}else{if(m.queuedRemove)return;m.queuedRemove=true}this.onRemove(m)}
 remove(m:NativeEmpowerModel,time:number){
  if(m.kind==='buff'){
   if(m.appliedId!==undefined&&this.id(m.target)===m.appliedId&&this.present(m.appliedId))m.target.damageFactor=(m.target.damageFactor??1)/m.factor
   if(this.owner.buffs.get(m.target.id)===m)this.owner.buffs.delete(m.target.id)
  }else{
   if(m.disabled){m.disabled=false;m.reverse=true;m.tweenAt=time;m.queuedRemove=false;return false}
   const i=this.owner.visuals.indexOf(m);if(i>=0)this.owner.visuals.splice(i,1)
  }
  m.inserted=false;this.models.delete(m);return true
 }
 retarget(site:TowerSite,id:number,previousId=this.id(site)){
  for(const m of this.models)if((m.kind==='buff'||m.kind==='fx')&&m.targetId===previousId){
   if(m.kind==='buff'){if(m.appliedId!==undefined)m.target.damageFactor=(m.target.damageFactor??1)/m.factor;m.appliedId=undefined}
   m.targetId=id
  }
 }
}
