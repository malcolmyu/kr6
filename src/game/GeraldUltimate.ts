import {recordEnemyDamage} from './EnemyDeath.ts'
import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import {EnemyModifiers} from './EnemyModifiers.ts'
import {predictDamage} from './Damage.ts'
import {soldierDamageFactor} from './SoldierHealth.ts'
interface Cast {hero:HeroUnit;target:EnemyInstance;at:number;initialAt?:number;hit:boolean}
interface Pulse {at:number;pos:Point;excludedId:number}
const inside=(p:Point,c:Point,r:number)=>.7*.7*(p.x-c.x)**2+(p.y-c.y)**2<=r*r*(.7*.7)
export class GeraldUltimate {
 enabled=false
 cast?:Cast
 private pulses:Pulse[]=[]
 private last?:number
 private modifiers:EnemyModifiers
 private random:()=>number
 private onKill:(enemy:EnemyInstance)=>void
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number,transform?:{flipX?:boolean})=>void=()=>{}
 targetValid:(enemy:EnemyInstance)=>boolean=()=>true
 constructor(modifiers:EnemyModifiers,random:()=>number=Math.random,onKill:(enemy:EnemyInstance)=>void=()=>{}){this.modifiers=modifiers;this.random=random;this.onKill=onKill}
 configure(nodes:string[]){this.enabled=nodes.includes('ulti')}
 advance(time:number,hero:HeroUnit|undefined,enemies:EnemyInstance[]):boolean{
  for(let i=this.pulses.length-1;i>=0;i--){const p=this.pulses[i];if(time<=p.at)continue
   for(const e of enemies)if(e.id!==p.excludedId&&e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.flags&1024)&&!(e.template.vis.bans&8)&&inside(e.path.position,p.pos,50)){
    this.random();this.damage(e,150,time);this.modifiers.stun(e,time,1,'mod_gerald_ultimate_hit_stun')
   }
   this.pulses.splice(i,1)
  }
  if(hero&&this.last===undefined)this.last=hero.born-25
  const c=this.cast
  if(c){
   if(c.hero.hp<=0||!c.hero.scriptLocked||c.hero.visualOverride?.name!=='ultimate'){
    if(c.hero.visualOverride?.name==='ultimate'){c.hero.visualOverride=undefined;c.hero.scriptLocked=false}this.cast=undefined;if(c.hero.hp>0)c.hero.actionYieldUntil=time+1/30;return true
   }
   if(c.initialAt===undefined&&time-c.at>=16/30){
    c.initialAt=time
    const targets=enemies.filter(e=>e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.flags&128)&&this.targetValid(e)&&inside(e.path.position,c.hero.pos,60))
    if(!targets.includes(c.target))targets.push(c.target)
    for(const e of targets)this.modifiers.stun(e,time,.5,'mod_gerald_ultimate_initial_stun')
    this.onSound('HeroDivineBladeImpact')
   }
   if(c.initialAt!==undefined&&!c.hit&&time-c.initialAt>=2-16/30){
    c.hit=true;this.last=c.initialAt;this.random()
    this.damage(c.target,Math.ceil(soldierDamageFactor(c.hero)*200),time)
    this.modifiers.stun(c.target,time,1,'mod_gerald_ultimate_hit_stun')
    const pos={x:c.hero.pos.x+(c.hero.facingLeft?-20:20),y:c.hero.pos.y+5}
    this.pulses.push({at:time,pos,excludedId:c.target.id})
    this.onEffect('decal_gerald_ultimate',{...c.hero.pos},time,{flipX:c.hero.facingLeft})
    c.hero.xpQueued+=25;c.hero.readyAt=Math.max(c.hero.readyAt,c.initialAt+2)
   }
   if(time-c.at+1e-9>=92/30){
    c.hero.scriptLocked=false;c.hero.visualOverride=undefined;c.hero.actionYieldUntil=time+1/30;this.cast=undefined
   }
   return true
  }
  if(!this.enabled||!hero||hero.hp<=0||hero.scriptLocked||hero.deploying||hero.moving||hero.attack||!hero.target||hero.target.hp<=0||hero.rangedUntil!==undefined||time-(this.last??time)<=25)return false
  this.cast={hero,target:hero.target,at:time,hit:false};hero.scriptLocked=true;hero.visualOverride={name:'ultimate',at:time}
  this.onSound('HeroGeraldDivineBladeCast');this.onSound('HeroGeraldTauntUltimate');return true
 }
 private damage(e:EnemyInstance,value:number,time:number){if(e.hp<=0||e.escapedAt!==undefined||e.template.health.ignore_damage)return;recordEnemyDamage(e,1,time);e.hp-=predictDamage({...e.template.health,hp:e.hp},{value,damage_type:1});if(e.hp<=0){e.diedAt=time;this.onKill(e)}}
}
