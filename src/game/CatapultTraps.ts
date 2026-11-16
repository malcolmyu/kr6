import {recordEnemyDamage} from './EnemyDeath.ts'
import {nativeAnimationFrame} from './NativeAnimation.ts'
import {stunEnemy} from './EnemyModifiers.ts'
import {predictDamage} from './Damage.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import type {TowerSite} from './TowerSystem'
interface TrapTemplate {aura:{radius:number;vis_flags:number;vis_bans:number};damage_min_conf:number[];damage_max_conf:number[];damage_type:number;sound_open:string;sound_trigger:string}
interface StunTemplate {stun_duration_config:number[];modifier:{vis_flags:number;vis_bans:number}}
export interface CatapultTrap {id:number;pos:Point;level:number;owner?:string;at:number;spriteAt:number;name:'set'|'ready'|'activate';loop:boolean;runs:number;hit:boolean;hidden:boolean;pending:boolean}
export interface CatapultTrapStun {enemy:EnemyInstance;level:number;at:number;spriteAt:number;duration:number;pending:boolean}
export function catapultOwner(site:TowerSite){return `${site.id}:${site.instance??0}`}
/** Original20400/20417 trap and native queued mod_stun lifecycle. */
export class CatapultTraps {
 readonly traps:CatapultTrap[]=[]
 readonly stuns=new Map<number,CatapultTrapStun>()
 onSound:(name:string)=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number,time:number)=>void=()=>{}
 onQueueStun:(enemy:EnemyInstance,level:number,time:number)=>void=()=>{}
 targetValid:(enemy:EnemyInstance)=>boolean=()=>true
 private pendingTraps:{pos:Point;level:number;source?:string}[]=[]
 private pendingStuns:{enemy:EnemyInstance;level:number}[]=[]
 private nextId=1
 private config:TrapTemplate
 private stun:StunTemplate
 private random:()=>number
 private onKill:(enemy:EnemyInstance)=>void
 constructor(templates:Record<string,object>,random:()=>number,onKill:(enemy:EnemyInstance)=>void){this.config=templates.aura_catapult_skill_c_trap as TrapTemplate;this.stun=templates.mod_catapult_skill_c_stun as StunTemplate;this.random=random;this.onKill=onKill}
 queue(pos:Point,level:number,source?:string){this.pendingTraps.push({pos:{...pos},level,source})}
 count(site:TowerSite|string){const key=typeof site==='string'?site:catapultOwner(site);return this.traps.filter(t=>t.owner===key&&!t.hidden).length}
 private targets(pos:Point,enemies:EnemyInstance[]){const c=this.config.aura;return enemies.filter(e=>{const p=e.path.position;return e.hp>0&&e.escapedAt===undefined&&this.targetValid(e)&&!(e.template.vis.flags&c.vis_bans)&&!(e.template.vis.bans&c.vis_flags)&&(p.x-pos.x)**2+(p.y-pos.y)**2/(.7*.7)<=c.radius*c.radius})}
 advance(time:number,sites:TowerSite[],enemies:EnemyInstance[]){
  const remove=new Set<CatapultTrapStun>();for(const s of this.stuns.values())if(s.pending)remove.add(s)
  for(const p of this.pendingStuns.splice(0)){
   const e=p.enemy,old=this.stuns.get(e.id)
   if(old){if(old.level===p.level){old.at=time;continue}if(old.level>p.level)continue;remove.add(old)}
   if(e.hp<=0||!enemies.includes(e)||e.template.vis.bans&this.stun.modifier.vis_flags||e.template.vis.flags&this.stun.modifier.vis_bans)continue
   const s={enemy:e,level:p.level,at:time,spriteAt:old?.spriteAt??time,duration:this.stun.stun_duration_config[p.level-1],pending:false}
   stunEnemy(e,1);this.stuns.set(e.id,s);if(e.template.unit.is_stunned){if(!e.meleeManaged)e.meleeAttack=undefined;e.idleStartedAt=time}
  }
  for(const s of remove){stunEnemy(s.enemy,-1);if(this.stuns.get(s.enemy.id)===s)this.stuns.delete(s.enemy.id)}
  for(let i=this.traps.length-1;i>=0;i--)if(this.traps[i].pending)this.traps.splice(i,1)
  for(const p of this.pendingTraps.splice(0)){
   const owner=p.source&&sites.some(s=>s.tower&&catapultOwner(s)===p.source)?p.source:undefined
   this.traps.push({id:this.nextId++,pos:p.pos,level:p.level,owner,at:time,spriteAt:time,name:'set',loop:false,runs:0,hit:false,hidden:false,pending:false});this.onSound(this.config.sound_open)
  }
  for(const t of this.traps){
   t.runs=nativeAnimationFrame(t.name==='set'?18:t.name==='ready'?1:28,time-t.spriteAt,t.loop,30).runs
   if(t.name==='set'&&t.runs>0){t.name='ready';t.loop=true}
   if(t.name==='ready'&&this.targets(t.pos,enemies).length){t.name='activate';t.spriteAt=time;t.loop=false;t.runs=0}
   if(t.name==='activate'&&!t.hit&&time-t.spriteAt>=12*(1/30)){
    t.hit=true;this.onSound(this.config.sound_trigger)
    for(const e of this.targets(t.pos,enemies)){
     const min=this.config.damage_min_conf[t.level-1],max=this.config.damage_max_conf[t.level-1],value=min+Math.floor(this.random()*(max-min+1));this.onDamage(e,value,time)
     if(!e.template.health.ignore_damage){recordEnemyDamage(e,this.config.damage_type,time);e.hp=Math.max(0,e.hp-predictDamage({...e.template.health,hp:e.hp},{value,damage_type:this.config.damage_type}));if(e.hp<=0){e.diedAt=time;this.onKill(e)}}
     this.pendingStuns.push({enemy:e,level:t.level});this.onQueueStun(e,t.level,time)
    }
   }
   if(t.hit&&t.runs>0){t.hidden=true;t.pending=true}
  }
  for(const s of this.stuns.values())if(s.enemy.hp<=0||!enemies.includes(s.enemy)||time-s.at>=s.duration)s.pending=true
 }
}
