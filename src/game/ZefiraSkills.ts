import {ZefiraHammerRuntime} from './ZefiraHammerRuntime.ts'
import {ZefiraShieldRuntime} from './ZefiraShieldRuntime.ts'
import {recordEnemyDamage} from './EnemyDeath.ts'
import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import {predictDamage} from './Damage.ts'
import {EnemyModifiers} from './EnemyModifiers.ts'
export interface ZefiraCast {hero:HeroUnit;at:number;flip:boolean;hit:boolean}
export interface ZefiraShield {hero:HeroUnit;at:number;lastHit:number;endingAt?:number}
export interface ZefiraDecal {pos:Point;at:number}
const inside=(p:Point,c:Point,r:number)=>.7*.7*(p.x-c.x)**2+(p.y-c.y)**2<=r*r*(.7*.7)
const eligible=(e:EnemyInstance,p:Point,r:number,flags:number,bans:number)=>e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.bans&flags)&&!(e.template.vis.flags&bans)&&inside(e.path.position,p,r)
/** Zefira's original area attack and independent shielding-blades coroutine. */
export class ZefiraSkills {
 deferHammer=false
 readonly nativeHammer:ZefiraHammerRuntime
 deferShield=false
 readonly nativeShield:ZefiraShieldRuntime
 readonly modifiers=new EnemyModifiers()
 readonly decals:ZefiraDecal[]=[]
 cast?:ZefiraCast
 shield?:ZefiraShield
 levelA=0
 levelB=0
 cooldownA=12
 cooldownB=18
 private lastA=0
 private lastB?:number
 targetValid:(enemy:EnemyInstance)=>boolean=()=>true
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
 private random:()=>number
 private onKill:(e:EnemyInstance)=>void
 constructor(random:()=>number=Math.random,onKill:(e:EnemyInstance)=>void=()=>{}){this.random=random;this.onKill=onKill;this.nativeShield=new ZefiraShieldRuntime(this,random);this.nativeHammer=new ZefiraHammerRuntime(this,random)}
 configure(nodes:string[]){
  this.levelA=nodes.includes('upg_sa2')?3:nodes.includes('upg_sa1')?2:nodes.includes('skill_a')?1:0
  this.levelB=nodes.includes('upg_sb2')?3:nodes.includes('upg_sb1')?2:nodes.includes('skill_b')?1:0
  this.cooldownA=12*(nodes.includes('upg_b')?.9:1);this.cooldownB=18*(nodes.includes('upg_b')?.9:1)
 }
 tryHammer(hero:HeroUnit,time:number,enemies:EnemyInstance[]){
  if(this.deferHammer)return this.nativeHammer.tryStart(hero,time)
  if(!this.levelA||this.cast||hero.attack||hero.scriptLocked||hero.rangedUntil!==undefined||!(time-this.lastA>this.cooldownA))return false
  // Attack selection tests min_count at the hero, while the hit uses a displaced centre.
  if(hero.target&&(hero.target.template.vis.bans&2||hero.target.template.vis.flags&128))return false
  this.random()
  if(!enemies.some(e=>this.targetValid(e)&&eligible(e,hero.pos,50,2,128)))return false
  this.cast={hero,at:time,flip:hero.facingLeft,hit:false};hero.scriptLocked=true;hero.visualOverride={name:'skill_1',at:time}
  hero.xpQueued+=[0,12,24,36][this.levelA];this.onSound('HeroZefiraDazzlingHammerCast');return true
 }
 startShield(hero:HeroUnit,time:number){
  this.shield={hero,at:time,lastHit:0};hero.buffs??=new Map();hero.buffs.set('zefira-shield',{armor:.3,magicArmor:.3,spikedArmor:0})
 }
 advance(time:number,hero:HeroUnit|undefined,enemies:EnemyInstance[]){
  time=Math.round(time*30)/30
  this.modifiers.advance(time)
  for(let i=this.decals.length-1;i>=0;i--)if(time-this.decals[i].at>=1.7)this.decals.splice(i,1)
  if(hero&&this.lastB===undefined)this.lastB=hero.born
  const c=this.deferHammer?undefined:this.cast
  if(c){
   if(c.hero.hp<=0||!c.hero.scriptLocked||c.hero.visualOverride?.name!=='skill_1'){
    if(c.hero.visualOverride?.name==='skill_1'){c.hero.visualOverride=undefined;c.hero.scriptLocked=false}this.cast=undefined
   }else{
    if(!c.hit&&time-c.at>=20/30){
     c.hit=true;this.lastA=c.at
     const pos={x:c.hero.pos.x+(c.flip?-40:40),y:c.hero.pos.y}
     for(const e of enemies)if(eligible(e,pos,50,8,128)){
      this.damage(e,[0,20,50,80][this.levelA]+Math.floor(this.random()*21),time)
      this.modifiers.stun(e,time)
     }
     this.onEffect('fx_zefira_skill_a_hit',pos,time);this.decals.push({pos,at:time})
    }
    if(time-c.at+1e-9>=46/30){c.hero.scriptLocked=false;c.hero.visualOverride=undefined;this.cast=undefined}
   }
  }
  if(!this.deferShield&&hero&&this.levelB&&hero.hp>0&&hero.target&&time-(this.lastB??time)>this.cooldownB&&enemies.some(e=>this.targetValid(e)&&eligible(e,hero.pos,80,8,0))){
   this.lastB=time;hero.xpQueued+=[0,18,36,54][this.levelB];this.startShield(hero,time);this.onSound('HeroZefiraShieldingBladesCast')
  }
  const s=this.shield
  if(s){
   if(s.endingAt===undefined&&time-s.at+1e-9>=8/30){
    if(s.hero.hp<=0||time-s.at>(this.levelB===3?6:4))s.endingAt=time
    else if(time-s.lastHit>=.25){
     s.lastHit=time
     for(const e of enemies)if(this.targetValid(e)&&eligible(e,s.hero.pos,45,8,0)){
      this.random();this.damage(e,2,time)
      const offset=e.template.unit.hit_offset;this.onEffect('fx_zefira_skill_b_hit',{x:e.path.position.x+offset.x,y:e.path.position.y+offset.y},time)
      if(this.levelB>=2)this.modifiers.slow(e,time)
     }
    }
   }
   if(s.endingAt!==undefined&&time-s.endingAt+1e-9>=19/30){s.hero.buffs?.delete('zefira-shield');this.shield=undefined}
  }
 }
 private damage(e:EnemyInstance,value:number,time:number){
  if(e.template.health.ignore_damage)return
  recordEnemyDamage(e,4,time)
  e.hp-=predictDamage({...e.template.health,hp:e.hp},{value,damage_type:4})
  if(e.hp<=0){e.diedAt=time;this.onKill(e)}
 }
}
export function zefiraShieldPose(s:ZefiraShield,time:number){return s.endingAt!==undefined?{name:'end',age:time-s.endingAt,loop:false}:time-s.at+1e-9<8/30?{name:'start',age:time-s.at,loop:false}:{name:'loop',age:time-s.at,loop:true}}
