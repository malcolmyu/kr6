import {RoyalRuntime} from './RoyalRuntime.ts'
import data from '../../public/data/royal-edict.json' with {type:'json'}
import type {TowerSite} from './TowerSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Control {range:number;cooldown:number;is_global:boolean;mods:string[];sound_cast:string;sound_cast_upgraded:string;gold_mod?:string}
interface BuffConfig {damage_factor:number;range_factor:number;respawn_barracks:boolean;reset_skills_cd:boolean;modifier:{duration:number};confetti?:string;confetti_range:number;confetti_cycle_time:number}
export interface RoyalCast {native?:boolean;id:number;at:number;pos:Point;global:boolean;goldEnabled:boolean;goldDuration:number;goldCheckedAt:number;goldTargets:Set<number>}
export interface RoyalBuff {site:TowerSite;born:number;loopAt:number;expiresAt:number;damageFactor:number;rangeFactor:number;lastConfetti:number}
/** Original royal_edict insert and tower-factor modifier. Upgrade patches remain explicit. */
export class RoyalEdictSystem {
  defer=false
  readonly runtime:RoyalRuntime
  readonly casts:RoyalCast[]=[]
  readonly buffs=new Map<string,RoyalBuff>()
  control:Control
  modifier:BuffConfig
  onGold:(amount:number,pos:Point)=>void=()=>{}
  private goldBuffs=new Map<number,{enemy:EnemyInstance;expiresAt:number}>()
  onSound:(name:string)=>void=()=>{}
  onRespawn:(site:TowerSite)=>void=()=>{}
  onResetSkills:(site:TowerSite)=>void=()=>{}
  onConfetti:(pos:Point,time:number)=>void=()=>{}
  private sites:TowerSite[]
  private templates:Record<string,{tower?:{can_be_mod?:boolean;blocked?:boolean}}>
  private random:()=>number
  private nextId=1
  constructor(sites:TowerSite[],templates:Record<string,{tower?:{can_be_mod?:boolean;blocked?:boolean}}>,random:()=>number) {
    this.runtime=new RoyalRuntime(this,random)
    this.sites=sites;this.templates=templates;this.random=random
    this.control=structuredClone(data.templates.power_royal_edict_control) as Control
    this.modifier=structuredClone(data.templates.mod_power_royal_edict_towerbuff) as BuffConfig
  }
  configure(upgrades:string[]) {
    if(this.buffs.size)throw new Error('Cannot change royal-edict upgrades during an active cast')
    this.control=structuredClone(data.templates.power_royal_edict_control) as Control;this.modifier=structuredClone(data.templates.mod_power_royal_edict_towerbuff) as BuffConfig
    for(const name of upgrades) {
      const upgrade=data.upgrades[name as keyof typeof data.upgrades]
      if(!upgrade)throw new Error(`Unknown royal-edict upgrade ${name}`)
      for(const patch of upgrade.patches)for(const template of patch.templates) {
        const root=template==='power_royal_edict_control'?this.control:template==='mod_power_royal_edict_towerbuff'?this.modifier:undefined
        if(!root)continue
        for(const path of patch.paths) {
          const parts=path.split('.');let target=root as unknown as Record<string,unknown>
          for(const part of parts.slice(0,-1))target=target[part] as Record<string,unknown>
          const key=parts.at(-1)!,value=patch.value
          target[key]=patch.operators==='set'?value:patch.operators==='mul'?Number(target[key])*Number(value):Number(target[key])+Number(value)
        }
      }
    }
  }
  cast(pos:Point,time:number) {
    const cast:RoyalCast={id:this.nextId++,at:time,pos:{...pos},global:this.control.is_global,goldEnabled:!!this.control.gold_mod,goldDuration:this.modifier.modifier.duration,goldCheckedAt:time-10/30,goldTargets:new Set<number>()};this.casts.push(cast)
    if(this.defer){cast.native=true;this.runtime.queue(cast);return cast}
    for(const site of this.sites) {
      if(!site.tower || site.building)continue
      const tower=this.templates[site.tower]?.tower
      if(!(site.canBeMod??tower?.can_be_mod) || (site.towerBlocked??tower?.blocked))continue
      const dx=site.pos.x-pos.x,dy=site.pos.y-pos.y
      if(!cast.global && dx*dx+dy*dy/(.7*.7)>this.control.range**2)continue
      const current=this.buffs.get(site.id),m=this.modifier
      if(current){current.loopAt=time;current.expiresAt=time+m.modifier.duration;continue}
      const start=Math.round(data.exos.royal_edict_towerbuffDef.start*30)/30
      const buff={site,born:time,loopAt:time+start,expiresAt:time+start+m.modifier.duration,damageFactor:m.damage_factor,rangeFactor:m.range_factor,lastConfetti:time+start}
      site.damageFactor=(site.damageFactor??1)*buff.damageFactor;site.rangeFactor=(site.rangeFactor??1)*buff.rangeFactor
      this.buffs.set(site.id,buff)
      if(m.respawn_barracks)this.onRespawn(site)
      if(m.reset_skills_cd)this.onResetSkills(site)
    }
    this.onSound(cast.global?this.control.sound_cast_upgraded:this.control.sound_cast)
    return cast
  }
  advance(time:number,enemies:EnemyInstance[]=[]) {
    if(this.defer){for(let i=this.casts.length-1;i>=0;i--)if(time-this.casts[i].at>8)this.casts.splice(i,1);return}
    for(const cast of this.casts)if(cast.goldEnabled && time-cast.at<cast.goldDuration && time-cast.goldCheckedAt>=10/30) {
      for(const enemy of enemies)if(enemy.hp>0&&enemy.escapedAt===undefined&&!cast.goldTargets.has(enemy.id)) {
        const dx=enemy.path.position.x-cast.pos.x,dy=enemy.path.position.y-cast.pos.y
        if(!cast.global && dx*dx+dy*dy/(.7*.7)>this.control.range**2)continue
        cast.goldTargets.add(enemy.id);this.goldBuffs.set(enemy.id,{enemy,expiresAt:cast.at+cast.goldDuration})
      }
      cast.goldCheckedAt=time
    }
    for(const [id,buff] of this.goldBuffs)if(time>=buff.expiresAt)this.goldBuffs.delete(id);else if(buff.enemy.hp<=0)this.onEnemyKilled(buff.enemy,time)
    for(const [id,buff] of this.buffs) {
      if(!buff.site.tower || time+1e-9>=buff.expiresAt){this.remove(id);continue}
      if(this.modifier.confetti && time-buff.lastConfetti>this.modifier.confetti_cycle_time){const range=this.modifier.confetti_range;this.onConfetti({x:buff.site.pos.x+(this.random()*2-1)*range,y:buff.site.pos.y+(this.random()*2-1)*range},time);buff.lastConfetti=time}
    }
    for(let i=this.casts.length-1;i>=0;i--)if(time-this.casts[i].at>8)this.casts.splice(i,1)
  }
  onEnemyKilled(enemy:EnemyInstance,time:number){const buff=this.goldBuffs.get(enemy.id);if(!buff)return;if(time<buff.expiresAt)this.onGold(data.templates.mod_power_royal_edict_golddebuff.extra_gold,enemy.path.position);this.goldBuffs.delete(enemy.id)}
  remove(id:string) {const buff=this.buffs.get(id);if(!buff)return;buff.site.damageFactor=(buff.site.damageFactor??1)/buff.damageFactor;buff.site.rangeFactor=(buff.site.rangeFactor??1)/buff.rangeFactor;this.buffs.delete(id)}
}
