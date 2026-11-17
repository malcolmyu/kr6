import {stunEnemy} from './EnemyModifiers.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Template {modifier:{duration:number;vis_flags:number;vis_bans:number;use_mod_offset:boolean;chance?:number;resets_same?:boolean};render:{sprites:{offset:Point;name:string;size_names?:string[]}[]}}
export interface ArcherPierceStun {enemy:EnemyInstance;key:string;ts:number;spriteTs:number;pos:Point;offset:Point;flip:boolean;name:string;duration:number;applied:boolean;started:boolean;queued:boolean;sourceId?:number;targetId?:number;level?:number}
/** Original mod_lifecycle + mod_stun4679/4729/4790 shared by named stun templates.
 * Knight C rejects same-template refresh before rolling its insert-time chance. */
export class ArcherPierceStunSystem {
 readonly stuns:ArcherPierceStun[]=[]
 present:(enemy:EnemyInstance)=>boolean=()=>true
 dead:(enemy:EnemyInstance)=>boolean=enemy=>enemy.diedAt!==undefined
 facingLeft:(enemy:EnemyInstance)=>boolean=enemy=>enemy.visualOverride?.facingLeft??enemy.path.direction.x<0
 candidates:(enemy:EnemyInstance)=>ArcherPierceStun[]=enemy=>this.stuns.filter(s=>s.enemy===enemy)
 onQueue:(stun:ArcherPierceStun)=>void=()=>{}
 onRemove:(stun:ArcherPierceStun)=>void=()=>{}
 private templates:Record<string,Template>
 private random:()=>number
 constructor(templates:Record<string,Template>,random:()=>number=Math.random){this.templates=templates;this.random=random}
 queue(key:string,enemy:EnemyInstance,metadata:Partial<Pick<ArcherPierceStun,'sourceId'|'targetId'|'level'|'ts'>>={}){const config=this.templates[key],s:ArcherPierceStun={key,enemy,ts:0,spriteTs:0,pos:{x:0,y:0},offset:{...config.render.sprites[0].offset},flip:false,name:config.render.sprites[0].name,duration:config.modifier.duration,applied:false,started:false,queued:false,...metadata};this.onQueue(s);return s}
 insert(s:ArcherPierceStun,time:number){
  const e=s.enemy,c=this.templates[s.key].modifier,old=this.candidates(e).find(m=>m.key===s.key)
  if(old){if(c.resets_same!==false)old.ts=time;return false}
  if(c.chance!==undefined&&c.chance<this.random())return false
  if(!this.present(e)||this.dead(e)||(e.template.vis.bans&c.vis_flags)||(e.template.vis.flags&c.vis_bans))return false
  s.ts=s.spriteTs=time;s.flip=this.facingLeft(e)
  if(c.use_mod_offset&&e.template.unit.mod_offset)s.offset={...e.template.unit.mod_offset}
  s.applied=true;stunEnemy(e,1);this.stuns.push(s);return true
 }
 advance(s:ArcherPierceStun,time:number){
  if(s.queued)return
  if(!s.started&&!this.present(s.enemy)){this.removeLater(s);return}
  if(!s.started){s.started=true;s.pos=s.enemy.path.position;s.name='loop'}
  if(time-s.ts>=s.duration||this.dead(s.enemy)){this.removeLater(s);return}
  if(this.templates[s.key].modifier.use_mod_offset&&s.enemy.template.unit.mod_offset)s.offset={...s.enemy.template.unit.mod_offset}
 }
 private removeLater(s:ArcherPierceStun){s.queued=true;this.onRemove(s)}
 remove(s:ArcherPierceStun){if(s.applied&&this.present(s.enemy))stunEnemy(s.enemy,-1);s.applied=false;const index=this.stuns.indexOf(s);if(index>=0)this.stuns.splice(index,1);return true}
}
