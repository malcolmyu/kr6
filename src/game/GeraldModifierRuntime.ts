import {soldierIsDead} from './SoldierHealth.ts'
import {adjustSoldierArmor} from './SoldierHealth.ts'
import data from '../../public/data/gerald-modifiers.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {GeraldSkill,GeraldModifier} from './GeraldSkills'
import type {SoldierInstance} from './BarracksCombat'
import type {Point} from './types'
export interface NativeGeraldModifier {key:string;kind:GeraldSkill;target:SoldierInstance;pos:Point;modifierTs:number;ts:number;name:string;phase:'new'|'start'|'loop'|'end'|'fade';duration:number;armor:number;spiked:number;fadeAt?:number;alpha:number;queued?:boolean}
/** Shipped mod_gerald_skill_a/b insert, own-main, tween and removal bodies. */
export class GeraldModifierRuntime {
 readonly buffs=new Map<string,NativeGeraldModifier>()
 onQueue:(name:string,m:NativeGeraldModifier)=>void=()=>{}
 onRemove:(m:NativeGeraldModifier)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 present:(s:SoldierInstance)=>boolean=()=>true
 queue(kind:GeraldSkill,target:SoldierInstance,mod:GeraldModifier){const key=`gerald-${kind}-${target.id}`,m:NativeGeraldModifier={key,kind,target,pos:{x:0,y:0},modifierTs:0,ts:0,name:'start',phase:'new',duration:mod.modifier.duration,armor:mod.armor_inc,spiked:mod.spiked_armor??0,alpha:255};this.onQueue(`mod_gerald_${kind}`,m)}
 insert(m:NativeGeraldModifier,time:number){
  const t=m.target,d=data[`mod_gerald_${m.kind}`].modifier,vis=t.template.vis??{flags:1025,bans:0}
  if(!this.present(t)||soldierIsDead(t)||(vis.bans&d.vis_flags)||(vis.flags&d.vis_bans))return false
  const previous=this.buffs.get(m.key);if(previous){previous.modifierTs=time;return false}
  m.modifierTs=time;t.buffs??=new Map();t.buffs.set(m.key,{armor:m.armor,magicArmor:m.armor,spikedArmor:m.spiked,nativeApplied:true});adjustSoldierArmor(t,m.armor,m.armor,m.spiked);this.buffs.set(m.key,m);return true
 }
 advance(m:NativeGeraldModifier,time:number){
  if(m.queued||m.phase==='fade')return
  if(m.phase==='new'){
   if(!this.present(m.target)){m.queued=true;this.onRemove(m);return}
   m.pos=m.target.pos;m.ts=time;m.phase='start';if(m.kind==='skill_a')this.onEffect(data.mod_gerald_skill_a.fx,m.pos,time)
  }
  if(m.phase==='start'){if(nativeLogicAnimationFrame(m.kind==='skill_a'?6:12,time,m.ts,false,30).runs===0)return;m.phase='loop';m.name=m.kind==='skill_a'?'idle':'loop'}
  if(m.phase==='loop'&&(!this.present(m.target)||(soldierIsDead(m.target)&&!m.target.reinforcementFadeTo)||m.duration<=time-m.modifierTs)){
   if(m.kind==='skill_a'){m.phase='end';m.name='end';m.ts=time}else{m.phase='fade';m.fadeAt=time;return}
  }
  if(m.phase==='end'&&nativeLogicAnimationFrame(11,time,m.ts,false,30).runs>0){m.queued=true;this.onRemove(m)}
 }
 tween(m:NativeGeraldModifier,time:number){if(m.phase!=='fade'||m.queued)return;const age=time-m.fadeAt!;m.alpha=255+(0-255)*Math.min(1,age);if(age>=1){m.queued=true;this.onRemove(m)}}
 remove(m:NativeGeraldModifier){if(this.buffs.get(m.key)===m){adjustSoldierArmor(m.target,-m.armor,-m.armor,-m.spiked);m.target.buffs?.delete(m.key);this.buffs.delete(m.key)}return true}
}
