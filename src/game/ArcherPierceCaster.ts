import {luaSort} from './LuaSort.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {resetSkillTimestamp} from './TowerSkillCooldown.ts'
import type {SkillClock} from './TowerSkillCooldown'
import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
interface Attack extends SkillClock {cooldown:number;shoot_time:number;targets:number;animation:string;sound:string;bullet_start_offset:Point[]}
interface Config {shooters_sids:number[];render:{sprites:{offset:Point}[]};tower:{range_offset:Point;damage_factor:number};attacks:{list:Attack[]};powers:{skill_a:{damage_min:number[];damage_max:number[]}}}
export interface ArcherPierceShot {name:string;from:Point;to:Point;target:EnemyInstance;min:number;max:number;factor:number;flight:number;source:TowerSite}
export interface ArcherPierceState {site:TowerSite;instance:number;level:number;ts:number;started?:number;phase:'idle'|'windup'|'animation';shooterIndex?:number;target?:EnemyInstance;targets?:EnemyInstance[]}
interface Shared {finished?:()=>boolean;shooterIndex:number;select:(index:number,time:number)=>void;animate:(index:number,target:Point,time:number)=>void;resetBasic:(time:number)=>void;flipLeft:(index:number)=>void}
/** Tower18610 A branch. The tower owns this animation; ordinary shooter child
 * coroutines continue independently. Projectile insertion/hit is a separate phase. */
export class ArcherPierceCaster {
 readonly states=new Map<string,ArcherPierceState>()
 onSound:(name:string)=>void=()=>{}
 onShot:(shot:ArcherPierceShot,time:number)=>void=()=>{}
 private config:Config
 constructor(config:Config){this.config=config}
 resetSkillCooldowns(site:TowerSite,time:number){const state=this.states.get(site.id),ts=resetSkillTimestamp(this.config.attacks.list[1],time);if(state&&ts!==undefined)state.ts=ts}
 private state(site:TowerSite){
  let s=this.states.get(site.id)
  if(!s||s.instance!==(site.instance??0)){s={site,instance:site.instance??0,level:0,ts:0,phase:'idle'};this.states.set(site.id,s)}
  return s
 }
 syncUpgrades(site:TowerSite,time:number){const s=this.state(site),level=site.powerLevels?.skill_a??0;if(level!==s.level){s.level=level;if(level===1)s.ts=time-this.config.attacks.list[1].cooldown}}
 advance(site:TowerSite,time:number,find:(forecast?:number)=>EnemyInstance[],shared:Shared){
  const s=this.state(site),a=this.config.attacks.list[1],upgrades=()=>this.syncUpgrades(site,time)
  if(s.phase==='windup'){
   if(time-s.started!<a.shoot_time){upgrades();return true}
   const fresh=find(),target=fresh[0]??s.target!,pool=fresh.length?fresh:s.targets!,left=target.path.position.x<site.pos.x,selected=[target]
   for(let i=2;i<=a.targets;i++){
    const e=pool[(i-1)%pool.length]
    if(left?e.path.position.x<=site.pos.x:e.path.position.x>=site.pos.x)selected.push(e)
    else if(i>1)selected.push(selected[i-2])
   }
   const distance=(e:EnemyInstance)=>(site.pos.x-e.path.position.x)**2+(site.pos.y-e.path.position.y)**2
   const ordered=luaSort(selected,(x,y)=>distance(x)>distance(y)),index=s.shooterIndex!,sid=this.config.shooters_sids[index],offset=this.config.render.sprites[sid-1].offset
   if(ordered[0].path.position.x<site.pos.x)shared.flipLeft(index)
   const damageLevel=site.powerLevels?.skill_a??s.level
   for(const [i,e]of ordered.entries()){
    const p=e.path.position,o=this.config.tower.range_offset,start=a.bullet_start_offset[p.y>site.pos.y+o.y?0:1],hit=e.template.unit.hit_offset
    // The ray's fixed endpoint uses the target sprite flip, unlike the generic
    // ray hit FX which adds the unflipped unit hit offset.
    const flip=e.visualOverride?.facingLeft??e.path.direction.x<0
    this.onShot({name:`bullet_archers_skill_a_lvl${s.level}`,from:{x:site.pos.x+offset.x+start.x*(p.x>site.pos.x+o.x?1:-1),y:site.pos.y+offset.y+start.y},to:{x:p.x+hit.x*(flip?-1:1),y:p.y+hit.y},target:e,min:this.config.powers.skill_a.damage_min[damageLevel-1],max:this.config.powers.skill_a.damage_max[damageLevel-1],factor:this.config.tower.damage_factor*(site.damageFactor??1),flight:.2+(i+1)*6/30,source:site},time)
   }
   s.phase='animation'
  }
  if(s.phase==='animation'){
   if(!(shared.finished?shared.finished():nativeLogicAnimationFrame(58,time,s.started!,false,30).runs>0))return true
   s.ts=s.started!;shared.resetBasic(s.started!);shared.select(s.shooterIndex!,time);s.phase='idle';s.started=undefined;s.target=undefined;s.targets=undefined
  }
  if(site.towerBlocked)return true
  upgrades()
  if(s.level>0&&time-s.ts>a.cooldown){
   const targets=find(a.shoot_time),target=targets[0]
   if(!target)s.ts=time-a.cooldown+10/30-1e-6
   else{
    let index=(shared.shooterIndex+1)%this.config.shooters_sids.length;if(index>=2)index=0
    s.started=time;s.target=target;s.targets=targets;s.shooterIndex=index;s.phase='windup';shared.select(index,time);shared.animate(index,target.path.position,time);this.onSound(a.sound);return true
   }
  }
  return false
 }
}
