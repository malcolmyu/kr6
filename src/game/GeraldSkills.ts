import {soldierIsDead} from './SoldierHealth.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {GeraldModifierRuntime} from './GeraldModifierRuntime.ts'
import type {HeroUnit} from './HeroSystem'
import type {SoldierInstance} from './BarracksCombat'
import type {Point} from './types'
export type GeraldSkill='skill_a'|'skill_b'
export interface GeraldModifier {armor_inc:number;spiked_armor?:number;modifier:{duration:number};render:{sprites:{prefix:string}[]}}
export interface GeraldBuff {key:string;kind:GeraldSkill;target:SoldierInstance;born:number;duration:number;endingAt?:number}
interface Cast {hero:HeroUnit;kind:GeraldSkill;at:number;targets:SoldierInstance[];applied:boolean}
/** Original Gerald A/B coroutines. Unpurchased skills remain disabled. */
export class GeraldSkills {
 deferModifiers=false
 readonly nativeModifiers=new GeraldModifierRuntime()
 readonly buffs=new Map<string,GeraldBuff>()
 readonly levels:Record<GeraldSkill,number>={skill_a:0,skill_b:0}
 private lastCast:Record<GeraldSkill,number>={skill_a:-16,skill_b:-24}
 private cast?:Cast
 private heroId?:number
 private modifiers:Record<GeraldSkill,GeraldModifier>
 candidates?:(hero:HeroUnit)=>SoldierInstance[]
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 constructor(templates:Record<string,GeraldModifier>){this.modifiers={skill_a:structuredClone(templates.mod_gerald_skill_a),skill_b:structuredClone(templates.mod_gerald_skill_b)}}
 get casting(){return this.cast!==undefined}
 configure(nodes:string[]){
  this.levels.skill_a=nodes.includes('hero_gerald_upg_sa2')?3:nodes.includes('hero_gerald_upg_sa1')?2:nodes.includes('hero_gerald_skill_a')?1:0
  this.levels.skill_b=nodes.includes('hero_gerald_upg_sb2')?3:nodes.includes('hero_gerald_upg_sb1')?2:nodes.includes('hero_gerald_skill_b')?1:0
  this.modifiers.skill_a.modifier.duration=[4,4,6,10][this.levels.skill_a]
  this.modifiers.skill_b.armor_inc=this.levels.skill_b===3?.4:.3
  this.modifiers.skill_b.spiked_armor=this.levels.skill_b>=2?.6:.3
 }
 apply(kind:GeraldSkill,target:SoldierInstance,time:number){
  if(this.deferModifiers){this.nativeModifiers.queue(kind,target,this.modifiers[kind]);return}
  if(soldierIsDead(target))return
  const vis=target.template.vis??{flags:1025,bans:0};if(vis.bans&4)return
  const key=`gerald-${kind}-${target.id}`,previous=this.buffs.get(key)
  if(previous){previous.born=time;return}
  const mod=this.modifiers[kind];if(!mod)return
  target.buffs??=new Map();target.buffs.set(key,{armor:mod.armor_inc,magicArmor:mod.armor_inc,spikedArmor:mod.spiked_armor??0})
  this.buffs.set(key,{key,kind,target,born:time,duration:mod.modifier.duration})
  if(kind==='skill_a')this.onEffect('fx_gerald_skill_a',target.pos,time)
 }
 /** A rally cancels a yielding wait only before its deadline; a due hit still commits. */
 interruptForRally(time:number,hero:HeroUnit,soldiers:SoldierInstance[]){
  const cast=this.cast;if(!cast)return
  const delay=cast.kind==='skill_a'?20/30:17/30,animation=cast.kind==='skill_a'?'inspire_courage':'shield_of_retribution'
  if(!cast.applied&&time-cast.at<delay){hero.scriptLocked=false;hero.visualOverride=undefined;hero.idleVisual={name:animation,at:cast.at,loop:false};hero.actionYieldUntil=time+1/30;this.cast=undefined;return}
  this.advance(time,hero,soldiers,false)
  if(this.cast){hero.scriptLocked=false;hero.visualOverride=undefined;hero.idleVisual={name:'idle',at:cast.at,loop:true};hero.actionYieldUntil=time+1/30;this.cast=undefined}
 }
 advance(time:number,hero:HeroUnit|undefined,soldiers:SoldierInstance[],mayStart=true,afterMelee=false){
  if(!this.deferModifiers)time=Math.round(time*30)/30
  for(const [key,buff]of this.buffs){
   const start=buff.kind==='skill_a'?6/30:12/30
   if(buff.endingAt===undefined && time-buff.born+1e-9>=start && (soldierIsDead(buff.target)||!soldiers.includes(buff.target)||time-buff.born+1e-9>=buff.duration))buff.endingAt=time
   const tail=buff.kind==='skill_a'?11/30:1
   if(buff.endingAt!==undefined && time-buff.endingAt+1e-9>=tail){buff.target.buffs?.delete(key);this.buffs.delete(key)}
  }
  if(hero && this.heroId!==hero.id){this.heroId=hero.id;this.lastCast={skill_a:(this.deferModifiers?time:hero.born)-16,skill_b:(this.deferModifiers?time:hero.born)-(this.levels.skill_b===3?20:24)}}
  const cast=this.cast
  if(cast){
   const animation=cast.kind==='skill_a'?'inspire_courage':'shield_of_retribution'
   const delay=cast.kind==='skill_a'?20/30:17/30,dead=cast.hero.hp<=0
   if(dead&&(!this.deferModifiers||!cast.applied&&time-cast.at<delay)||!cast.hero.scriptLocked||cast.hero.visualOverride?.name!==animation){
    if(cast.hero.visualOverride?.name===animation){cast.hero.scriptLocked=false;cast.hero.visualOverride=undefined}
    // A pre-deadline y_hero_wait abort preserves its cast pose until the next
    // outer death call. A due payload still commits before that continuation.
    if(dead&&this.deferModifiers)cast.hero.idleVisual={name:animation,at:cast.at,loop:false}
    this.cast=undefined;return
   }
   if(!cast.applied && time-cast.at>=delay){
    cast.applied=true;this.lastCast[cast.kind]=cast.at
    cast.hero.xpQueued+=(cast.kind==='skill_a'?[0,16,32,48]:[0,24,48,72])[this.levels[cast.kind]]
    if(cast.kind==='skill_a'){if(this.deferModifiers)this.nativeModifiers.onEffect('decal_gerald_skill_a',cast.hero.pos,time);else this.onEffect('decal_gerald_skill_a',cast.hero.pos,time)}
    for(const target of cast.targets)this.apply(cast.kind,target,time)
   }
   const duration=cast.hero.template.webAnimationDurations[cast.hero.visualOverride!.name],finished=this.deferModifiers?dead||nativeLogicAnimationFrame(Math.round(duration*30),time,cast.at,false,30).runs>0:time-cast.at+1e-9>=duration
   if(finished){cast.hero.scriptLocked=false;cast.hero.visualOverride=undefined;if(this.deferModifiers){cast.hero.idleVisual={name:'idle',at:cast.at,loop:true};cast.hero.actionYieldUntil=(Math.round(time*30)+1)*(1/30)}this.cast=undefined}
   return
  }
  if(!mayStart||!hero || hero.hp<=0||hero.scriptLocked||hero.deploying||(!this.deferModifiers&&hero.moving)||hero.attack||hero.rangedUntil!==undefined)return
  if(!afterMelee&&this.levels.skill_a && time-this.lastCast.skill_a>16){
   const targets=(this.candidates?.(hero)??soldiers).filter(s=>{
    const vis=s.template.vis??{flags:1025,bans:0},dx=s.pos.x-hero.pos.x,dy=s.pos.y-hero.pos.y
    return s!==hero&&!soldierIsDead(s)&&s.target!==undefined&&!(vis.bans&8)&&!(vis.flags&2048)&&dx*dx+(dy/.7)**2<=60**2
   })
   if(targets.length){this.begin('skill_a',hero,targets,time);return}
   this.lastCast.skill_a=time-16+10/30-(this.deferModifiers?1e-6:0)
  }
  if(this.deferModifiers&&!afterMelee)return
  const cooldown=this.levels.skill_b===3?20:24
  if(this.levels.skill_b && hero.target && !hero.moving && time-this.lastCast.skill_b>cooldown)this.begin('skill_b',hero,[hero],time)
 }
 private begin(kind:GeraldSkill,hero:HeroUnit,targets:SoldierInstance[],time:number){
  this.cast={hero,kind,at:time,targets,applied:false};hero.scriptLocked=true;hero.attack=undefined
  hero.visualOverride={name:kind==='skill_a'?'inspire_courage':'shield_of_retribution',at:time}
  this.onSound(kind==='skill_a'?'HeroGeraldInspireCourageCast':'HeroGeraldShieldOfRetributionCast')
 }
}
export function geraldBuffPose(buff:GeraldBuff,time:number){
 const age=time-buff.born
 if(buff.kind==='skill_a')return buff.endingAt!==undefined?{name:'end',age:time-buff.endingAt,opacity:1,loop:false}:{name:age+1e-9<.2?'start':'idle',age,opacity:1,loop:age+1e-9>=.2}
 return {name:age+1e-9<.4?'start':'loop',age,opacity:buff.endingAt===undefined?1:Math.max(0,1-(time-buff.endingAt)),loop:age+1e-9>=.4}
}
