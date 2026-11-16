import {FirebookTrailSystem} from './FirebookTrail.ts'
import type {RainCast} from './RainControl'
import type {Damage} from './Damage'
import {recordEnemyDamage} from './EnemyDeath.ts'
import {RoyalEdictSystem} from './RoyalEdictSystem.ts'
import {PowerProgression} from './PowerProgression.ts'
import {RainControl} from './RainControl.ts'
import type {RainControlConfig} from './RainControl'
import {RainAreas,rainImpactEntities} from './RainAreas.ts'
import type {TowerSite} from './TowerSystem'
import {RoadPlacement} from './RoadPlacement.ts'
import type {EnemyInstance} from './GameSession'
import type {LevelData,Point} from './types'
import type {BarracksCombat,SoldierTemplate} from './BarracksCombat'
import {predictDamage} from './Damage.ts'
export interface ReinforcementControl {pos:Point}
export type PowerKind='reinforcements'|'rain_of_fire'|'royal_edict'
interface PowerTemplate {
  cooldown?:number;meteor_count?:number;min_spread?:number;max_spread?:number
  bullet?:{min_speed:number;max_speed:number;acceleration_factor:number;damage_min:number;damage_max:number;damage_factor:number;damage_type:number;damage_radius:number;damage_flags:number;damage_bans:number;hit_fx:string;hit_decal:string;hit_payload:string}
  upgrade_scorching_floor?:boolean;upgrade_slow_floor?:boolean;upgrade_extra_explosion?:boolean;dmg_aura?:string;slow_aura?:string
}
export interface Meteor {done?:boolean;mainStarted?:boolean;shadow?:object;id:number;born:number;pos:Point;to:Point;speed:number;rotation:number;maxHeight:number;shadowScale:number}
/** Original powers and their purchased upgrade controllers. */
export class PowerSystem {
  deferRain=false
  readonly rainTrails:FirebookTrailSystem
  onQueueRainControl:(cast:RainCast)=>void=()=>{}
  onQueueMeteor:(shot:object)=>void=()=>{}
  onInsertMeteor:(shot:object,meteor:Meteor)=>void=()=>{}
  onRemoveMeteor:(meteor:Meteor)=>void=()=>{}
  onMeteorParticle:(meteor:Meteor)=>void=()=>{}
  onMeteorShadow:(shadow:object)=>void=()=>{}
  onRemoveShadow:(shadow:object)=>void=()=>{}
  onEffectCreate:(name:string,pos:Point,time:number)=>void=()=>{}
  onDamageCreate:()=>void=()=>{}
  private meteorHits:{enemy:EnemyInstance;damage:Damage}[]=[]
  deferReinforcements=false
  onQueueReinforcement:(control:ReinforcementControl)=>void=()=>{}
  readonly progression=new PowerProgression()
  readonly royal:RoyalEdictSystem
  readonly rainControl:RainControl
  readonly rainAreas:RainAreas
  equipped:PowerKind[]=['reinforcements','rain_of_fire']
  equip(kinds:PowerKind[]){this.equipped=[...new Set(kinds)].slice(0,3)}
  canUse:(kind:PowerKind)=>boolean=()=>true
  selected?:PowerKind
  readonly cooldowns:Record<PowerKind,number>
  readonly readyAt:Record<PowerKind,number>={reinforcements:0,rain_of_fire:0,royal_edict:0}
  readonly meteors:Meteor[]=[]
  onSound:(name:string)=>void=()=>{}
  onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
  onSignal:(name:string)=>void=()=>{}
  visibleTop=768
  private nextId=1
  private queuedMeteors:{to:Point;height:number}[]=[]
  private insertedPowers:PowerKind[]=[]
  private level:LevelData
  private templates:Record<string,PowerTemplate&SoldierTemplate>
  private barracks:BarracksCombat
  private random:()=>number
  private onKill:(enemy:EnemyInstance)=>void
  constructor(level:LevelData,templates:Record<string,PowerTemplate&SoldierTemplate>,barracks:BarracksCombat,random:()=>number,onKill:(enemy:EnemyInstance)=>void,sites:TowerSite[]=[]) {
    this.rainTrails=new FirebookTrailSystem(random)
    this.royal=new RoyalEdictSystem(sites,templates as unknown as ConstructorParameters<typeof RoyalEdictSystem>[1],random);this.royal.onSound=name=>this.onSound(name)
    this.level=level;this.templates=templates;this.barracks=barracks;this.random=random;this.onKill=onKill
    this.rainControl=new RainControl(level,templates.power_rain_of_fire_control as unknown as RainControlConfig,random)
    this.rainControl.onMeteor=(to,time,cataclysm,height)=>{const shot={to,height};this.queuedMeteors.push(shot);if(this.deferRain)this.onQueueMeteor(shot)}
    this.rainAreas=new RainAreas(templates,random,onKill)
    this.cooldowns={reinforcements:templates.soldier_reinforcement_base.cooldown!,rain_of_fire:templates.power_rain_of_fire_control.cooldown!,royal_edict:this.royal.control.cooldown}
  }
  remaining(kind:PowerKind,time:number){return Math.max(0,this.readyAt[kind]-time)}
  select(kind:PowerKind,time:number){if(!this.equipped.includes(kind)||!this.canUse(kind)||this.remaining(kind,time)>0)return false;this.selected=this.selected===kind?undefined:kind;return true}
  earlyWaveBonus(seconds:number,time:number){if(seconds>1)for(const kind of this.equipped)if(this.readyAt[kind]>time)this.readyAt[kind]-=seconds}
  private cell(pos:Point) {
    const {ox,oy,grid}=this.level.grid
    const x=Math.max(0,Math.min(grid.length-1,Math.ceil((pos.x-ox)/16)-1)),y=Math.max(0,Math.min(grid[x].length-1,Math.ceil((pos.y-oy)/16)-1))
    return grid[x][y]
  }
  cast(pos:Point,time:number):boolean {
    const kind=this.selected
    if(!kind || !this.equipped.includes(kind) || !this.canUse(kind) || this.remaining(kind,time)>0)return false
    const cooldown=kind==='reinforcements'?this.templates.soldier_reinforcement_base.cooldown!:kind==='royal_edict'?this.royal.control.cooldown:this.templates.power_rain_of_fire_control.cooldown!
    if(kind==='reinforcements') {
      if(!new RoadPlacement(this.level).valid(pos))return false
      if(this.deferReinforcements)this.onQueueReinforcement({pos:{...pos}});else this.barracks.reinforce(pos,time)
      this.startCooldown(kind,time,cooldown)
      if(!this.deferReinforcements)this.onSignal('spawned-reinforcement')
    } else if(kind==='royal_edict'){this.royal.cast(pos,time);this.startCooldown(kind,time,cooldown)
    } else {
      const cast=this.rainControl.cast(pos);if(this.deferRain)this.onQueueRainControl(cast)
      this.startCooldown(kind,time,cooldown)
    }
    this.insertedPowers.push(kind)
    this.selected=undefined
    return true
  }
  private startCooldown(kind:PowerKind,time:number,duration:number){this.cooldowns[kind]=duration;this.readyAt[kind]=time+duration}
  advance(time:number,dt:number,enemies:EnemyInstance[]) {
    for(const kind of this.insertedPowers.splice(0))this.progression.use(kind)
    this.royal.advance(time,enemies)
    this.rainAreas.advance(time,enemies)
    if(!this.deferRain)for(const {to,height}of this.queuedMeteors.splice(0)){
      this.meteors.push({id:this.nextId++,born:time,pos:{x:to.x,y:height},to,speed:300,rotation:-Math.PI/2,maxHeight:height,shadowScale:0})
      this.onSound('PowersRainOfFireCast')
    }
    this.rainControl.visibleTop=this.visibleTop;if(this.deferRain)return;this.rainControl.advance(time)
    const b=this.templates.bullet_power_rain_of_fire.bullet!
    for(let i=this.meteors.length-1;i>=0;i--) {
      const meteor=this.meteors[i],dx=meteor.to.x-meteor.pos.x,dy=meteor.to.y-meteor.pos.y,distance=Math.hypot(dx,dy)
      if(distance>meteor.speed*dt) {
        meteor.speed=Math.max(b.min_speed,Math.min(b.max_speed,meteor.speed+30*Math.ceil(meteor.speed/30*b.acceleration_factor)))
        meteor.pos.x+=meteor.speed*dx/distance*dt;meteor.pos.y+=meteor.speed*dy/distance*dt
        meteor.rotation=Math.atan2(dy,dx);meteor.shadowScale=Math.max(0,Math.min(1.5,1.5*(meteor.maxHeight-meteor.pos.y)/meteor.maxHeight))
        continue
      }
      const damage=Math.ceil(b.damage_factor*this.integer(b.damage_min,b.damage_max))
      for(const enemy of enemies) {
        if(enemy.hp<=0 || enemy.escapedAt!==undefined || enemy.template.health.ignore_damage || enemy.template.vis.flags&b.damage_bans || enemy.template.vis.bans&b.damage_flags)continue
        if((enemy.path.position.x-meteor.to.x)**2+(enemy.path.position.y-meteor.to.y)**2/(.7*.7)>b.damage_radius**2)continue
        recordEnemyDamage(enemy,b.damage_type,time)
        enemy.hp-=predictDamage({...enemy.template.health,hp:enemy.hp},{value:damage,damage_type:b.damage_type})
        if(enemy.hp<=0){enemy.diedAt=time;this.onKill(enemy)}
      }
      this.onSound('PowersRainOfFireImpact')
      for(const name of rainImpactEntities(this.templates.bullet_power_rain_of_fire,!!(this.cell(meteor.to)&2))){
        if(['aura_bullet_power_rain_of_fire_dmg','aura_bullet_power_rain_of_fire_slow','decal_power_rain_of_fire_scorch','decal_power_rain_of_fire_extra_explosion'].includes(name))this.rainAreas.queue(name,meteor.to,time)
        else this.onEffect(name,meteor.to,time)
      }
      this.meteors.splice(i,1)
    }
  }
  insertMeteor(shot:object,time:number){
    const index=this.queuedMeteors.indexOf(shot as {to:Point;height:number});if(index<0)return
    const {to,height}=this.queuedMeteors.splice(index,1)[0],meteor:Meteor={id:this.nextId++,born:time,pos:{x:to.x,y:height},to,speed:300,rotation:0,maxHeight:height,shadowScale:1}
    this.meteors.push(meteor);this.onInsertMeteor(shot,meteor);this.onSound('PowersRainOfFireCast')
  }
  beginRainTick(){for(let i=this.meteors.length-1;i>=0;i--)if(this.meteors[i].done)this.meteors.splice(i,1)}
  advanceMeteor(meteor:Meteor,time:number,dt:number,enemies:EnemyInstance[]){
    if(meteor.done)return
    if(!meteor.mainStarted){meteor.mainStarted=true;this.rainTrails.queue(meteor,time,'rain');this.onMeteorParticle(meteor);meteor.shadow={};this.onMeteorShadow(meteor.shadow)}
    const b=this.templates.bullet_power_rain_of_fire.bullet!,dx=meteor.to.x-meteor.pos.x,dy=meteor.to.y-meteor.pos.y,distance=Math.sqrt(dx*dx+dy*dy)
    if(distance>meteor.speed*dt){
      meteor.speed=Math.max(b.min_speed,Math.min(b.max_speed,meteor.speed+30*Math.ceil(meteor.speed/30*b.acceleration_factor)))
      meteor.pos.x+=meteor.speed*(dx/distance)*dt;meteor.pos.y+=meteor.speed*(dy/distance)*dt
      meteor.rotation=Math.atan2(meteor.to.y-meteor.pos.y,meteor.to.x-meteor.pos.x);meteor.shadowScale=Math.max(0,Math.min(1.5,1.5*(meteor.maxHeight-meteor.pos.y)/meteor.maxHeight));return
    }
    this.onRemoveShadow(meteor.shadow!);meteor.pos={...meteor.to};this.rainTrails.endSource(meteor.id)
    const value=Math.ceil(b.damage_factor*this.integer(b.damage_min,b.damage_max))
    for(const e of enemies)if(e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.flags&b.damage_bans)&&!(e.template.vis.bans&b.damage_flags)&&(e.path.position.x-meteor.to.x)**2+(e.path.position.y-meteor.to.y)**2/(.7*.7)<=b.damage_radius**2){this.onDamageCreate();this.meteorHits.push({enemy:e,damage:{value,damage_type:b.damage_type}})}
    this.onSound('PowersRainOfFireImpact')
    for(const name of rainImpactEntities(this.templates.bullet_power_rain_of_fire,!!(this.cell(meteor.to)&2))){
      if(['aura_bullet_power_rain_of_fire_dmg','aura_bullet_power_rain_of_fire_slow','decal_power_rain_of_fire_scorch','decal_power_rain_of_fire_extra_explosion'].includes(name))this.rainAreas.queue(name,meteor.to,time)
      else{this.onEffectCreate(name,meteor.to,time);this.onEffect(name,meteor.to,time)}
    }
    meteor.done=true;this.onRemoveMeteor(meteor)
  }
  resolveMeteorHits(time:number){
    for(const {enemy:e,damage} of this.meteorHits.reverse()){
      if(e.hp<=0||e.template.health.ignore_damage)continue
      recordEnemyDamage(e,damage.damage_type,time);e.hp-=predictDamage({...e.template.health,hp:e.hp},damage)
      if(e.hp<=0){e.hp=0;e.diedAt=time;this.onKill(e)}
    }
    this.meteorHits=[]
  }
  private integer(min:number,max:number){return min+Math.floor(this.random()*(max-min+1))}
}
