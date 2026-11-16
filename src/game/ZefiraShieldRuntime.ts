import {adjustSoldierArmor} from './SoldierHealth.ts'
import data from '../../public/data/zefira-shield.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {ZefiraSkills} from './ZefiraSkills'
import type {Point} from './types'
interface Check {kind:'check';hero:HeroUnit;pos:Point;started?:number;skillTs?:number}
export interface NativeZefiraShield {kind:'shield';hero:HeroUnit;pos:Point;at:number;inserted:boolean;phase:'new'|'start'|'loop'|'end';name:string;ts:number;lastHit:number;queued?:boolean;buffKey:string}
interface Slow {kind:'slow';enemy:EnemyInstance;pos:Point;ts:number;applied?:boolean;queued?:boolean}
export type ZefiraShieldModel=Check|NativeZefiraShield|Slow
/** Shipped scripts_game7445/7488/7499/7590 and generic slow/mod lifecycle. */
export class ZefiraShieldRuntime {
 readonly shields:NativeZefiraShield[]=[]
 readonly slows=new Map<EnemyInstance,Slow>()
 onQueue:(name:string,model:ZefiraShieldModel)=>void=()=>{}
 onRemove:(model:ZefiraShieldModel)=>void=()=>{}
 findEnemies:(pos:Point,range:number)=>EnemyInstance[]=()=>[]
 onDamage:(enemy:EnemyInstance,value:number,time:number)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 present:(enemy:EnemyInstance)=>boolean=()=>true
 blockedTargetPresent:(hero:HeroUnit)=>boolean=hero=>!!hero.target
 private initialized=new WeakSet<HeroUnit>()
 private serial=1
 private owner:ZefiraSkills
 private random:()=>number
 constructor(owner:ZefiraSkills,random:()=>number){this.owner=owner;this.random=random}
 heroMain(hero:HeroUnit){if(!this.owner.levelB||this.initialized.has(hero))return;this.initialized.add(hero);this.onQueue('aura_zefira_skill_b_check',{kind:'check',hero,pos:{x:0,y:0}})}
 insert(m:ZefiraShieldModel,time:number){
  if(m.kind==='shield'){
   m.at=time;m.inserted=true;const a=data.aura_zefira_skill_b.aura;m.hero.buffs??=new Map();m.hero.buffs.set(m.buffKey,{armor:a.armor_inc,magicArmor:a.magic_armor_inc,spikedArmor:0,nativeApplied:true});adjustSoldierArmor(m.hero,a.armor_inc,a.magic_armor_inc);this.shields.push(m)
  }else if(m.kind==='slow'){
   const previous=this.slows.get(m.enemy);if(previous){previous.ts=time;return false}
   if(!this.present(m.enemy)||m.enemy.hp<=0||m.enemy.template.motion.invulnerable)return false
   m.ts=time;m.pos=m.enemy.path.position;m.applied=true;m.enemy.template.motion.max_speed*=data.mod_zefira_skill_b_slow.slow.factor;this.slows.set(m.enemy,m)
  }
  return true
 }
 advance(m:ZefiraShieldModel,time:number){
  const o=this.owner
  if(m.kind==='check'){
   if(m.started===undefined){m.started=m.skillTs=time;m.pos=m.hero.pos}
   if(time-m.skillTs!<=o.cooldownB||!this.blockedTargetPresent(m.hero))return
   if(!this.findEnemies(m.pos,data.aura_zefira_skill_b_check.aura.radius).length)return
   m.hero.xpQueued+=[0,18,36,54][o.levelB];m.skillTs=time
   const shield:NativeZefiraShield={kind:'shield',hero:m.hero,pos:{x:0,y:0},at:time,inserted:false,phase:'new',name:'start',ts:0,lastHit:0,buffKey:`native-zefira-shield-${this.serial++}`}
   this.onQueue('aura_zefira_skill_b',shield);o.onSound(data.aura_zefira_skill_b_check.sound_cast)
  }else if(m.kind==='shield'){
   if(m.queued)return
   if(m.phase==='new'){m.pos=m.hero.pos;m.ts=time;m.phase='start'}
   if(m.phase==='start'){if(nativeLogicAnimationFrame(8,time,m.ts,false,30).runs===0)return;m.phase='loop';m.name='loop'}
   if(m.phase==='loop'){
    const a=data.aura_zefira_skill_b.aura
    if(time-m.at>(o.levelB===3?6:a.duration)||m.hero.hp<=0){m.phase='end';m.name='end';m.ts=time}
    else if(time-m.lastHit>=a.cycle_time){
     m.lastHit=time
     for(const enemy of this.findEnemies(m.pos,a.radius)){
      const value=a.damage_min+Math.floor(this.random()*(a.damage_max-a.damage_min+1));this.onDamage(enemy,value,time)
      const p=enemy.path.position,offset=enemy.template.unit.hit_offset;this.onEffect(a.hit_fx,{x:p.x+offset.x,y:p.y+offset.y},time)
      if(o.levelB>=2)this.onQueue('mod_zefira_skill_b_slow',{kind:'slow',enemy,pos:{x:0,y:0},ts:time})
     }
    }
   }
   if(m.phase==='end'&&nativeLogicAnimationFrame(19,time,m.ts,false,30).runs>0){m.queued=true;this.onRemove(m)}
  }else if(!m.queued&&(!this.present(m.enemy)||m.enemy.hp<=0||time-m.ts>data.mod_zefira_skill_b_slow.modifier.duration)){m.queued=true;this.onRemove(m)}
 }
 remove(m:ZefiraShieldModel){
  if(m.kind==='shield'){const a=data.aura_zefira_skill_b.aura;adjustSoldierArmor(m.hero,-a.armor_inc,-a.magic_armor_inc);m.hero.buffs?.delete(m.buffKey);const i=this.shields.indexOf(m);if(i>=0)this.shields.splice(i,1)}
  else if(m.kind==='slow'){if(m.applied)m.enemy.template.motion.max_speed/=data.mod_zefira_skill_b_slow.slow.factor;if(this.slows.get(m.enemy)===m)this.slows.delete(m.enemy)}
  return true
 }
}
