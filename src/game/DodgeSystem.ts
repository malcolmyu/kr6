import type {EnemyInstance} from './GameSession'
import type {SoldierInstance,MeleeAttack} from './BarracksCombat'
import type {Point} from './types'
export interface DodgeState {chance:number;ts:number;ranged?:boolean;requires_magic?:boolean;cooldown?:number;active:boolean;silent?:boolean;animation?:string;show_pop?:boolean;pop?:string;time_before_hit?:number;last_check_ts?:number;last_doge_ts?:number;last_attack?:MeleeAttack}
export interface BlockPop {id:number;at:number;pos:Point;rotation:number;frame?:string;name?:string;removalQueuedAt?:number}
export interface NativePopTemplate {pop_over_target?:boolean;pop_y_offset:number;render:{sprites:{name:string}[]}}
export class DodgeSystem {
 readonly pops:BlockPop[]=[]
 deferDamagePops=false
 private damagePops:{order?:number;args:Parameters<DodgeSystem['showDamage']>}[]=[]
 flushDamagePops(){const pending=this.damagePops.splice(0).sort((a,b)=>(a.order??Infinity)-(b.order??Infinity));this.deferDamagePops=false;try{for(const p of pending)this.showDamage(...p.args)}finally{this.deferDamagePops=true}}
 onCreate:(name:string,pop:BlockPop)=>void=()=>{}
 onRemove:(pop:BlockPop)=>void=()=>{}
 private create(name:string,time:number,pos:Point,frame?:string){
  const p:BlockPop={id:this.nextId++,at:time,pos,rotation:0,frame,name};this.pops.push(p);this.onCreate(name,p)
  p.rotation=(-21+Math.floor(this.random()*43))*Math.PI/180
 }
 private nextId=1
 private random:()=>number
 private templates:Record<string,NativePopTemplate>
 constructor(random:()=>number=Math.random,templates:Record<string,NativePopTemplate>={}){this.random=random;this.templates=templates}
 check(s:SoldierInstance|EnemyInstance,time:number,ranged=false,attack?:MeleeAttack){
  const d=s.dodge;if(!d)return false
  d.last_check_ts=time
  if(s.template.unit?.is_stunned||d.requires_magic&&(!('path'in s)||s.template.enemy.can_do_magic===false)||ranged&&!d.ranged||d.cooldown!==undefined&&time-d.ts<=d.cooldown||attack!==undefined&&attack.damage_type&33554432)return false
  if(this.random()>d.chance)return false
  d.last_doge_ts=time;d.last_attack=attack;d.active=true;return true
 }
 /** Native smoke installs a real dodge component. Legacy isolated callers may
  * still supply the older expiry flag without a running modifier entity. */
 checkEnemy(e:EnemyInstance,time:number,ranged=false,attack?:MeleeAttack){
  if(e.dodge)return this.check(e,time,ranged,attack)
  return e.smokeDodgeUntil!==undefined&&time<=e.smokeDodgeUntil&&!e.template.unit.is_stunned&&!(attack?.damage_type&&attack.damage_type&33554432)
 }
 show(s:SoldierInstance|EnemyInstance,time:number){
  const d=s.dodge;if(!d)return
  const name=d.pop??'pop_miss',config=this.templates[name]
  const pos='path'in s?s.path.position:s.pos
  this.create(name,time,{x:pos.x,y:pos.y+(s.template.unit?.pop_offset?.y??0)+(config?.pop_y_offset??30)},config?.render.sprites[0].name)
  if(d.silent&&!d.animation)d.active=false
 }
 showDamage(source:SoldierInstance|EnemyInstance|undefined,target:SoldierInstance|EnemyInstance,time:number,names:string[]|undefined,chance?:number,conds?:number,result=2,order?:number){
  if(this.deferDamagePops){this.damagePops.push({order,args:[source,target,time,names,chance,conds,result,order]});return}
  if(!names?.length)return
  if(chance!==undefined&&this.random()>=chance)return
  if(conds!==undefined&&!(conds&result))return
  const name=names[Math.floor(this.random()*names.length)],config=this.templates[name]
  if(!config)throw new Error(`Missing native pop ${name}`)
  const owner=config.pop_over_target||!source?target:source,pos='pos'in owner?owner.pos:owner.path.position,unit=owner.template.unit
  const y=unit?.pop_offset?.y??(owner===target?unit?.hit_offset.y:0)??0
  this.create(name,time,{x:pos.x,y:pos.y+y+config.pop_y_offset},config.render.sprites[0].name)
 }
 /** Original SU.create_bullet_pop uses projectile position, without unit offsets
  * or a damage-result gate, once per landing even if no enemies are present. */
 showAt(pos:Point,time:number,names:string[]|undefined,chance?:number){
  if(!names?.length||chance!==undefined&&this.random()>=chance)return
  const name=names[Math.floor(this.random()*names.length)],config=this.templates[name]
  if(!config)throw new Error(`Missing native pop ${name}`)
  this.create(name,time,{x:pos.x,y:pos.y+config.pop_y_offset},config.render.sprites[0].name)
 }
 beginTick(time:number){for(let i=this.pops.length-1;i>=0;i--){const p=this.pops[i];if(p.removalQueuedAt!==undefined&&time>p.removalQueuedAt)this.pops.splice(i,1)}}
 /** Original tween9 queues removal at its final key, before health11/pops15.
  * Keep the model until the following insertion/removal flush. */
 advanceOne(p:BlockPop,time:number){if(time>p.at&&p.removalQueuedAt===undefined&&time-p.at>=.9){p.removalQueuedAt=time;this.onRemove(p)}}
 advance(time:number,orderedPops:Iterable<BlockPop>=this.pops){
  this.beginTick(time)
  for(const p of orderedPops)this.advanceOne(p,time)
 }
}
export function blockPopScale(age:number){
 const keys=[[0,.75],[.1,1.2],[.2,1],[.3,1.1],[.4,1],[.9,1]]
 for(let i=1;i<keys.length;i++)if(age<keys[i][0]){const a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*(age-a[0])/(b[0]-a[0])}
 return 1
}
