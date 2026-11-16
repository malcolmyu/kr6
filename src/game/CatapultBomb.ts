import {recordEnemyDamage} from './EnemyDeath.ts'
import {nativeAnimationFrame} from './NativeAnimation.ts'
import {ellipseDistanceFactor} from './CatapultMotion.ts'
import {predictDamage} from './Damage.ts'
import type {Point} from './types'
import type {EnemyInstance} from './GameSession'
interface BombTemplate {explosion_delay:number;cast_time:number;damage_radius:number;damage_min_conf:number[];damage_max_conf:number[];damage_type:number;sound_explosion:string;render:{sprites:{name:string;ts:number;loop:boolean}[]}}
export interface CatapultBomb {id:number;pos:Point;level:number;at:number;name:string;spriteAt:number;loop:boolean;runs:number;hit:boolean;removeNext:boolean}
/** Original20362 payload: independent of its sold source and source damage factor. */
export class CatapultBombSystem {
 readonly bombs:CatapultBomb[]=[]
 onSound:(name:string)=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number,time:number)=>void=()=>{}
 targetValid:(enemy:EnemyInstance)=>boolean=()=>true
 private pending:{pos:Point;level:number}[]=[]
 private nextId=1
 private template:BombTemplate
 private onKill:(enemy:EnemyInstance)=>void
 constructor(template:BombTemplate,onKill:(enemy:EnemyInstance)=>void){this.template=template;this.onKill=onKill}
 queue(pos:Point,level:number){this.pending.push({pos:{...pos},level})}
 advance(time:number,enemies:EnemyInstance[]){
  for(let i=this.bombs.length-1;i>=0;i--)if(this.bombs[i].removeNext)this.bombs.splice(i,1)
  for(const p of this.pending.splice(0)){const s=this.template.render.sprites[0];this.bombs.push({id:this.nextId++,pos:p.pos,level:p.level,at:time,name:s.name,spriteAt:s.ts,loop:s.loop,runs:0,hit:false,removeNext:false})}
  for(const b of this.bombs){
   b.runs=nativeAnimationFrame(b.name==='fall'?8:26,time-b.spriteAt,b.loop,30).runs
   if(b.name==='fall'&&time-b.at>=this.template.explosion_delay){b.name='activate';b.spriteAt=time;b.loop=false;b.runs=0}
   if(b.name==='activate'&&!b.hit&&time-b.spriteAt>=Math.round(this.template.cast_time*30)/30){
    b.hit=true;this.onSound(this.template.sound_explosion)
    for(const e of enemies){const p=e.path.position,r=this.template.damage_radius
     if(e.hp<=0||e.escapedAt!==undefined||!this.targetValid(e)||(p.x-b.pos.x)**2+(p.y-b.pos.y)**2/(.7*.7)>r*r)continue
     const min=this.template.damage_min_conf[b.level-1],max=this.template.damage_max_conf[b.level-1],value=Math.floor(max-(max-min)*ellipseDistanceFactor(p,b.pos,r))
     this.onDamage(e,value,time)
     if(e.template.health.ignore_damage)continue
     recordEnemyDamage(e,this.template.damage_type,time)
     e.hp-=predictDamage({...e.template.health,hp:e.hp},{value,damage_type:this.template.damage_type})
     if(e.hp<=0){e.diedAt=time;this.onKill(e)}
    }
   }
   if(b.hit&&b.runs>0)b.removeNext=true
  }
 }
}
