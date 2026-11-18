import {luaSort} from './LuaSort.ts'
import {SoldierIdle} from './SoldierIdle.ts'
import type {IdleFlip,IdleVisual} from './SoldierIdle'
import {recordEnemyDamage} from './EnemyDeath.ts'
import {EnemyMelee} from './EnemyMelee.ts'
import {DodgeSystem} from './DodgeSystem.ts'
import type {DodgeState} from './DodgeSystem'
import {damageSoldier,soldierDamageFactor,soldierIsDead} from './SoldierHealth.ts'
import type {SoldierBuff} from './SoldierHealth'
import {predictDamage} from './Damage.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import type {TowerSite} from './TowerSystem'
import {rallyFormation,meleeSlot} from './UnitPositions.ts'
import {reinforcementSquad,reinforcementFrames,reinforcementAnimationFinished,SpecialReinforcementAttack} from './Reinforcements.ts'
import {ReinforcementAura} from './ReinforcementAura.ts'
import soldierFrames from '../../public/data/soldier-animation-frames.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'

export interface MeleeAttack {
  damage_min:number;damage_max:number;damage_type:number;cooldown:number
  hit_time?:number;hit_times?:number[];animation:string;sound?:string
  vis_flags:number;vis_bans:number;reduce_armor?:number;reduce_magic_armor?:number
  xp_gain_factor?:number;chance?:number;critical_chance?:number;pop?:string[];pop_chance?:number;pop_conds?:number;dodge_time?:number
  ignore_rally_change?:boolean;ts?:number;sound_hit?:string;ignore_stun?:boolean;hit_fx?:string;hit_fx_once?:boolean;hit_offset?:Point
  mod?:string;level?:number;disabled?:boolean;basic_attack?:boolean;type?:string;hit_damage_factor?:number[]
}
export interface SoldierTemplate {
  level?:number
  idle_flip?:IdleFlip
  info?:{random_name_format?:string;random_name_count:number}
  dodge?:DodgeState
  vis?:{flags:number;bans:number}
  unit?:{hit_offset:Point;mod_offset?:Point;blood_color?:string;fade_time_after_death?:number;fade_duration_after_death?:number;damage_factor?:number;is_stunned?:boolean;pop_offset?:Point}
  motion:{max_speed:number}
  health:{immune_to?:number;hp_max:number;armor:number;magic_armor:number;spiked_armor?:number;damage_factor:number;dead_lifetime:number}
  melee:{range:number;attacks:MeleeAttack[];arrived_slot_animation?:string}
  soldier:{melee_slot_offset:Point;melee_slot_spread?:Point}
  regen:{health:number;cooldown:number;last_hit_standoff_time:number;last_hit_ts?:number;ts_counter?:number}
  nav_rally:{delay_min:number;delay_max:number;immune_to?:number}
  render:{sprites:{z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;prefix:string;anchor:Point;offset:Point;exo?:boolean;scale?:Point}[]}
  sound_events?:Record<string,string>
  reinforcement?:{duration:number;fade:boolean}
  cooldown?:number
  upgrade_special_unit?:boolean
  webAnimationDurations?:Record<string,number>
}
interface Barrack {rally_range:number;rally_terrains:number;rally_anywhere?:boolean;respawn_offset:Point;rally_radius:number;rally_angle_offset:number;soldier_type:string;max_soldiers:number;door_hold_time:number;has_door:boolean}
export interface BarrackTemplate {barrack?:Barrack;render:{sprites:{prefix?:string}[]}}
export interface MeleeCycle {startedAt:number;nextHit:number;attack:MeleeAttack;targetId:number;dodged?:boolean[];critical?:boolean}
export interface SoldierInstance {
  id:number;siteId:string;slot:number;name:string;template:SoldierTemplate
  pos:Point;rally:Point;center:Point;hp:number;born:number;diedAt?:number;target?:EnemyInstance;retainedTarget?:EnemyInstance
  motionDest?:Point;motionArrived?:boolean;facingLeft:boolean;moving:boolean;attack?:MeleeCycle;readyAt:number;lastHitAt:number;regenCounter:number;deployUntil:number;deploying:boolean
  powerLevels?:Record<string,number>;powerChanges?:Set<string>;nativeHeroLife?:boolean;deathContinuation?:boolean;deathFinishedAt?:number;lifeCanClick?:boolean;
  hpBeforeTimeout?:number;nativeReinforcement?:boolean;expiresAt?:number;fadeOutAt?:number;reinforcementFadeTo?:Point;prefix?:string
  dodge?:DodgeState
  modifierTypes?:Set<string>
  buffs?:Map<string,SoldierBuff>
  towerDamageFactor?:number
  ignoreDamage?:boolean
  deathTarget?:EnemyInstance
  upgradedPose?:SoldierInstance['visualOverride'];firstRally?:boolean;rallyRequested?:boolean;rallyCount?:number;mainStartTick?:number;mainStarted?:boolean;visBans?:number;rallyImmunity?:number
  holdsBlockWhileDead?:boolean
  deathHealthAt?:number
  corpseFade?:{at:number;delay:number;duration:number}
  corpseAlpha?:number
  removalQueuedAt?:number
  infoKey?:string
  spritePhases?:number[]
  hero?:boolean
  xpQueued?:number
  visualOverride?:{name:string;at:number;loop?:boolean}
  idleVisual?:IdleVisual
  idleRequestedAt?:number
  meleeVisual?:{name:string;at:number}
  rangedUntil?:number
  actionYieldUntil?:number
  scriptLocked?:boolean
  reinforcementDamageFactor?:number
  reinforcementInAt?:number
  specialAttack?:SpecialReinforcementAttack
  specialTarget?:EnemyInstance
  healthBarHidden?:boolean
}
export interface DoorState {animation:'open'|'close';startedAt:number;spawnAt?:number;closeAt?:number;closed?:boolean;openedAt?:number}
/** Basic barracks loop. Skill overrides and tutorial controllers are handled separately. */
export class BarracksCombat {
  enemyCandidates:(pool:EnemyInstance[],origin:Point,radius:number)=>EnemyInstance[]=pool=>pool
  targetValid:(enemy:EnemyInstance)=>boolean=()=>true
  cellAt:(pos:Point)=>number=()=>1
  private pickGenericTarget(s:SoldierInstance,enemies:EnemyInstance[],alternative=false){
    const center=s.center,range=s.template.melee.range
    const candidates=this.enemyCandidates(enemies,center,range).filter(e=>e.hp>0&&!e.path.finished&&this.targetValid(e)&&!(e.template.vis.flags&(alternative?384:256))&&!(e.template.vis.bans&1)&&!(this.cellAt(e.path.position)&256)&&(alternative?this.blockers(e).length===0:!e.template.enemy.max_blockers||this.blockers(e).length===0)&&(e.path.position.x-center.x)**2+((e.path.position.y-center.y)/.7)**2<=range**2)
    const distance=(e:EnemyInstance)=>Math.sqrt((e.path.position.x-center.x)**2+(e.path.position.y-center.y)**2)
    return luaSort(candidates,(a,b)=>s.hero&&!alternative?distance(a)<distance(b):a.path.remainingNodes<b.path.remainingNodes)[0]
  }
  private heroRallies=new WeakMap<SoldierInstance,{bans:number;immunity:number}>()
  finishHeroRally(s:SoldierInstance){const state=this.heroRallies.get(s);if(!state)return;if(s.template.vis)s.template.vis.bans=state.bans;s.rallyImmunity=state.immunity;this.heroRallies.delete(s)}
  /** The original walking coroutine yields even on its final snapped step. */
  advanceGeraldRally(s:SoldierInstance,time:number,dt:number){
    if(s.hp<=0){this.finishHeroRally(s);s.deploying=false;return false}
    if(time<s.deployUntil)return true
    if(!this.heroRallies.has(s)){this.heroRallies.set(s,{bans:s.template.vis?.bans??0,immunity:s.rallyImmunity??s.template.health.immune_to??0});if(s.template.vis)s.template.vis.bans=4294967295;s.rallyImmunity=s.template.nav_rally.immune_to??0}
    if(s.pos.x===s.rally.x&&s.pos.y===s.rally.y){this.finishHeroRally(s);s.deploying=false;s.moving=false;s.idleVisual={name:'idle',at:s.idleVisual?.at??s.meleeVisual?.at??s.born,loop:true};return false}
    this.move(s,s.rally,dt);s.moving=true;return true
  }
  /** A resumed native pre-hit wait tests its time condition before health.dead. */
  resumeHeroMeleeDeath(s:SoldierInstance,time:number){
    const cycle=s.attack,times=cycle?.attack.hit_times??[cycle?.attack.hit_time??0]
    if(cycle&&s.target&&cycle.nextHit<times.length&&time-cycle.startedAt>=times[cycle.nextHit])this.soldierAttack(s,s.target,time)
    this.interruptHeroMelee(s)
  }
  interruptHeroMelee(s:SoldierInstance){const c=this.criticalAttacks.get(s.id);if(c){s.template.unit!.damage_factor=(s.template.unit!.damage_factor??1)/2;c.cycle.critical=false;this.criticalAttacks.delete(s.id)}s.attack=undefined}
  deferReinforcements=false
  deferHeroes=false
  deferKnightTowers=false
  deferKnights=false
  deferEnemyMain=false
  deferDamage=false
  onRemoveModifiers:(soldier:SoldierInstance)=>void=()=>{}
  onReinforcementSpawn:()=>void=()=>{}
  onCreate:(soldier:SoldierInstance)=>void=()=>{}
  onRemove:(soldier:SoldierInstance)=>void=()=>{}
  nativeSpecialAuras=false
  onSpecialFirstMain:(s:SoldierInstance,time:number)=>void=()=>{}
  readonly reinforcementAura=new ReinforcementAura()
  onEffect:(name:string,pos:Point,time:number)=>void=()=>{}
  private pendingSpecialAuras:{soldier:SoldierInstance;at:number}[]=[]
  onSpecialAttack:(soldier:SoldierInstance,target:EnemyInstance,time:number,enemies:EnemyInstance[])=>boolean=()=>false
  readonly enemyMelee:EnemyMelee
  readonly dodges:DodgeSystem
  readonly soldiers:SoldierInstance[]=[]
  readonly doors=new Map<string,DoorState>()
  onKnightCastMain:(s:SoldierInstance,time:number)=>boolean=()=>false
  onKnightInCooldown:(s:SoldierInstance,time:number)=>void=()=>{}
  onKnightMeleeModifier:(name:string,target:EnemyInstance,source:SoldierInstance,level:number,time:number)=>void=()=>{}
  onKnightTowerLoop:(site:TowerSite)=>void=()=>{}
  onKnightSkillMain:(s:SoldierInstance,outer:boolean)=>void=()=>{}
  onSound:(name:string)=>void=()=>{}
  onStopSound:(name:string)=>void=()=>{}
  private knightDeployments=new WeakMap<SoldierInstance,{phase:'wait'|'walk';startedAt:number;duration:number;previousBans:number;previousImmunity:number}>()
  private idleStates=new WeakMap<SoldierInstance,SoldierIdle>()
  private knightStates=new WeakMap<SoldierInstance,{attackTs:number;waiting:boolean}>()
  private blockerOrder=new WeakMap<EnemyInstance,SoldierInstance[]>()
  private knightDamage:{soldier:SoldierInstance;enemy:EnemyInstance;attack:MeleeAttack;packet:ReturnType<BarracksCombat['damage']>;result?:number;popOrder?:number;xpFactor?:number}[]=[]
  private enemyDamage:{enemy:EnemyInstance|undefined;target:SoldierInstance;attack:MeleeAttack;value:number;result?:number;popOrder?:number}[]=[]
  onReflect?: (enemy:EnemyInstance,value:number)=>void
  onDamageCreate:()=>number|void=()=>{}
  onEffectCreate:(name:string,pos?:Point,time?:number)=>void=()=>{}
  private criticalAttacks=new Map<number,{soldier:SoldierInstance;cycle:MeleeCycle}>()
  private nextId=1
  private templates:Record<string,SoldierTemplate&BarrackTemplate>
  private random:()=>number
  private onKill:(enemy:EnemyInstance)=>void
  private openDuration:(prefix:string)=>number
  constructor(templates:Record<string,SoldierTemplate&BarrackTemplate>,random:()=>number,onKill:(enemy:EnemyInstance)=>void,openDuration:(prefix:string)=>number=()=>10/30) {
    this.dodges=new DodgeSystem(random,templates as unknown as ConstructorParameters<typeof DodgeSystem>[1])
    this.enemyMelee=new EnemyMelee(random,e=>this.blockers(e),this.dodges)
    this.enemyMelee.onSound=name=>this.onSound(name)
    this.enemyMelee.onEffect=(name,pos,time)=>{this.onEffectCreate(name);this.onEffect(name,pos,time)}
    this.enemyMelee.onDamage=(enemy,target,attack,value)=>{const order=this.onDamageCreate();this.enemyDamage.push({enemy,target,attack,value,popOrder:typeof order==='number'?order:undefined})}
    this.templates=templates;this.random=random;this.onKill=onKill;this.openDuration=openDuration
  }
  private advanceIdle(s:SoldierInstance,time:number,dt:number){
    if(!s.template.idle_flip)return
    let controller=this.idleStates.get(s)
    if(!controller){controller=new SoldierIdle(s.template.idle_flip,this.random);this.idleStates.set(s,controller)}
    const previous:{name:string;at:number;loop?:boolean}=s.visualOverride??s.meleeVisual??s.idleVisual??{name:'idle',at:s.spritePhases?.[0]??s.born,loop:true}
    const result=controller.advance(time,dt,{...previous,loop:previous.loop??false},s.facingLeft,!!s.template.unit?.is_stunned)
    s.facingLeft=result.flip;s.idleVisual=result.visual
    if(s.name.startsWith('soldier_knights_lvl')||s.nativeReinforcement)s.visualOverride=result.visual
  }
  finishHeroIdle(s:SoldierInstance,time:number,dt:number,allowRegen=true){if(s.idleRequestedAt===time&&!s.rangedUntil&&!s.attack&&!s.moving&&!s.scriptLocked){this.advanceIdle(s,time,dt);if(this.deferHeroes&&allowRegen)this.advanceHeroRegen(s,time,dt)}}
  private advanceHeroRegen(s:SoldierInstance,time:number,dt:number){if(time-s.lastHitAt>s.template.regen.last_hit_standoff_time){s.regenCounter+=dt;if(s.regenCounter>s.template.regen.cooldown){s.hp=Math.min(s.template.health.hp_max,s.hp+s.template.regen.health);s.regenCounter=0}}}
  initializeKnightInsert(s:SoldierInstance,time:number){
    if(!s.name.startsWith('soldier_knights_lvl'))return
    const info=s.template.info
    if(info?.random_name_format)s.infoKey=info.random_name_format.replace('_NAME','').replace('%i',String(1+Math.floor(this.random()*info.random_name_count)))
    s.spritePhases=s.template.render.sprites.map(()=>time-this.random())
    s.visualOverride=s.upgradedPose?{...s.upgradedPose,at:s.spritePhases[0]}:{name:'idle',at:s.spritePhases[0],loop:true};s.upgradedPose=undefined
  }
  initializeReinforcementInsert(s:SoldierInstance){
    if(!s.name.startsWith('soldier_reinforcement'))return
    if(s.name==='soldier_reinforcement_base'||this.nativeSpecialAuras&&s.name==='soldier_reinforcement_special')s.nativeReinforcement=true
    if(s.name==='soldier_reinforcement_base')s.corpseAlpha=0
    const info=s.template.info;if(!info?.random_name_format)return
    const variant=Number(s.prefix?.at(-1)),female=s.name==='soldier_reinforcement_base'&&((s.template.level===1&&variant===1)||((s.template.level===2||s.template.level===3)&&variant===2))
    const format=female?'SOLDIER_REINFORCEMENTS_F_%i_NAME':info.random_name_format,count=female?4:info.random_name_count
    s.infoKey=format.replace('_NAME','').replace('%i',String(1+Math.floor(this.random()*count)))
  }
  reinforce(pos:Point,time:number) {
    for(const member of reinforcementSquad(pos,!!this.templates.power_reinforcements_control?.upgrade_special_unit)) {
      const {name,slot}=member,template=structuredClone(this.templates[name]),special=name==='soldier_reinforcement_special',variant=special?undefined:1+Math.floor(this.random()*3),rally=member.pos
      const soldier:SoldierInstance={id:this.nextId++,siteId:`reinforcement-${time}`,slot,name,template,dodge:template.dodge?structuredClone(template.dodge):undefined,pos:{...rally},rally,center:{...pos},hp:template.health.hp_max,born:time,facingLeft:false,moving:false,readyAt:time,lastHitAt:template.regen.last_hit_ts??0,regenCounter:template.regen.ts_counter??0,deployUntil:time+10/30,deploying:!special,expiresAt:time+template.reinforcement!.duration,prefix:template.render.sprites[0].prefix+(variant??'')}
      if(special){soldier.reinforcementInAt=time;soldier.healthBarHidden=true;soldier.visualOverride={name:'in',at:time};if(!this.nativeSpecialAuras)this.pendingSpecialAuras.push({soldier,at:time+2/30})}
      this.soldiers.push(soldier)
      this.onCreate(soldier)
      if(template.sound_events?.insert)this.onSound(template.sound_events.insert)
    }
  }
  insertHero(name:string,pos:Point,time:number,template:SoldierTemplate):SoldierInstance {
    const soldier:SoldierInstance={id:this.nextId++,siteId:name,slot:1,name,template,pos:{...pos},rally:{...pos},center:{...pos},hp:template.health.hp_max,born:time,facingLeft:false,moving:false,readyAt:time,lastHitAt:template.regen.last_hit_ts??0,regenCounter:template.regen.ts_counter??0,deployUntil:time,deploying:false,hero:true,dodge:template.dodge?structuredClone(template.dodge):undefined}
    this.soldiers.push(soldier);this.onCreate(soldier);return soldier
  }
  removeSite(id:string) {
    this.pendingRallySounds.delete(id)
    for(let i=this.soldiers.length-1;i>=0;i--)if(this.soldiers[i].siteId===id)this.soldiers.splice(i,1)
    this.doors.delete(id)
  }
  setRally(site:TowerSite,pos:Point,time:number) {
    const b=this.templates[site.tower!]?.barrack;if(!b)return
    if(this.deferKnightTowers)this.pendingRallySounds.add(site.id)
    site.rally={...pos}
    for(const s of this.soldiers)if(s.siteId===site.id && s.hp>0){
      s.center={...pos};s.rally=rallyFormation(s.slot,b.max_soldiers,pos,b.rally_radius,b.rally_angle_offset)
      if(s.name.startsWith('soldier_knights_lvl')){s.rallyRequested=true;s.rallyCount=b.max_soldiers;s.deploying=true;continue}
      s.target=undefined;s.attack=undefined;s.visualOverride=undefined
      s.deployUntil=time+s.template.nav_rally.delay_min+this.random()*(s.template.nav_rally.delay_max-s.template.nav_rally.delay_min);s.deploying=true
    }
  }
  respawnDead(site:TowerSite,queued=false){if(queued){for(const s of this.soldiers)if(s.siteId===site.id&&s.hp<=0)this.onRemove(s);return}for(let i=this.soldiers.length-1;i>=0;i--)if(this.soldiers[i].siteId===site.id&&this.soldiers[i].hp<=0)this.soldiers.splice(i,1)}
  /** systems.tower_upgrade18 replaces live roster slots after the old main/health pass. */
  upgradeNativeSite(site:TowerSite,time:number){
    const barrack=this.templates[site.tower!]?.barrack;if(!barrack)return
    this.doors.delete(site.id)
    for(const old of this.soldiers.filter(s=>s.siteId===site.id&&!soldierIsDead(s)).sort((a,b)=>a.slot-b.slot)){
      if(old.slot>barrack.max_soldiers){this.releaseKnight(old);this.onRemove(old);continue}
      const name=barrack.soldier_type,template=structuredClone(this.templates[name]),next:SoldierInstance={...old,id:this.nextId++,name,template,dodge:template.dodge?structuredClone(template.dodge):undefined,hp:template.health.hp_max,born:time+1/30,pos:{...old.pos},rally:{...old.rally},center:{...old.center},buffs:undefined,powerLevels:{...site.powerLevels},powerChanges:undefined,attack:undefined,visualOverride:undefined,upgradedPose:old.visualOverride?{...old.visualOverride}:undefined,lastHitAt:template.regen.last_hit_ts??0,regenCounter:template.regen.ts_counter??0,removalQueuedAt:undefined}
      const state=this.knightStates.get(old);this.knightStates.set(next,{attackTs:state?.attackTs??0,waiting:false})
      const target=old.target;if(target){const order=this.blockerOrder.get(target),index=order?.indexOf(old)??-1;if(index>=0)order![index]=next;old.target=undefined}
      this.soldiers.push(next);this.onCreate(next);this.onRemove(old)
    }
  }
  upgradeSite(site:TowerSite) {
    const barrack=this.templates[site.tower!]?.barrack
    if(!barrack)return
    this.doors.delete(site.id)
    for(let i=this.soldiers.length-1;i>=0;i--) {
      const s=this.soldiers[i]
      if(s.siteId!==site.id)continue
      if(soldierIsDead(s)){this.soldiers.splice(i,1);continue}
      // Native tower_upgrade creates a new entity. Modifiers and projectiles
      // holding the old soldier must not silently retarget the replacement.
      const template=this.templates[barrack.soldier_type]
      this.soldiers[i]={...s,id:this.nextId++,name:barrack.soldier_type,template,dodge:template.dodge?structuredClone(template.dodge):undefined,hp:template.health.hp_max,pos:{...s.pos},rally:{...s.rally},center:{...s.center},buffs:undefined,attack:undefined,visualOverride:undefined,lastHitAt:template.regen.last_hit_ts??0,regenCounter:template.regen.ts_counter??0}
      this.onCreate(this.soldiers[i])
    }
  }
  advanceCriticals(time:number){
    for(const [id,c]of this.criticalAttacks){const s=c.soldier,duration=s.template.webAnimationDurations?.[c.cycle.attack.animation]??c.cycle.attack.cooldown
      if(s.attack!==c.cycle||s.hp<=0||s.deploying||time-c.cycle.startedAt+1e-9>=duration){s.template.unit!.damage_factor=(s.template.unit!.damage_factor??1)/2;c.cycle.critical=false;this.criticalAttacks.delete(id)}
    }
  }
  advance(time:number,dt:number,sites:TowerSite[],enemies:EnemyInstance[]) {
    this.advanceCriticals(time)
    for(let index=this.pendingSpecialAuras.length-1;index>=0;index--){const p=this.pendingSpecialAuras[index];if(time<p.at)continue;this.pendingSpecialAuras.splice(index,1);if(this.soldiers.includes(p.soldier)){this.reinforcementAura.start(p.soldier,time,(this.templates.aura_power_reinforcement_special as unknown as {aura?:{duration:number}})?.aura?.duration);this.onEffect('decal_power_reinforcements_special',p.soldier.pos,time)}}
    if(!this.nativeSpecialAuras)this.reinforcementAura.advance(time,this.soldiers)
    for(let i=this.soldiers.length-1;i>=0;i--) {
      const s=this.soldiers[i]
      if(s.fadeOutAt!==undefined && !s.nativeReinforcement && !s.reinforcementFadeTo && time-s.fadeOutAt>50/s.template.motion.max_speed){this.soldiers.splice(i,1);continue}
      if(s.name.startsWith('soldier_knights_lvl')||s.nativeReinforcement){
        if(s.removalQueuedAt!==undefined&&time>s.removalQueuedAt)this.soldiers.splice(i,1)
      }else if(!s.hero && !s.reinforcementFadeTo && s.diedAt!==undefined && time-s.diedAt>s.template.health.dead_lifetime)this.soldiers.splice(i,1)
    }
    if(!this.deferKnightTowers)for(const site of sites)this.advanceKnightTowerMain(site,time)
    for(const e of enemies)e.blocked=e.hp>0&&this.blockers(e).length>0
    for(const s of this.soldiers) {
      if(s.name.startsWith('soldier_knights_lvl')){if(!this.deferKnights)this.advanceKnightMain(s,time,dt,sites,enemies);continue}
      if(this.deferReinforcements&&s.name.startsWith('soldier_reinforcement'))continue
      if(!s.hero||!this.deferHeroes){this.advanceSoldierMain(s,time,dt,sites,enemies);if(s.hero)this.finishHeroIdle(s,time,dt)}
    }
    if(!this.deferEnemyMain)for(const e of enemies)this.advanceEnemyMain(e,time)
    if(!this.deferDamage)this.resolveDamage(time,enemies)
  }
  advanceKnightTowerMain(site:TowerSite,time:number){
      const tower=site.tower?this.templates[site.tower]:undefined,b=tower?.barrack
      if(!b)return
      const missing=Array.from({length:b.max_soldiers},(_,i)=>i+1).filter(slot=>!this.soldiers.some(s=>s.siteId===site.id && s.slot===slot))
      let door=this.doors.get(site.id)
      if(!(door?.animation==='close'&&!door.closed)&&!(door?.animation==='open'&&door.spawnAt!==undefined))this.onKnightTowerLoop(site)
      if(door?.animation==='close'&&!door.closed){
        if(nativeLogicAnimationFrame(8,time,door.startedAt,false,30).runs>0){door.closed=true;this.flushRallySound(site)}
        // Completing the close coroutine still reaches the outer yield.
        return
      }
      if(missing.length) {
        if(!door || door.closed) {
          const duration=b.has_door?this.openDuration(tower!.render.sprites[2]?.prefix??''):0
          door={animation:'open',startedAt:time,spawnAt:time+duration};this.doors.set(site.id,door)
          // The shipped sound event itself supplies its .2-second delay.
          if(b.has_door)this.onSound('GUITowerOpenDoor')
        }
        if(door.spawnAt===undefined || nativeLogicAnimationFrame(Math.round((door.spawnAt-door.startedAt)*30),time,door.startedAt,false,30).runs>0) {
          for(const slot of missing) {
            const template=structuredClone(this.templates[b.soldier_type])
            const rally=rallyFormation(slot,b.max_soldiers,site.rally,b.rally_radius,b.rally_angle_offset)
            const delay=b.soldier_type.startsWith('soldier_knights_lvl')?0:template.nav_rally.delay_min+this.random()*(template.nav_rally.delay_max-template.nav_rally.delay_min)
            this.soldiers.push({id:this.nextId++,siteId:site.id,slot,name:b.soldier_type,template,dodge:template.dodge?structuredClone(template.dodge):undefined,pos:{x:site.pos.x+b.respawn_offset.x,y:site.pos.y+b.respawn_offset.y},rally,center:{...site.rally},hp:template.health.hp_max,born:time,facingLeft:false,moving:false,readyAt:time,lastHitAt:template.regen.last_hit_ts??0,regenCounter:template.regen.ts_counter??0,deployUntil:time+delay,deploying:true,firstRally:true,rallyCount:b.max_soldiers,mainStartTick:Math.round(time*30)+1,visBans:4294967295,rallyImmunity:template.nav_rally.immune_to??0,powerLevels:{...site.powerLevels}})
            this.onCreate(this.soldiers.at(-1)!)
          }
          if(door.spawnAt!==undefined){door.openedAt=time;door.closeAt=time+b.door_hold_time;door.spawnAt=undefined}
        }
      }
      if(door?.openedAt!==undefined&&door.closeAt!==undefined && time-door.openedAt>b.door_hold_time) {
        door.animation='close';door.startedAt=time;door.closeAt=undefined
      }
      if(!door||door.closed||door.animation==='open'&&door.openedAt!==undefined)this.flushRallySound(site)
  }
  private pendingRallySounds=new Set<string>()
  private flushRallySound(site:TowerSite){
    if(!this.pendingRallySounds.delete(site.id)||!this.soldiers.some(s=>s.siteId===site.id&&!soldierIsDead(s)))return
    const sound=this.templates[site.tower!]?.sound_events?.change_rally_point;if(sound)this.onSound(sound)
  }
  advanceKnightMain(s:SoldierInstance,time:number,dt:number,sites:TowerSite[],enemies:EnemyInstance[]){
    if(!this.soldiers.includes(s))return
    s.towerDamageFactor=sites.find(site=>site.id===s.siteId)?.damageFactor??1;s.moving=false
    if(this.onKnightCastMain(s,time))return
    if(s.mainStarted||s.mainStartTick===undefined||Math.round(time*30)>=s.mainStartTick)this.onKnightSkillMain(s,!this.knightDeployments.has(s)&&!(this.knightStates.get(s)?.waiting&&s.attack))
    if(soldierIsDead(s)){this.advanceKnightDeath(s,time);return}
    if(s.scriptLocked||time+1e-9<(s.actionYieldUntil??0))return
        if(s.mainStartTick!==undefined&&!s.mainStarted){if(Math.round(time*30)<s.mainStartTick)return;s.mainStarted=true;s.born=time;s.visBans=s.template.vis?.bans??0;s.rallyImmunity=0}
        if(s.template.unit?.is_stunned){this.advanceIdle(s,time,dt);return}
        if(s.deploying&&this.advanceKnightRally(s,time,dt,enemies))return
        this.advanceKnight(s,time,dt,enemies);
  }
  advanceReinforcementTween(s:SoldierInstance,time:number){
    if(s.fadeOutAt!==undefined)s.corpseAlpha=255*(1-Math.min(1,Math.max(0,time-s.fadeOutAt)/(10/30)))
    else if(s.deploying)s.corpseAlpha=255*Math.min(1,Math.max(0,time-s.born)/(10/30))
  }
  advanceReinforcementMain(s:SoldierInstance,time:number,dt:number,sites:TowerSite[],enemies:EnemyInstance[]){
    if(!s.mainStarted){if(this.nativeSpecialAuras&&s.name==='soldier_reinforcement_special')this.onSpecialFirstMain(s,time);s.mainStarted=true;this.onReinforcementSpawn()}
    if(s.name!=='soldier_reinforcement_base'){this.advanceSoldierMain(s,time,dt,sites,enemies);return}
    s.moving=false
    if(s.scriptLocked)return
    if(s.reinforcementFadeTo){this.move(s,s.reinforcementFadeTo,dt);return}
    if(this.knightStates.get(s)?.waiting&&s.attack){this.advanceKnight(s,time,dt,enemies);return}
    if(soldierIsDead(s)){this.advanceKnightDeath(s,time);return}
    if(s.expiresAt!==undefined&&time>s.expiresAt){
      this.onRemoveModifiers(s)
      s.healthBarHidden=true;s.fadeOutAt=s.diedAt=s.deathHealthAt=time;s.hpBeforeTimeout=s.hp;s.hp=0;s.reinforcementFadeTo={x:s.pos.x+(s.facingLeft?-50:50),y:s.pos.y};this.releaseKnight(s)
      s.visualOverride={name:'walk',at:time,loop:true};this.move(s,s.reinforcementFadeTo,dt);return
    }
    if(s.deploying){if(time-s.born<10/30)return;s.deploying=false}
    this.advanceKnight(s,time,dt,enemies)
  }
  /** y_hero_ranged_attacks resumes below melee/GoBack, directly into idle and regen. */
  finishHeroRangedMain(s:SoldierInstance,time:number,dt:number){
    s.moving=false;s.idleRequestedAt=time
    if(!this.deferHeroes)this.advanceHeroRegen(s,time,dt)
  }
  /** Generic soldier/hero body, dispatched at its own main-script table slot. */
  advanceSoldierMain(s:SoldierInstance,time:number,dt:number,sites:TowerSite[],enemies:EnemyInstance[]){
      s.towerDamageFactor=sites.find(site=>site.id===s.siteId)?.damageFactor??1
      s.moving=false;s.idleRequestedAt=undefined
      // The original entrance coroutine owns main even after lethal damage.
      if(this.nativeSpecialAuras&&s.name==='soldier_reinforcement_special'&&s.reinforcementInAt!==undefined){
        if(nativeLogicAnimationFrame(reinforcementFrames(s.prefix??s.template.render.sprites[0].prefix,'in')??1,time,s.reinforcementInAt,false,30).runs===0)return
        s.reinforcementInAt=undefined
        if(s.hp>0)s.healthBarHidden=false
      }
      if(this.nativeSpecialAuras&&s.name==='soldier_reinforcement_special'&&s.specialAttack){this.advanceSpecialAttack(s,time);return}
      if(s.hero&&!s.attack){if(s.meleeVisual)s.idleVisual={...s.meleeVisual,loop:false};s.meleeVisual=undefined}
      if(s.hp>0 && s.expiresAt!==undefined && time>s.expiresAt){if(this.nativeSpecialAuras)this.onRemoveModifiers(s);s.hpBeforeTimeout=s.hp;s.hp=0;s.fadeOutAt=time;if(this.nativeSpecialAuras)s.healthBarHidden=true;if(this.nativeSpecialAuras){s.deathHealthAt=time;s.reinforcementFadeTo={x:s.pos.x+(s.facingLeft?-50:50),y:s.pos.y};this.releaseKnight(s)};s.target=undefined;s.attack=undefined;s.visualOverride=undefined;s.specialAttack=undefined}
      if(s.fadeOutAt!==undefined){if(this.nativeSpecialAuras&&s.reinforcementFadeTo){this.move(s,s.reinforcementFadeTo,dt);s.visualOverride={name:'walk',at:s.fadeOutAt,loop:true};return}s.pos.x+=(s.facingLeft?-1:1)*s.template.motion.max_speed*dt;s.moving=true;return}
      if(s.hp<=0){
        this.finishHeroRally(s)
        if(s.name.startsWith('soldier_knights_lvl'))this.advanceKnightDeath(s,time)
        if(s.name==='soldier_reinforcement_special'){if(this.nativeSpecialAuras)this.advanceKnightDeath(s,time);else s.visualOverride=undefined;s.specialAttack=undefined;s.reinforcementInAt=undefined}
        return
      }
      if(s.reinforcementInAt!==undefined){const finished=this.nativeSpecialAuras?nativeLogicAnimationFrame(reinforcementFrames(s.prefix??s.template.render.sprites[0].prefix,'in')??1,time,s.reinforcementInAt,false,30).runs>0:reinforcementAnimationFinished('in',time-s.reinforcementInAt);if(!finished)return;s.reinforcementInAt=undefined;s.healthBarHidden=false;s.visualOverride=undefined}
      if(s.specialAttack){this.advanceSpecialAttack(s,time);return}
      if(s.name==='soldier_reinforcement_special'&&!this.nativeSpecialAuras)s.visualOverride=undefined
      if(s.scriptLocked||time+1e-9<(s.actionYieldUntil??0))return
      if(s.rangedUntil!==undefined && time<s.rangedUntil)return
      if(s.deploying) {
        if(time<s.deployUntil)return
        if(!this.move(s,s.rally,dt))s.deploying=false
        return
      }
      if(s.hero&&s.attack&&s.target){this.soldierAttack(s,s.target,time);return}
      this.detachMissingTarget(s,enemies)
      if(s.target && (s.target.hp<=0 || s.target.path.finished || (s.target.template.vis.bans&1))){this.releaseKnight(s);s.attack=undefined}
      if(!s.target) {
        s.target=this.pickGenericTarget(s,enemies)
        if(s.target)s.retainedTarget=undefined
      }else if(s.target&&this.blockers(s.target).indexOf(s)!==0){const next=this.pickGenericTarget(s,enemies,true)??s.target;if(next!==s.target){this.releaseKnight(s);s.target=next}}
      const target=s.target
      if(target) {
        target.blocked=true
        const slot=this.blockers(target).indexOf(s)+1,spread=s.template.soldier.melee_slot_spread??{x:-3,y:-6}
        const offset=s.template.soldier.melee_slot_offset,enemyOffset=target.template.enemy.melee_slot??{x:30,y:0}
        const goal=meleeSlot(slot,target.path.position,Math.atan2(target.path.direction.y,target.path.direction.x),enemyOffset,offset,spread)
        if(s.pos.x!==goal.x||s.pos.y!==goal.y) {
          const nativeSpecial=this.nativeSpecialAuras&&s.name==='soldier_reinforcement_special'
          // animation_start(loop=true) preserves the preceding sprite timestamp.
          if(nativeSpecial)s.visualOverride={name:'walk',at:s.visualOverride?.at??s.born,loop:true}
          const moving=this.move(s,goal,dt)
          if(!moving){s.facingLeft=target.path.position.x<s.pos.x;s.idleVisual={name:s.template.melee.arrived_slot_animation??'idle',at:s.idleVisual?.at??s.born,loop:true};if(nativeSpecial)s.visualOverride={...s.idleVisual,at:s.visualOverride!.at}}
          s.attack=undefined;return
        }
        // Original soldier_move_to_slot_step sets arrived even when an earlier
        // continuation already placed the unit exactly at this new slot.
        s.motionArrived=true;s.facingLeft=target.path.position.x<s.pos.x
        if(!this.onSpecialAttack(s,target,time,enemies))this.soldierAttack(s,target,time)
      } else {
        s.attack=undefined
        this.move(s,s.rally,dt)
        if(s.moving){s.facingLeft=s.rally.x<s.pos.x;if(this.nativeSpecialAuras&&s.name==='soldier_reinforcement_special')s.visualOverride={name:'walk',at:s.visualOverride?.at??s.born,loop:true}}
        if(!s.moving){if(s.hero)s.idleRequestedAt=time;else this.advanceIdle(s,time,dt)}
        if(!s.moving && !(s.hero&&this.deferHeroes) && time-s.lastHitAt>s.template.regen.last_hit_standoff_time) {
          s.regenCounter+=dt
          if(s.regenCounter>s.template.regen.cooldown){s.hp=Math.min(s.template.health.hp_max,s.hp+s.template.regen.health);s.regenCounter=0}
        }
      }
  }
  advanceEnemyMain(e:EnemyInstance,time:number){
    e.blocked=e.hp>0&&this.blockers(e).length>0

      if(e.hp<=0 || e.rangedAttackActive || e.skillLocked)return
      if(this.enemyMelee.supports(e)){this.enemyMelee.advance(e,time);return}
      if(e.template.unit.is_stunned)return
      const blockers=this.blockers(e).filter(s=>!s.moving)
      const target=blockers[0],a=e.template.melee?.attacks[0]
      if(!target || target.hp<=0 || !a){e.meleeAttack=undefined;if(this.blockers(e).length)e.idleStartedAt??=time;else e.idleStartedAt=undefined;return}
      const cycle=e.meleeAttack
      if(cycle && cycle.targetId!==target.id)e.meleeAttack=undefined
      if(!e.meleeAttack && time+1e-9>=(e.meleeReadyAt??0)) {
        e.meleeReadyAt=time+a.cooldown
        if(this.random()>=(a.chance??1))return
        e.idleStartedAt=undefined;e.meleeAttack={startedAt:time,nextHit:0,attack:a,targetId:target.id,dodged:[]}
      }
      const attack=e.meleeAttack
      if(!attack)return
      const hitTimes=a.hit_times??[a.hit_time??0]
      while(attack.nextHit<hitTimes.length){
        const index=attack.nextHit,hitTime=Math.round(hitTimes[index]*30)/30
        if(target.dodge&&a.dodge_time!==undefined&&attack.dodged?.[index]===undefined){
          const dodgeTime=target.dodge.time_before_hit!==undefined?hitTime-target.dodge.time_before_hit:Math.round(a.dodge_time*30)/30
          if(time-attack.startedAt<dodgeTime)break
          attack.dodged??=[];attack.dodged[index]=this.dodges.check(target,time,false,a)
        }
        if(time-attack.startedAt+1e-9<hitTime)break
        const dodged=attack.dodged?.[index]??false
        if(dodged&&target.dodge?.active&&target.dodge.show_pop)this.dodges.show(target,time)
        if(!dodged&&target.hp>0){
          // Enemy attacks roll integers; dodge checks precede the damage roll.
          const rolled=a.damage_min+Math.floor(this.random()*(a.damage_max-a.damage_min+1))
          const value=Math.ceil((e.template.unit.damage_factor??1)*(a.hit_damage_factor?.[index]??1)*rolled)
          const applied=damageSoldier(target,{value,damage_type:a.damage_type},time,this.onKill)
          this.dodges.showDamage(e,target,time,a.pop,a.pop_chance,a.pop_conds,applied>0?2:0)
          if(target.hp<=0&&target.deathHealthAt===undefined){target.diedAt=time;target.target=undefined;target.attack=undefined;const sound=target.template.sound_events?.death;if(sound)this.onSound(sound)}
        }
        attack.nextHit++
      }
      if(time-attack.startedAt+1e-9>=a.cooldown){e.meleeAttack=undefined;e.idleStartedAt=time}
      }
  advanceCorpseTween(s:SoldierInstance,time:number){
    const fade=s.corpseFade;if(!fade)return
    s.corpseAlpha=Math.max(0,Math.min(255,255*(1-(time-fade.at-fade.delay)/fade.duration)))
    if(time-fade.at>=fade.delay+fade.duration&&s.removalQueuedAt===undefined){s.removalQueuedAt=time;this.onRemove(s)}
  }
  queueEnemyArrowDamage(target:SoldierInstance,value:number,attack:MeleeAttack,popOrder?:number){this.enemyDamage.push({enemy:undefined,target,value,attack,popOrder})}
  resolveDamage(time:number,enemies:EnemyInstance[],orderedSoldiers:Iterable<SoldierInstance>=this.soldiers){
    for(let i=this.enemyDamage.length-1;i>=0;i--){const hit=this.enemyDamage[i],{target,value,attack}=hit;hit.result=0;if(target.hp<=0)continue;const before=target.hp,applied=damageSoldier(target,{value,damage_type:attack.damage_type,reduce_armor:attack.reduce_armor,reduce_magic_armor:attack.reduce_magic_armor},time,this.onKill,this.deferDamage?this.onReflect:undefined);hit.result=(applied>0?1:0)|(before>0&&target.hp<=0?2:0);if(target.hp<=0&&target.deathHealthAt===undefined){const sound=target.template.sound_events?.death;if(sound)this.onSound(sound)}}
    for(const {enemy,target,attack,result,popOrder}of this.enemyDamage)this.dodges.showDamage(enemy,target,time,attack.pop,attack.pop_chance,attack.pop_conds,result,popOrder)
    this.enemyDamage.length=0
    // Original attacks enqueue damage; health runs after all main scripts, then pops.
    for(let i=this.knightDamage.length-1;i>=0;i--){
      const hit=this.knightDamage[i],{enemy:e,packet,soldier}=hit;hit.result=0
      if((e.hp<=0&&e.diedAt!==time)||e.template.health.ignore_damage)continue
      const alreadyKilled=e.diedAt===time
      recordEnemyDamage(e,packet.damage_type,time)
      const applied=predictDamage({...e.template.health,hp:e.hp},packet);e.hp=Math.max(0,e.hp-applied);hit.result=applied>0?2:0
      if(soldier.hero&&applied>0&&hit.xpFactor)soldier.xpQueued=(soldier.xpQueued??0)+applied*hit.xpFactor
      if(e.hp<=0&&!alreadyKilled){e.diedAt=time;this.onKill(e)}
    }
    for(const {soldier,enemy,attack:a,result,popOrder}of this.knightDamage)this.dodges.showDamage(soldier,enemy,time,a.pop,a.pop_chance,a.pop_conds,result,popOrder)
    this.knightDamage.length=0
    for(const s of orderedSoldiers){
      if(s.hero)continue
      const fade=s.corpseFade
      if(fade&&this.deferDamage)continue // Actual corpse fades belong to tween9 in entity-table order.
      if(fade)s.corpseAlpha=Math.max(0,Math.min(255,255*(1-(time-fade.at-fade.delay)/fade.duration)))
      const expired=fade?time-fade.at>=fade.delay+fade.duration:s.deathHealthAt!==undefined&&time>s.deathHealthAt+s.template.health.dead_lifetime
      if(expired&&s.removalQueuedAt===undefined){s.removalQueuedAt=time;this.onRemove(s)}
    }
    // A knight remains a blocker until its main coroutine enters y_soldier_death.
    for(const e of enemies)e.blocked=e.hp>0 && this.blockers(e).length>0
  }
  blockers(e:EnemyInstance) {
    const live=this.soldiers.filter(s=>(!soldierIsDead(s)||s.holdsBlockWhileDead) && s.target===e)
    const order=this.blockerOrder.get(e)??[]
    for(let i=order.length-1;i>=0;i--)if(!live.includes(order[i]))order.splice(i,1)
    for(const s of live)if(!order.includes(s))order.push(s)
    this.blockerOrder.set(e,order);return order
  }
  /** utils.unblock_target rotates the last surviving blocker to the front. */
  releaseKnight(s:SoldierInstance){
    s.retainedTarget=undefined
    if(!s.target)return
    const order=this.blockers(s.target),index=order.indexOf(s)
    if(index>=0)order.splice(index,1)
    if(order.length>1)order.unshift(order.pop()!)
    s.target=undefined
  }
  /** soldier.target_id can outlive its entity. A missing blocker_rank makes
   * target acquisition return a new local target without calling unblock_target. */
  storedTarget(s:SoldierInstance){return s.target??s.retainedTarget}
  private detachMissingTarget(s:SoldierInstance,enemies:EnemyInstance[]){
    if(s.target&&!enemies.includes(s.target)){s.retainedTarget=s.target;s.target=undefined;s.attack=undefined}
  }
  private advanceKnightDeath(s:SoldierInstance,time:number){
    s.deathHealthAt??=s.diedAt??time
    const state=this.knightStates.get(s)
    if(state?.waiting&&s.attack){this.advanceKnightAttack(s,state,time);return}
    if(s.diedAt!==undefined){
      const duration=s.template.unit?.fade_duration_after_death??2
      const deathFrames=((soldierFrames as unknown as Record<string,Record<string,number>>)[s.template.render.sprites[0].prefix]?.death??reinforcementFrames(s.prefix??s.template.render.sprites[0].prefix,'death')??1)
      if(nativeLogicAnimationFrame(deathFrames,time,s.diedAt,false,30).runs>0)s.deathFinishedAt??=time
      if(!s.corpseFade&&s.template.unit?.fade_time_after_death!==undefined&&nativeLogicAnimationFrame(((soldierFrames as unknown as Record<string,Record<string,number>>)[s.template.render.sprites[0].prefix]?.death??reinforcementFrames(s.prefix??s.template.render.sprites[0].prefix,'death')??1),time,s.diedAt,false,30).runs>0){
        const delay=s.deathHealthAt+s.template.health.dead_lifetime-time-duration
        s.corpseFade={at:time,delay,duration}
      }
      return
    }
    this.releaseKnight(s);s.holdsBlockWhileDead=false;s.attack=undefined;s.diedAt=time
    s.visualOverride={name:'death',at:time,loop:false}
    const sound=s.template.sound_events?.death;if(sound)this.onSound(sound)
  }
  private advanceKnightRally(s:SoldierInstance,time:number,dt:number,enemies:EnemyInstance[]){
    let state=this.knightDeployments.get(s)
    const begin=()=>{
      this.releaseKnight(s);s.attack=undefined
      state={phase:'wait',startedAt:time,duration:s.slot/(s.rallyCount??3)*s.template.nav_rally.delay_max,previousBans:s.visBans??s.template.vis?.bans??0,previousImmunity:s.rallyImmunity??0}
      this.knightDeployments.set(s,state);s.visBans=4294967295;s.rallyImmunity=s.template.nav_rally.immune_to??0;s.rallyRequested=false;s.deployUntil=time+state.duration
      s.visualOverride={name:'idle',at:s.visualOverride?.at??s.born,loop:true}
    }
    const finish=()=>{s.visBans=state!.previousBans;s.rallyImmunity=state!.previousImmunity;s.deploying=false;s.rallyRequested=false;this.knightDeployments.delete(s)}
    if(!state){const attack=this.knightStates.get(s);if(attack?.waiting&&s.attack){this.advanceKnightAttack(s,attack,time);return true}begin()}
    if(state!.phase==='wait'){
      if(time-state!.startedAt<state!.duration){
        if(s.rallyRequested){s.visBans=state!.previousBans;s.rallyImmunity=state!.previousImmunity;begin()}
        return true
      }
      state!.phase='walk'
    }
    if(s.rallyRequested)s.rallyRequested=false // Walking retargets without another delay.
    if(s.pos.x===s.rally.x&&s.pos.y===s.rally.y){finish();return false}
    if(s.firstRally!==false){
      s.firstRally=false
      const target=enemies.find(e=>e.hp>0&&!e.path.finished&&!(e.template.vis.flags&256)&&!(e.template.vis.bans&1)&&(!e.template.enemy.max_blockers||this.blockers(e).length===0)&&(e.path.position.x-s.center.x)**2+((e.path.position.y-s.center.y)/.7)**2<=s.template.melee.range**2)
      if(target){finish();return false}
    }
    s.facingLeft=s.rally.x<s.pos.x;this.move(s,s.rally,dt)
    s.visualOverride={name:'walk',at:s.visualOverride?.at??s.born,loop:true}
    return true // The arriving step still yields with immunity and walk animation.
  }
  private advanceKnight(s:SoldierInstance,time:number,dt:number,enemies:EnemyInstance[]){
    let state=this.knightStates.get(s)
    if(!state){state={attackTs:0,waiting:false};this.knightStates.set(s,state)}
    // A yielding attack owns its target until the preceding render reports completion.
    if(state.waiting&&s.attack){this.advanceKnightAttack(s,state,time);return}
    if(s.attack){s.attack=undefined;state.waiting=false}
    this.detachMissingTarget(s,enemies)
    if(s.target&&(s.target.hp<=0||s.target.path.finished||(s.target.template.vis.bans&1)))this.releaseKnight(s)
    const eligible=(e:EnemyInstance)=>e.hp>0&&!e.path.finished&&!(e.template.vis.flags&256)&&!(e.template.vis.bans&1)&&(e.path.position.x-s.center.x)**2+((e.path.position.y-s.center.y)/.7)**2<=s.template.melee.range**2
    let next=s.target
    if(!next)next=this.pickGenericTarget(s,enemies)
    else if(this.blockers(next).indexOf(s)!==0)next=this.pickGenericTarget(s,enemies,true)??next
    if(next!==s.target){this.releaseKnight(s);s.target=next;if(next)this.blockers(next)}
    const target=s.target
    if(!target){
      const moving=this.move(s,s.rally,dt);if(moving)s.facingLeft=s.rally.x<s.pos.x;s.visualOverride={name:moving?'walk':'idle',at:s.visualOverride?.at??s.born,loop:true}
      if(!moving)this.advanceIdle(s,time,dt)
      if(!s.moving&&time-s.lastHitAt>s.template.regen.last_hit_standoff_time){
        s.regenCounter+=dt
        if(s.regenCounter>s.template.regen.cooldown){s.hp=Math.min(s.template.health.hp_max,s.hp+s.template.regen.health);s.regenCounter=0}
      }
      return
    }
    target.blocked=true
    const goal=meleeSlot(this.blockers(target).indexOf(s)+1,target.path.position,Math.atan2(target.path.direction.y,target.path.direction.x),target.template.enemy.melee_slot??{x:30,y:0},s.template.soldier.melee_slot_offset,s.template.soldier.melee_slot_spread)
    if(goal.x!==s.pos.x||goal.y!==s.pos.y){
      const moving=this.move(s,goal,dt)
      s.visualOverride={name:moving?'walk':'idle',at:s.visualOverride?.at??s.born,loop:true}
      if(!moving)s.facingLeft=target.path.position.x<s.pos.x
      return // Even the arriving walk step yields before picking an attack.
    }
    s.motionArrived=true
    const a=s.template.melee.attacks.find(a=>!a.disabled&&a.type!=='area')
    if(!a||!(a.cooldown<time-state.attackTs)||(a.vis_flags&target.template.vis.bans)||(a.vis_bans&target.template.vis.flags)){this.onKnightInCooldown(s,time);return}
    if((a.chance??1)<=this.random()){state.attackTs=time;this.onKnightInCooldown(s,time);return}
    const factor=s.name.startsWith('soldier_knights_lvl')?(s.towerDamageFactor??1):1,scaled={...a,damage_min:a.damage_min*factor,damage_max:a.damage_max*factor}
    s.attack={startedAt:time,nextHit:0,attack:scaled,targetId:target.id};state.waiting=true
    s.visualOverride={name:a.animation,at:time,loop:false};s.facingLeft=target.path.position.x<s.pos.x
    if(a.sound)this.onSound(a.sound)
    this.advanceKnightAttack(s,state,time)
  }
  private advanceKnightAttack(s:SoldierInstance,state:{attackTs:number;waiting:boolean},time:number){
    const cycle=s.attack!,a=cycle.attack,e=s.target!
    const hitTime=Math.round((a.hit_time??0)*30)/30
    if((s.hp<=0||s.rallyRequested&&!a.ignore_rally_change)&&time-cycle.startedAt<hitTime){
      state.waiting=false;s.attack=undefined;if(a.sound)this.onStopSound(a.sound);return
    }
    if(cycle.nextHit===0&&time-cycle.startedAt>=hitTime){
      cycle.nextHit=1;state.attackTs=cycle.startedAt
      // The coroutine rolls its damage even when its retained target died during windup.
      if(!this.dodges.checkEnemy(e,time,true,a)&&this.blockers(e).includes(s)){
        const packet=this.damage(a,soldierDamageFactor(s))
        const order=this.onDamageCreate();this.knightDamage.push({soldier:s,enemy:e,attack:a,packet,popOrder:typeof order==='number'?order:undefined})
        if(a.mod)this.onKnightMeleeModifier(a.mod,e,s,a.level??0,time)
        if(a.hit_fx){const o=a.hit_offset??{x:0,y:0},pos={x:s.pos.x+(s.facingLeft?-1:1)*o.x,y:s.pos.y+o.y};this.onEffectCreate(a.hit_fx,pos,time);this.onEffect(a.hit_fx,pos,time)}
      }
    }
    if(e.dodge?.active&&e.dodge.show_pop)this.dodges.show(e,time)
    const prefix=s.template.render.sprites[0].prefix,counts=soldierFrames as unknown as Record<string,Record<string,number>>,count=counts[prefix]?.[a.animation]??(s.name==='soldier_reinforcement_base'?reinforcementFrames(s.prefix??prefix,a.animation):undefined)
    if(s.hp<=0||s.rallyRequested&&!a.ignore_rally_change||count&&nativeLogicAnimationFrame(count,time,cycle.startedAt,false,30).runs>0){
      state.waiting=false;s.attack=undefined
      if(a.sound)this.onStopSound(a.sound)
    }
  }
  private move(s:SoldierInstance,to:Point,dt:number):boolean {
    s.motionDest={...to}
    const dx=to.x-s.pos.x,dy=to.y-s.pos.y,distance=Math.sqrt(dx*dx+dy*dy),step=s.template.motion.max_speed*dt
    if(distance<=step){Object.assign(s.pos,to);s.motionArrived=true;return false}
    s.motionArrived=false
    const angle=Math.atan2(dy,dx),x=Math.cos(angle),y=Math.sin(angle),length=Math.sqrt(x*x+y*y)
    s.pos.x+=step*(x/length);s.pos.y+=step*(y/length);s.facingLeft=dx<0;s.moving=true;return true
  }
  private damage(a:MeleeAttack,factor=1) {return {value:Math.ceil((a.damage_min+Math.floor(this.random()*(a.damage_max-a.damage_min+1)))*factor),damage_type:a.damage_type,reduce_armor:a.reduce_armor,reduce_magic_armor:a.reduce_magic_armor}}
  private hits(cycle:MeleeCycle,time:number,hit:(index:number)=>void) {
    const times=cycle.attack.hit_times??[cycle.attack.hit_time??0]
    while(cycle.nextHit<times.length && time-cycle.startedAt>=times[cycle.nextHit]){hit(cycle.nextHit);cycle.nextHit++}
  }
  private genericMeleeClocks=new WeakMap<SoldierInstance,number>()
  private soldierAttack(s:SoldierInstance,e:EnemyInstance,time:number) {
    if(s.name==='soldier_reinforcement_special'){
      if(time<s.readyAt)return
      const attack=s.template.melee.attacks[0];if(this.nativeSpecialAuras&&(attack.chance??1)<=this.random()){s.readyAt=time+attack.cooldown;return}s.specialAttack=new SpecialReinforcementAttack(time,this.nativeSpecialAuras);s.specialTarget=e;s.attack={startedAt:time,nextHit:0,attack,targetId:e.id};s.readyAt=time+attack.cooldown
      if(attack.sound)this.onSound(attack.sound);this.advanceSpecialAttack(s,time);return
    }
    const lastMelee=this.genericMeleeClocks.get(s),cooldown=s.template.melee.attacks[0]?.cooldown??0
    if(!s.attack&&lastMelee!==undefined&&time-lastMelee<=cooldown)return
    if(!s.attack && time+1e-9>=s.readyAt){
      const attacks=s.template.melee.attacks.filter(a=>!a.disabled&&a.type!=='area');let a=attacks[0]
      if(s.hero&&attacks.length>1&&this.random()<(attacks[1].chance??0))a=attacks[1]
      else if(a&&this.random()>=(a.chance??1)){s.readyAt=time+a.cooldown;this.genericMeleeClocks.set(s,time);return}
      if(!a)return
      this.genericMeleeClocks.set(s,time)
      const critical=a.critical_chance!==undefined&&this.random()<a.critical_chance
      s.attack={startedAt:time,nextHit:0,attack:a,targetId:e.id,critical};s.readyAt=time+a.cooldown
      if(s.hero)s.meleeVisual={name:a.animation,at:time}
      if(a.sound)this.onSound(a.sound)
      if(critical){s.template.unit!.damage_factor=(s.template.unit!.damage_factor??1)*2;this.criticalAttacks.set(s.id,{soldier:s,cycle:s.attack})}
    }
    if(!s.attack)return
    const a=s.attack.attack
    this.hits(s.attack,time,()=>{
      if(!this.deferDamage&&e.hp<=0||e.escapedAt!==undefined)return
      if(this.dodges.checkEnemy(e,time,false,a)){if(e.dodge?.active&&e.dodge.show_pop)this.dodges.show(e,time);return}
      if(a.sound_hit)this.onSound(a.sound_hit)
      if(this.deferDamage){
        if(!this.blockers(e).includes(s))return
        const attack=s.attack?.critical?{...a,pop:['pop_crit_heroes'],pop_chance:1}:a
        const packet=this.damage(a,(s.towerDamageFactor??1)*soldierDamageFactor(s))
        const order=this.onDamageCreate();this.knightDamage.push({soldier:s,enemy:e,attack,packet,xpFactor:a.xp_gain_factor,popOrder:typeof order==='number'?order:undefined})
        if(a.hit_fx){const offset=a.hit_offset??{x:0,y:0},pos={x:s.pos.x+(s.facingLeft?-1:1)*offset.x,y:s.pos.y+offset.y};this.onEffectCreate(a.hit_fx,pos,time);this.onEffect(a.hit_fx,pos,time)}
        return
      }
      if(e.hp<=0||e.template.health.ignore_damage)return
      recordEnemyDamage(e,a.damage_type,time)
      const applied=predictDamage({...e.template.health,hp:e.hp},this.damage(a,(s.towerDamageFactor??1)*soldierDamageFactor(s)))
      e.hp-=applied
      this.dodges.showDamage(s,e,time,s.attack?.critical?['pop_crit_heroes']:a.pop,s.attack?.critical?1:a.pop_chance,a.pop_conds,applied>0?2:0)
      if(s.hero && applied>0 && a.xp_gain_factor)s.xpQueued=(s.xpQueued??0)+applied*a.xp_gain_factor
      if(e.hp<=0){e.diedAt=time;this.onKill(e)}
    })
    if(s.hero?nativeLogicAnimationFrame(Math.round((s.template.webAnimationDurations?.[a.animation]??a.cooldown)*30),time,s.attack.startedAt,false,30).runs>0:time-s.attack.startedAt+1e-9>=a.cooldown)s.attack=undefined
  }
  private advanceSpecialAttack(s:SoldierInstance,time:number){
    const state=s.specialAttack!,target=s.specialTarget!,a=s.template.melee.attacks[0]
    if(target.hp>0)target.blocked=true
    const hit=state.advance(time,{dead:s.hp<=0,stunned:s.template.unit?.is_stunned})
    s.visualOverride={name:state.name,at:state.at}
    if(this.nativeSpecialAuras&&hit){
      if(!this.dodges.checkEnemy(target,time,true,a)&&this.blockers(target).includes(s)){
        const packet=this.damage(a,soldierDamageFactor(s)),order=this.onDamageCreate()
        this.knightDamage.push({soldier:s,enemy:target,attack:a,packet,popOrder:typeof order==='number'?order:undefined})
        if(a.hit_fx){const o=a.hit_offset??{x:0,y:0},pos={x:s.pos.x+(s.facingLeft?-1:1)*o.x,y:s.pos.y+o.y};this.onEffectCreate(a.hit_fx,pos,time);this.onEffect(a.hit_fx,pos,time)}
      }
    }else
    if(hit&&s.target===target&&target.hp>0&&!target.template.health.ignore_damage&&!(target.smokeDodgeUntil!==undefined&&time<=target.smokeDodgeUntil&&!target.template.unit.is_stunned)){
      recordEnemyDamage(target,a.damage_type,time)
      const damage=predictDamage({...target.template.health,hp:target.hp},this.damage(a,(s.towerDamageFactor??1)*soldierDamageFactor(s)))
      target.hp-=damage;this.dodges.showDamage(s,target,time,a.pop,a.pop_chance,a.pop_conds,damage>0?2:0)
      if(target.hp<=0){target.diedAt=time;this.onKill(target)}
    }
    if(state.done){s.specialAttack=undefined;s.specialTarget=undefined;s.attack=undefined}
  }
}
