import data from '../../public/data/gerald-survivor-runtime.json' with {type:'json'}
import {stunEnemy} from './EnemyModifiers.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import type {SoldierInstance} from './BarracksCombat'
export interface NativeTeleport {enemy:EnemyInstance;source?:SoldierInstance;phase:'new'|'start'|'hidden'|'arrival';at:number;phaseAt:number;pushedBans?:number;applied?:boolean;queued?:boolean}
/** Original mod_teleport queue/insert/dequeue, own-main and removal callbacks. */
export class EnemyTeleportRuntime {
 readonly states=new Map<EnemyInstance,NativeTeleport>()
 present:(enemy:EnemyInstance)=>boolean=()=>true
 onQueue:(m:NativeTeleport)=>void=()=>{}
 onRemove:(m:NativeTeleport)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 onUnblock:(enemy:EnemyInstance)=>void=()=>{}
 queue(enemy:EnemyInstance,time:number,source?:SoldierInstance){
  const m:NativeTeleport={enemy,source,phase:'new',at:0,phaseAt:time},v=enemy.template.vis,c=data.teleport.modifier
  if(this.present(enemy)&&!(v.bans&c.vis_flags)&&!(v.flags&c.vis_bans)){m.pushedBans=~v.bans;v.bans=-1}
  this.onQueue(m);return m
 }
 insert(m:NativeTeleport,time:number){
  const e=m.enemy,accepted=this.present(e)&&e.hp>0&&m.pushedBans!==undefined&&(e.teleportCount??0)<data.teleport.max_times_applied&&!this.states.has(e)
  if(accepted){m.at=time;m.applied=true;e.template.health.ignore_damage=true;stunEnemy(e,1);e.teleporting=true;e.teleportAt=time;this.states.set(e,m)}
  // Simulation calls dequeue only for rejected insertions. An accepted
  // teleport retains its queued F_ALL contribution until removal is queued.
  if(!accepted)this.popBans(m)
  return accepted
 }
 advance(m:NativeTeleport,time:number){
  if(m.queued)return
  const e=m.enemy,c=data.teleport
  if(m.phase==='new'){
   if(!this.present(e)||e.hp<=0){this.requestRemove(m);return}
   e.teleportCount=(e.teleportCount??0)+1;m.phase='start';m.phaseAt=time;this.effect(c.fx_start,e,time)
  }
  if(m.phase==='start'){
   if(time-m.phaseAt<c.delay_start)return
   m.phase='hidden';m.phaseAt=time;this.onUnblock(e);e.teleportHidden=true;e.blocked=false
  }
  if(m.phase==='hidden'){
   if(time-m.phaseAt<c.hold_time)return
   e.path.teleportBack?.(c.nodes_offset);m.phase='arrival';m.phaseAt=time;this.effect(c.fx_end,e,time)
  }
  if(m.phase==='arrival'&&time-m.phaseAt>=c.delay_end){
   e.teleportHidden=false;e.headingAngle=(e.path as {headingToNextNode?:(speed:number)=>number}).headingToNextNode?.(e.template.motion.max_speed);this.requestRemove(m)
  }
 }
 remove(m:NativeTeleport){
  this.popBans(m)
  if(m.applied&&this.present(m.enemy)){m.enemy.template.health.ignore_damage=false;stunEnemy(m.enemy,-1);m.enemy.teleporting=false}
  if(this.states.get(m.enemy)===m)this.states.delete(m.enemy)
  return true
 }
 private popBans(m:NativeTeleport){if(m.pushedBans!==undefined){m.enemy.template.vis.bans&=~m.pushedBans;m.pushedBans=undefined}}
 private requestRemove(m:NativeTeleport){this.popBans(m);m.queued=true;this.onRemove(m)}
 private effect(name:string,e:EnemyInstance,time:number){const o=data.teleport.modifier.use_mod_offset?e.template.unit.mod_offset:undefined;this.onEffect(name,{x:e.path.position.x+(o?.x??0),y:e.path.position.y+(o?.y??0)},time)}
}
