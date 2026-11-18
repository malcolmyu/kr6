import data from '../../public/data/bolin-mines.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {enemyIsDead} from './EnemyDeath.ts'
import {ellipseDistanceFactor} from './CatapultMotion.ts'
import type {HeroUnit} from './HeroSystem'
import type {MineAttack} from './BolinMinesController'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {bullet:{flight_time:number;g:number;rotation_speed:number;payload:string;level:number};sound_events?:{insert:string;insert_args?:{delay?:number}};aura:{radius:number;vis_flags:number;vis_bans:number;vis_bans_trigger:number};trigger_radius:number;sound_hit:string;hit_decal:string;damage_min:number;damage_max:number;damage_type:number;damage_factor?:number;ignore_dist_factor?:boolean;reduce_armor?:number}
interface Base {kind:'bullet'|'mine';name:string;id:number;pos:Point;sourceId?:number;hero:HeroUnit;pending:boolean;rotation:number;z:number;spriteAt:number;animation:string;loop:boolean}
export interface MineBullet extends Base {kind:'bullet';from:Point;to:Point;at?:number;speed:Point;first:boolean}
export interface BolinMine extends Base {kind:'mine';phase:'spawn'|'idle'|'explode';trigger:boolean;polled:boolean;lastTargets:boolean;level:number}
export type BolinMineModel=MineBullet|BolinMine
export class BolinMinesRuntime {
 readonly models=new Set<BolinMineModel>()
 private templates:()=>Record<string,object>
 private random:()=>number
 constructor(templates:()=>Record<string,object>,random:()=>number){this.templates=templates;this.random=random}
 private config(name:string){return this.templates()[name] as Config}
 id:(m:object)=>number|undefined=()=>undefined
 onQueue:(m:BolinMineModel)=>void=()=>{}
 onRemove:(m:BolinMineModel)=>void=()=>{}
 candidates:(pos:Point,radius:number)=>EnemyInstance[]=()=>[]
 onCreateDamage:()=>number|undefined=()=>undefined
 onDamage:(e:EnemyInstance,value:number,type:number,armor:number|undefined,order:number|undefined)=>void=()=>{}
 onCrater:(pos:Point)=>void=()=>{}
 onExplode:(hero:HeroUnit)=>void=()=>{}
 onSound:(name:string,options?:{delay?:number})=>void=()=>{}
 private queue<T extends BolinMineModel>(m:T){this.onQueue(m);m.id=this.id(m)!;return m}
 private removeLater(m:BolinMineModel){if(!m.pending){m.pending=true;this.onRemove(m)}}
 throw(h:HeroUnit,a:MineAttack,to:Point){const from={x:h.pos.x+a.bullet_start_offset.x,y:h.pos.y+a.bullet_start_offset.y};return this.queue<MineBullet>({kind:'bullet',name:a.bullet,id:0,pos:{...from},hero:h,sourceId:this.id(h),from,to:{...to},speed:{x:0,y:0},first:true,rotation:0,z:3400,spriteAt:0,animation:'flying',loop:true,pending:false})}
 createMine(h:HeroUnit,pos:Point,time:number,level=1){return this.queue<BolinMine>({kind:'mine',name:'aura_bolin_skill_b_trigger',id:0,pos:{...pos},hero:h,sourceId:this.id(h),phase:'spawn',trigger:false,polled:false,lastTargets:false,level,rotation:0,z:1400,spriteAt:time,animation:'spawn',loop:false,pending:false})}
 insert(m:BolinMineModel,time:number){
  const c=this.config(m.name)
  if(m.kind==='bullet'){const b=c.bullet;m.at=time;m.speed={x:(m.to.x-m.from.x)/b.flight_time,y:(m.to.y-m.from.y-.5*b.g*b.flight_time*b.flight_time)/b.flight_time}}
  this.models.add(m);if(c.sound_events?.insert)this.onSound(c.sound_events.insert,c.sound_events.insert_args);return true
 }
 private targets(m:BolinMine,radius:number,bans:number){const c=this.config(m.name).aura;return this.candidates(m.pos,radius).filter(e=>!enemyIsDead(e)&&!(e.template.vis.flags&bans)&&!(e.template.vis.bans&c.vis_flags)&&(e.path.position.x-m.pos.x)**2+(e.path.position.y-m.pos.y)**2/(.7*.7)<=radius*radius)}
 advance(m:BolinMineModel,time:number){
  if(m.pending)return;const c=this.config(m.name)
  if(m.kind==='bullet'){
   if(m.first){m.first=false;return}
   const b=c.bullet,t=time-m.at!;m.pos.x=m.speed.x*t+m.from.x;m.pos.y=b.g*t*t/2+m.speed.y*t+m.from.y;m.rotation+=b.rotation_speed*(m.from.x<m.to.x?-1:1)*(1/30)
   if(t+1/30<b.flight_time)return
   this.createMine(m.hero,m.to,time,b.level);this.removeLater(m);return
  }
  if(m.phase==='spawn'){
   if(nativeLogicAnimationFrame(data.frames.spawn,time,m.spriteAt,false,30).runs===0)return
   m.phase='idle';m.animation='idle';m.loop=true
  }
  if(m.phase==='idle'){
   if(!m.polled||!m.trigger&&!m.lastTargets){m.polled=true;m.lastTargets=this.targets(m,c.trigger_radius,c.aura.vis_bans_trigger).length>0;return}
   m.phase='explode';m.animation='explode';m.loop=false;m.spriteAt=time;m.z=data.objectZ;this.onSound(c.sound_hit)
   for(const e of this.targets(m,c.aura.radius,c.aura.vis_bans)){
    const order=this.onCreateDamage();let value=c.ignore_dist_factor?c.damage_min+Math.floor(this.random()*(c.damage_max-c.damage_min+1)):Math.floor(c.damage_max-(c.damage_max-c.damage_min)*ellipseDistanceFactor(e.path.position,m.pos,c.aura.radius))
    if(c.damage_factor!==undefined)value=Math.ceil(value*c.damage_factor)
    this.onDamage(e,value,c.damage_type,c.reduce_armor,order)
   }
   this.onCrater(m.pos);this.onExplode(m.hero)
  }
  if(m.phase==='explode'&&nativeLogicAnimationFrame(data.frames.explode,time,m.spriteAt,false,30).runs>0)this.removeLater(m)
 }
 remove(m:BolinMineModel){this.models.delete(m);return true}
}
