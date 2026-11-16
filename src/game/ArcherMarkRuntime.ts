import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import art from '../../public/data/archers-mark.json' with {type:'json'}
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {received_damage_factor_config:number[];boss_received_damage_factor_config:number[];modifier_duration:number[];modifier:{vis_flags:number;vis_bans:number;use_mod_offset:boolean}}
export interface ArcherMark {
 enemy:EnemyInstance;level:number;sourceId?:number;lastNode?:number;pos:Point;offset:Point
 at:number;spriteAt:number;duration:number;factor?:number;animation:'start'|'idle'|'fade';loop:boolean
 phase:'new'|'start'|'idle'|'fade';inserted:boolean;queued:boolean;render:boolean
}
/** Shipped mark insert19299/update19375/remove19414, preceded by mod_lifecycle4. */
export class ArcherMarkRuntime {
 readonly marks:ArcherMark[]=[]
 onQueue:(mark:ArcherMark)=>void=()=>{}
 onRemove:(mark:ArcherMark)=>void=()=>{}
 present:(enemy:EnemyInstance)=>boolean=()=>true
 dead:(enemy:EnemyInstance)=>boolean=enemy=>enemy.diedAt!==undefined
 facingLeft:(enemy:EnemyInstance)=>boolean=enemy=>enemy.visualOverride?.facingLeft??enemy.path.direction.x<0
 node:(enemy:EnemyInstance)=>number=enemy=>(enemy.path as {ni?:number}).ni??0
 candidates:(enemy:EnemyInstance)=>ArcherMark[]=enemy=>this.marks.filter(m=>m.enemy===enemy)
 private config:Config
 constructor(config:Config){this.config=config}
 queue(enemy:EnemyInstance,level:number,sourceId?:number){
  const m:ArcherMark={enemy,level,sourceId,pos:{x:0,y:0},offset:{x:0,y:0},at:0,spriteAt:0,duration:0,animation:'start',loop:true,phase:'new',inserted:false,queued:false,render:true}
  this.onQueue(m);return m
 }
 insert(m:ArcherMark,time:number){
  m.at=m.spriteAt=time
  const candidates=this.candidates(m.enemy)
  for(const old of candidates){
   if(old.level<m.level){this.removeLater(old);m.spriteAt=old.spriteAt}
   else{if(old.level===m.level)old.at=time;return false}
  }
  const e=m.enemy,c=this.config.modifier
  if(!this.present(e)||(e.template.vis.bans&c.vis_flags)||(e.template.vis.flags&c.vis_bans))return false
  // The own insert's duplicate check excludes already queued replacements.
  const old=candidates.find(o=>!o.queued)
  if(old){old.at=time;old.spriteAt=time;m.render=false}
  if(this.dead(e)||!e.template.unit)return false
  m.factor=(e.template.vis.flags&art.bossFlag?this.config.boss_received_damage_factor_config:this.config.received_damage_factor_config)[m.level-1]
  e.template.health.damage_factor*=m.factor
  m.duration=this.config.modifier_duration[m.level-1]
  if(m.render){m.spriteAt=time;this.offset(m)}
  m.inserted=true;this.marks.push(m);return true
 }
 private offset(m:ArcherMark){const offset=m.enemy.template.unit.mod_offset;if(this.config.modifier.use_mod_offset&&offset){m.offset.x=offset.x*(this.facingLeft(m.enemy)?-1:1);m.offset.y=offset.y}}
 advance(m:ArcherMark,time:number){
  if(!m.inserted||m.queued)return
  if(m.phase==='new'){
   m.at=time
   if(!this.present(m.enemy)){this.removeLater(m);return}
   m.pos=m.enemy.path.position;m.phase='start';m.animation='start';m.spriteAt=time;m.loop=false
  }
  if(m.phase==='start'){
   if(!nativeLogicAnimationFrame(art.frames.start,time,m.spriteAt,false,art.fps).runs)return
   m.phase='idle';m.animation='idle';m.loop=true
  }
  if(m.phase==='idle'){
   if(!this.present(m.enemy)||this.dead(m.enemy)||(m.duration>=0&&time-m.at>m.duration)||(m.lastNode!==undefined&&this.node(m.enemy)>m.lastNode)){
    m.phase='fade';m.animation='fade';m.spriteAt=time;m.loop=false
   }else if(m.render)this.offset(m)
  }
  if(m.phase==='fade'&&nativeLogicAnimationFrame(art.frames.fade,time,m.spriteAt,false,art.fps).runs)this.removeLater(m)
 }
 private removeLater(m:ArcherMark){if(m.queued)return;m.queued=true;this.onRemove(m)}
 remove(m:ArcherMark){
  if(m.inserted&&this.present(m.enemy)&&m.factor!==undefined)m.enemy.template.health.damage_factor/=m.factor
  m.inserted=false;const i=this.marks.indexOf(m);if(i>=0)this.marks.splice(i,1);return true
 }
}
