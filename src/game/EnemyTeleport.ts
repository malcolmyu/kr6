import {stunEnemy} from './EnemyModifiers.ts'
import type {EnemyInstance} from './GameSession'
import type {SoldierInstance} from './BarracksCombat'
import type {Point} from './types'
import {EnemyTeleportRuntime} from './EnemyTeleportRuntime.ts'
export interface TeleportConfig {nodes_offset:number;max_times_applied:number;delay_start:number;delay_end:number;hold_time:number;fx_start:string;fx_end:string;modifier:{vis_flags:number;vis_bans:number;use_mod_offset:boolean}}
export interface EnemyTeleportState {enemy:EnemyInstance;at:number;phase:'start'|'hidden'|'arrival';phaseAt:number}
/** Original mod_teleport, using the entity's sampled path and native NO_TELEPORT node flags. */
export class EnemyTeleport {
 defer=false
 readonly runtime=new EnemyTeleportRuntime()
 readonly states=new Map<number,EnemyTeleportState>()
 private config:TeleportConfig
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 constructor(config:TeleportConfig){this.config=structuredClone(config);this.config.hold_time=Math.round(this.config.hold_time*30)/30}
 apply(enemy:EnemyInstance,time:number){
  if(this.defer){this.runtime.queue(enemy,time);return true}
  const c=this.config,v=enemy.template.vis
  if(enemy.hp<=0||enemy.escapedAt!==undefined||this.states.has(enemy.id)||!enemy.path.teleportBack||v.bans&c.modifier.vis_flags||v.flags&c.modifier.vis_bans||(enemy.teleportCount??0)>=c.max_times_applied)return false
  this.states.set(enemy.id,{enemy,at:time,phase:'start',phaseAt:time});stunEnemy(enemy,1);enemy.template.health.ignore_damage=true;enemy.teleporting=true;enemy.teleportAt=time;enemy.teleportCount=(enemy.teleportCount??0)+1;if(!enemy.meleeManaged)enemy.meleeAttack=undefined
  this.effect(c.fx_start,enemy,time);return true
 }
 advance(time:number,soldiers:SoldierInstance[]=[]){
  if(this.defer)return
  time=Math.round(time*30)/30
  for(const [id,state]of this.states){
   const e=state.enemy,c=this.config
   if(state.phase==='start'&&time-state.phaseAt>=c.delay_start){
    state.phase='hidden';state.phaseAt=time;e.teleportHidden=true;e.blocked=false
    for(const s of soldiers)if(s.target===e){s.target=undefined;s.attack=undefined;s.holdsBlockWhileDead=false}
   }
   if(state.phase==='hidden'&&time-state.phaseAt>=c.hold_time){state.phase='arrival';state.phaseAt=time;e.path.teleportBack!(c.nodes_offset);this.effect(c.fx_end,e,time)}
   if(state.phase==='arrival'&&time-state.phaseAt>=c.delay_end){e.teleporting=false;e.teleportHidden=false;stunEnemy(e,-1);e.template.health.ignore_damage=false;this.states.delete(id)}
  }
 }
 private effect(name:string,e:EnemyInstance,time:number){const offset=this.config.modifier.use_mod_offset?e.template.unit.mod_offset:undefined;this.onEffect(name,{x:e.path.position.x+(offset?.x??0),y:e.path.position.y+(offset?.y??0)},time)}
}
