import {SmokeRuntime} from './SmokeRuntime.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {EnemyInstance} from './GameSession'
import type {Point,LevelData} from './types'
export interface SmokeArea {id:number;pos:Point;born:number;duration:number;endedAt?:number;lastApply:number;decals:{pos:Point;animationAt:number}[]}
interface SmokeTemplate {aura?:{duration:number[];radius:number;cycle_time:number;vis_flags:number;vis_bans:number};modifier?:{duration:number};tween?:{props:{keys:[number,number][]}[]}}
export class EnemySkills {
 defer=false
 readonly runtime:SmokeRuntime
 onDeparture:(enemy:EnemyInstance)=>void=()=>{}
 readonly areas:SmokeArea[]=[]
 readonly casting=new Map<number,{at:number;activated:boolean}>()
 onSound:(name:string)=>void=()=>{}
 onHealthBarAlpha:(enemy:EnemyInstance,alpha:number)=>void=()=>{}
 private templates:Record<string,SmokeTemplate>
 private level:LevelData
 private random:()=>number
 private nextId=1
 constructor(level:LevelData,templates:Record<string,SmokeTemplate>,random:()=>number){this.level=level;this.templates=templates;this.random=random;const a=templates.aura_shadow_blades_smoke.aura!;this.runtime=new SmokeRuntime(this,random,{duration:a.duration[1],radius:a.radius,cycle:a.cycle_time,visFlags:a.vis_flags,visBans:a.vis_bans,modifierDuration:templates.mod_shadow_blades_smoke.modifier!.duration,fadeDuration:Math.round(templates.decal_shadow_blades_smoke.tween!.props[0].keys.at(-1)![0]*30)*(1/30)})}
 areaGeometry(pos:Point){
  let pi=0,ni=0,distance=Infinity
  for(const [index,lanes]of this.level.paths.paths.entries())for(const [node,p]of lanes[0].entries()){const d=(p.x-pos.x)**2+(p.y-pos.y)**2;if(d<distance){pi=index;ni=node;distance=d}}
  const lanes=this.level.paths.paths[pi],node=(spi:number,index:number)=>({...lanes[spi][Math.max(0,Math.min(lanes[spi].length-1,index))]})
  return {pos:node(0,ni),decals:[node(0,ni-4),node(0,ni),node(0,ni+4),node(1,ni-2),node(1,ni+2),node(2,ni-2),node(2,ni+2)]}
 }
 /** Returns true while the native shadow-blade coroutine owns its main. */
 wantsShadow(e:EnemyInstance){const b=e.template.smokebomb;if(!b)return false;const maxHp=Array.isArray(e.template.health.hp_max)?e.template.health.hp_max[1]:e.template.health.hp_max;return e.hp>0&&!e.template.unit.is_stunned&&e.hp<maxHp*b.hp_threshold&&e.template.enemy.can_do_magic!==false&&e.path.remainingNodes>=b.min_nodes_to_exit}
 canStartShadow:(enemy:EnemyInstance)=>boolean=()=>true
 advanceShadow(e:EnemyInstance,time:number):boolean{
  const b=e.template.smokebomb;if(!b||!this.defer)return false
  let s=this.casting.get(e.id)
  const maxHp=Array.isArray(e.template.health.hp_max)?e.template.health.hp_max[1]:e.template.health.hp_max
  if(!s&&this.canStartShadow(e)&&!e.meleeAttack&&this.wantsShadow(e)){s={at:time,activated:false};this.casting.set(e.id,s);e.skillLocked=true;e.motionSpeed={x:0,y:0};e.visualOverride={name:b.animation,at:time,loop:false,facingLeft:e.visualOverride?.facingLeft??false}}
  if(!s)return false
  if(!s.activated){
   if(time-s.at<Math.round(b.delay*30)*(1/30)){
    if(e.hp<=0||e.template.unit.is_stunned){this.casting.delete(e.id);e.skillLocked=false;e.visualOverride=undefined;return false}
    return true
   }
   s.activated=true;this.onHealthBarAlpha(e,0);e.hp=maxHp;e.template.health.ignore_damage=true;e.template.vis.bans=0xffffffff;this.onSound(b.sound);this.runtime.queue(e,time)
  }
  const frames=Math.round((e.template.webAnimationDurations?.[b.animation]??44/30)*30)
  if(nativeLogicAnimationFrame(frames,time,s.at,false,30).runs>0){this.onDeparture(e);this.casting.delete(e.id)}
  return true
 }
 advance(time:number,enemies:EnemyInstance[]):EnemyInstance[]{
  time=Math.round(time*30)/30
  const removed:EnemyInstance[]=[]
  for(const e of enemies){
   if(e.hp<=0||e.escapedAt!==undefined){e.skillLocked=false;if(!e.deathManaged)e.visualOverride=undefined;continue}
   if(e.name==='enemy_crow'){
    const end=e.born+Math.round((e.template.webAnimationDurations?.in??14/30)*30)/30
    e.skillLocked=time<end;if(e.skillLocked)e.visualOverride={name:'in',at:e.born};else if(e.visualOverride?.name==='in')e.visualOverride=undefined
   }
   const b=e.template.smokebomb;if(!b||this.defer)continue
   const maxHp=Array.isArray(e.template.health.hp_max)?e.template.health.hp_max[1]:e.template.health.hp_max
   let state=this.casting.get(e.id)
   if(!state&&e.hp<maxHp*b.hp_threshold&&e.template.enemy.can_do_magic!==false&&e.path.remainingNodes>=b.min_nodes_to_exit){state={at:time,activated:false};this.casting.set(e.id,state);e.skillLocked=true;e.visualOverride={name:b.animation,at:time}}
   if(!state)continue
   if(e.template.unit.is_stunned&&!state.activated){this.casting.delete(e.id);e.skillLocked=false;e.visualOverride=undefined;continue}
   const age=time-state.at
   if(!state.activated&&age>=Math.round(b.delay*30)/30){
    state.activated=true;this.onHealthBarAlpha(e,0);e.hp=maxHp;e.template.health.ignore_damage=true;e.template.vis.bans=0xffffffff
    this.onSound(b.sound)
    const geometry=this.areaGeometry(e.path.position),a=this.templates[b.smoke_t].aura!
    this.areas.push({id:this.nextId++,pos:geometry.pos,born:time,duration:a.duration[1],lastApply:time-a.cycle_time,decals:geometry.decals.map(pos=>({pos,animationAt:time-Math.floor(this.random()*16)/30}))})
   }
   if(state.activated&&age>=Math.round((e.template.webAnimationDurations?.[b.animation]??44/30)*30)/30){removed.push(e);this.casting.delete(e.id)}
  }
  const aura=this.templates.aura_shadow_blades_smoke.aura!,duration=this.templates.mod_shadow_blades_smoke.modifier!.duration
  for(let i=this.areas.length-1;i>=0;i--){
   const area=this.areas[i];if('native'in area)continue
   if(time-area.born>area.duration&&area.endedAt===undefined)area.endedAt=time
   if(area.endedAt!==undefined){if(time-area.endedAt>=1/3)this.areas.splice(i,1);continue}
   if(time-area.lastApply<aura.cycle_time)continue
   area.lastApply=time
   for(const e of enemies){
    if(e.hp<=0||e.escapedAt!==undefined||e.template.vis.flags&aura.vis_bans||e.template.vis.bans&aura.vis_flags)continue
    const dx=e.path.position.x-area.pos.x,dy=e.path.position.y-area.pos.y,aspect=.7*.7
    if(aspect*dx*dx+dy*dy>aura.radius*aura.radius*aspect)continue
    if(e.smokeDodgeUntil===undefined||e.smokeDodgeUntil<time)e.smokeDodgeVisualAt=time
    e.smokeDodgeUntil=time+duration
   }
  }
  return removed
 }
}
