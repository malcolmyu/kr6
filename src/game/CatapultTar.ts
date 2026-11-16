import type {Point} from './types'
import type {EnemyInstance} from './GameSession'
interface AreaTemplate {aura:{duration_conf:number[];radius:number;cycle_time:number;vis_flags:number;vis_bans:number}}
interface ModTemplate {slow_factor_config:number[];modifier:{duration:number}}
export interface CatapultTarArea {id:number;pos:Point;level:number;at:number;spriteAt:number;last:number;alpha:number;fadeAt?:number;pending:boolean}
export interface CatapultTarSlow {enemy:EnemyInstance;level:number;factor:number;at:number;pending:boolean}
/** Native aura_apply_mod + mod_lifecycle/mod_slow, with original insert/remove queues. */
export class CatapultTarSystem {
 readonly areas:CatapultTarArea[]=[]
 readonly slows=new Map<number,CatapultTarSlow>()
 onQueue:(enemy:EnemyInstance,level:number,time:number)=>void=()=>{}
 private pendingAreas:{pos:Point;level:number}[]=[]
 private pendingMods:{enemy:EnemyInstance;level:number}[]=[]
 private nextId=1
 private area:AreaTemplate
 private mod:ModTemplate
 constructor(templates:Record<string,object>){this.area=templates.aura_catapult_skill_a as AreaTemplate;this.mod=templates.mod_catapult_skill_a_slow as ModTemplate}
 queue(pos:Point,level:number){this.pendingAreas.push({pos:{...pos},level})}
 advance(time:number,enemies:EnemyInstance[]){
  const remove=new Set<CatapultTarSlow>()
  for(const s of this.slows.values())if(s.pending)remove.add(s)
  for(const p of this.pendingMods.splice(0)){
   const e=p.enemy,old=this.slows.get(e.id)
   if(old){if(old.level===p.level){old.at=time;continue}if(old.level>p.level)continue;remove.add(old)}
   if(e.hp<=0||!enemies.includes(e)||e.template.motion.invulnerable)continue
   const factor=this.mod.slow_factor_config[p.level-1],s={enemy:e,level:p.level,factor,at:time,pending:false}
   e.template.motion.max_speed*=factor;this.slows.set(e.id,s)
  }
  for(const s of remove){s.enemy.template.motion.max_speed/=s.factor;if(this.slows.get(s.enemy.id)===s)this.slows.delete(s.enemy.id)}
  for(let i=this.areas.length-1;i>=0;i--){const a=this.areas[i];if(a.pending){if(a.fadeAt!==undefined)this.areas.splice(i,1);else{a.pending=false;a.fadeAt=time}}}
  for(const p of this.pendingAreas.splice(0))this.areas.push({id:this.nextId++,pos:p.pos,level:p.level,at:time,spriteAt:time,last:time-this.area.aura.cycle_time,alpha:255,pending:false})
  for(const a of this.areas){
   if(a.fadeAt!==undefined){const age=time-a.fadeAt;a.alpha=255*Math.max(0,1-age);if(age>=1)a.pending=true;continue}
   const c=this.area.aura
   if(time-a.at>c.duration_conf[a.level-1]){a.pending=true;continue}
   if(time-a.last<c.cycle_time)continue;a.last=time
   for(const e of enemies){const p=e.path.position
    if(e.hp<=0||e.escapedAt!==undefined||e.template.vis.flags&c.vis_bans||e.template.vis.bans&c.vis_flags||(p.x-a.pos.x)**2+(p.y-a.pos.y)**2/(.7*.7)>c.radius*c.radius)continue
    this.pendingMods.push({enemy:e,level:a.level});this.onQueue(e,a.level,time)
   }
  }
  for(const s of this.slows.values())if(s.enemy.hp<=0||!enemies.includes(s.enemy)||time-s.at>this.mod.modifier.duration)s.pending=true
 }
}
