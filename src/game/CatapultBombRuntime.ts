import {enemyIsDead} from './EnemyDeath.ts'
import {ellipseDistanceFactor} from './CatapultMotion.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {explosion_delay:number;cast_time:number;damage_radius:number;damage_min_conf:number[];damage_max_conf:number[];damage_type:number;sound_explosion:string;render:{sprites:{name:string;ts:number;loop:boolean}[]}}
export interface NativeCatapultBomb {template:string;id:number;pos:Point;level:number;at?:number;name:string;spriteAt:number;loop:boolean;runs:number;hit:boolean;pending:boolean}
/** Original delayed powerball area: main queues damage, health applies it later. */
export class CatapultBombRuntime {
 readonly bombs=new Set<NativeCatapultBomb>()
 private config:Config
 constructor(template:object){this.config=template as Config}
 id:(m:object)=>number|undefined=()=>undefined
 candidates:(pos:Point,radius:number)=>EnemyInstance[]=()=>[]
 valid:(e:EnemyInstance)=>boolean=()=>true
 onQueue:(b:NativeCatapultBomb)=>void=()=>{}
 onRemove:(b:NativeCatapultBomb)=>void=()=>{}
 onDamage:(enemy:EnemyInstance,value:number,type:number)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 queue(pos:Point,level:number){const s=this.config.render.sprites[0],b:NativeCatapultBomb={template:'aura_catapult_skill_b_bomb',id:0,pos:{...pos},level,name:s.name,spriteAt:s.ts,loop:s.loop,runs:0,hit:false,pending:false};this.onQueue(b);b.id=this.id(b)!;return b}
 insert(b:NativeCatapultBomb){this.bombs.add(b);return true}
 advance(b:NativeCatapultBomb,time:number){
  if(b.pending)return
  const c=this.config;b.at??=time;b.runs=nativeLogicAnimationFrame(b.name==='fall'?8:26,time,b.spriteAt,b.loop,30).runs
  if(b.name==='fall'&&time-b.at>=c.explosion_delay){b.name='activate';b.spriteAt=time;b.loop=false;b.runs=0}
  if(b.name==='activate'&&!b.hit&&time-b.spriteAt>=c.cast_time){
   b.hit=true;this.onSound(c.sound_explosion)
   for(const e of this.candidates(b.pos,c.damage_radius))if(!enemyIsDead(e)&&this.valid(e)&&(e.path.position.x-b.pos.x)**2+(e.path.position.y-b.pos.y)**2/(.7*.7)<=c.damage_radius*c.damage_radius){const min=c.damage_min_conf[b.level-1],max=c.damage_max_conf[b.level-1];this.onDamage(e,Math.floor(max-(max-min)*ellipseDistanceFactor(e.path.position,b.pos,c.damage_radius)),c.damage_type)}
  }
  if(b.hit&&b.runs>0){b.pending=true;this.onRemove(b)}
 }
 remove(b:NativeCatapultBomb){this.bombs.delete(b);return true}
}
