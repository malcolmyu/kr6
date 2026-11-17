import {adjustSoldierPhysicalArmor,soldierIsDead} from './SoldierHealth.ts'
import type {SoldierInstance} from './BarracksCombat'
import type {Point} from './types'
interface Template {
 aura?:{level:number;duration:number;duration_inc:number;cycle_time:number;radius:number;vis_flags:number;vis_bans:number;mods:string[]}
 modifier?:{level:number;duration:number;vis_flags:number;vis_bans:number;resets_same?:boolean}
 inflicted_damage_factor?:number
 armor_buff?:{max_factor:number}
}
export interface ReinforcementSpecialModel {
 key:string;kind:'ingress'|'aura'|'damage'|'armor';pos:Point;source?:SoldierInstance;sourceId?:number;target?:SoldierInstance;targetId?:number;level:number
 at:number;spriteAt:number;duration:number;lastCycle:number;started:boolean;inserted:boolean;queued:boolean;mainDone:boolean
 alpha:number;tweenAt:number;disabled:boolean;reverse:boolean;removeTween:boolean;applied:boolean;factor:number;config:Template
}
/** Original special-unit first main, aura_apply_mod and its two real modifiers. */
export class ReinforcementSpecialRuntime {
 readonly models=new Set<ReinforcementSpecialModel>()
 private templates:Record<string,Template>
 id:(model:object)=>number|undefined=()=>undefined
 present:(id:number|undefined)=>boolean=()=>true
 units:()=>SoldierInstance[]=()=>[]
 candidates:(targetId:number|undefined,key:string)=>ReinforcementSpecialModel[]=(id,key)=>[...this.models].filter(m=>m.targetId===id&&m.key===key)
 onQueue:(m:ReinforcementSpecialModel)=>void=()=>{}
 onRemove:(m:ReinforcementSpecialModel)=>void=()=>{}
 constructor(templates:Record<string,Template>){this.templates=templates}
 /** Timeout zeroes HP in main; health11 raises dead after that main pass. */
 dead(s:SoldierInstance,time:number){return soldierIsDead(s)&&!(s.hpBeforeTimeout!==undefined&&s.fadeOutAt===time)}
 private create(key:string,kind:ReinforcementSpecialModel['kind'],time:number){
  const config=structuredClone(this.templates[key]),a=config.aura,d=config.modifier
  return {key,kind,pos:{x:0,y:0},level:a?.level??d?.level??1,at:0,spriteAt:time,duration:a?a.duration+a.level*a.duration_inc:d?.duration??0,lastCycle:0,started:false,inserted:false,queued:false,mainDone:false,alpha:255,tweenAt:time,disabled:false,reverse:false,removeTween:false,applied:false,factor:config.inflicted_damage_factor??config.armor_buff?.max_factor??0,config} as ReinforcementSpecialModel
 }
 start(source:SoldierInstance,time:number){
  const fx=this.create('decal_power_reinforcements_special','ingress',time);fx.pos={...source.pos};this.onQueue(fx)
  const aura=this.create('aura_power_reinforcement_special','aura',time);aura.source=source;aura.sourceId=this.id(source);this.onQueue(aura)
 }
 insert(m:ReinforcementSpecialModel,time:number){
  if(m.kind==='aura')m.at=time
  if(m.kind==='damage'||m.kind==='armor'){
   m.at=m.spriteAt=m.tweenAt=time
   for(const old of this.candidates(m.targetId,m.key)){if(m.config.modifier!.resets_same)old.at=time;return false}
   const target=m.target!,c=m.config.modifier!,vis=target.template.vis??{flags:0,bans:0},bans=target.visBans??vis.bans
   if(!this.present(m.targetId)||this.dead(target,time))return false
   if(m.kind==='damage'){
    target.template.unit!.damage_factor=(target.template.unit!.damage_factor??1)*m.factor
    // Shipped mod_damage_factors mutates before its KR5 visibility rejection.
    if((bans&c.vis_flags)||(vis.flags&c.vis_bans))return false
   }else{
    if((bans&c.vis_flags)||(vis.flags&c.vis_bans))return false
    adjustSoldierPhysicalArmor(target,m.factor)
   }
   m.applied=true
  }
  m.inserted=true;this.models.add(m);return true
 }
 advance(m:ReinforcementSpecialModel,time:number){
  if(m.queued||m.mainDone||m.kind==='ingress')return
  if(m.kind==='aura'){
   const a=m.config.aura!,s=m.source!
   if(!m.started){m.started=true;if(this.present(m.sourceId))m.pos=s.pos;m.lastCycle=time-a.cycle_time}
   if(m.duration>=0&&time-m.at>m.duration||!this.present(m.sourceId)){this.removeLater(m);return}
   if(this.dead(s,time)||time-m.lastCycle<a.cycle_time)return
   m.lastCycle=time
   for(const target of this.units()){
    const vis=target.template.vis??{flags:0,bans:0},dx=target.pos.x-m.pos.x,dy=target.pos.y-m.pos.y
    if(this.dead(target,time)||(vis.flags&a.vis_bans)||((target.visBans??vis.bans)&a.vis_flags)||(.7*.7)*(dx*dx)+dy*dy>a.radius*a.radius*(.7*.7))continue
    for(const key of a.mods){const mod=this.create(key,key.endsWith('_armor')?'armor':'damage',time);mod.sourceId=this.id(m);mod.target=target;mod.targetId=this.id(target);mod.level=m.level;this.onQueue(mod)}
   }
  }else{
   if(!m.started){m.started=true;m.at=time;if(this.present(m.targetId))m.pos=m.target!.pos;else{this.removeLater(m);return}}
   if(!this.present(m.targetId)||this.dead(m.target!,time)||m.duration>=0&&time-m.at>m.duration){m.mainDone=true;this.removeLater(m)}
  }
 }
 tween(m:ReinforcementSpecialModel,time:number){
  if(m.kind!=='armor'||m.disabled)return
  const age=time-m.tweenAt;m.alpha=255*Math.max(0,Math.min(1,m.reverse?1-age:age))
  if(age>=1){if(m.removeTween)this.removeLater(m);else m.disabled=true}
 }
 private removeLater(m:ReinforcementSpecialModel){if(m.queued)return;m.queued=true;this.onRemove(m)}
 remove(m:ReinforcementSpecialModel,time:number){
  if(m.kind==='damage'&&m.applied&&this.present(m.targetId))m.target!.template.unit!.damage_factor=(m.target!.template.unit!.damage_factor??1)/m.factor
  if(m.kind==='armor'&&m.disabled){
   if(m.applied&&this.present(m.targetId))adjustSoldierPhysicalArmor(m.target!,-m.factor)
   m.applied=false;m.disabled=false;m.reverse=true;m.removeTween=true;m.tweenAt=time;m.queued=false;return false
  }
  // Original armor removal during an unfinished forward tween returns directly.
  m.inserted=false;this.models.delete(m);return true
 }
}
