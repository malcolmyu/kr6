import {enemyIsDead} from './EnemyDeath.ts'
import bolinMortarData from '../../public/data/bolin-mortar.json' with {type:'json'}
import {luaSort} from './LuaSort.ts'
import {CulverineThrottleRuntime} from './CulverineThrottleRuntime.ts'
import {CulverineSulfurRuntime} from './CulverineSulfurRuntime.ts'
import {HealthBarRuntime} from './HealthBarRuntime.ts'
import {ReinforcementSpecialRuntime} from './ReinforcementSpecialRuntime.ts'
import type {ReinforcementSpecialModel} from './ReinforcementSpecialRuntime.ts'
import {KnightLegacySystem} from './KnightLegacy.ts'
import type {KnightLegacyAura} from './KnightLegacy.ts'
import {KnightHealSystem} from './KnightHeal.ts'
import {KnightArmorSystem} from './KnightArmor.ts'
import type {KnightArmorAura} from './KnightArmor'
import {WizardCopiesRuntime} from './WizardCopiesRuntime.ts'
import type {WizardCopiesBounce,WizardCopiesAura} from './WizardCopiesRuntime'
import copiesData from '../../public/data/wizard-copies-trail.json' with {type:'json'}
import {UnitPainterHistory} from './UnitPainterHistory.ts'
import type {DodgeState} from './DodgeSystem'
import {WaveGems} from './WaveGems.ts'
import {initializeNativeTemplateRandom} from './NativeTemplateRandom.ts'
import {NativeSpatialEntities} from './NativeSpatialEntities.ts'
import {AmbientCreatures} from './AmbientCreatures.ts'
import {StaticEffects} from './StaticEffects.ts'
import {EnemyDeathSystem} from './EnemyDeath.ts'
import type {SoldierInstance} from './BarracksCombat'
import type {HeroProjectile} from './HeroRangedCombat'
import {globalUpgradeTemplates} from './GlobalUpgrades.ts'
import type {GlobalUpgradeSelection} from './GlobalUpgrades'
import {catapultTrapPositions} from './CatapultTrapPlacement.ts'
import {WizardEmpowerSystem} from './WizardEmpower.ts'
import type {NativeRangeModel,NativeRangeBuff} from './ArcherRangeRuntime'
import {ArcherRangeSystem} from './ArcherRange.ts'
import {ArcherPierceStunSystem} from './ArcherPierceStun.ts'
import type {ArcherPierceStun} from './ArcherPierceStun'
import type {ArcherPierceRay} from './ArcherPierceRay'
import {ArcherMarkRuntime} from './ArcherMarkRuntime.ts'
import type {ArcherMark} from './ArcherMarkRuntime'
import {EnemyTeleport} from './EnemyTeleport.ts'
import {EnemySkills} from './EnemySkills.ts'
import {EnemyRangedCombat} from './EnemyRangedCombat.ts'
import type {EnemyRangedAttack} from './EnemyRangedCombat'
import {RoadPlacement} from './RoadPlacement.ts'
import { PathFollower } from './PathFollower.ts'
import {EnemyPath} from './EnemyPath.ts'
import type {EnemyRoute} from './EnemyPath'
import { WaveRunner } from './WaveRunner.ts'
import type { SpawnCommand, WaveCommand, WaveProgram } from './WaveRunner'
import type { GameMode, LevelData, Point } from './types'
import { TowerSystem } from './TowerSystem.ts'
import type { TowerKind, TowerTemplate,TowerSite } from './TowerSystem'
import {RangedCombat} from './RangedCombat.ts'
import type {CombatTemplate} from './RangedCombat'
import {BarracksCombat} from './BarracksCombat.ts'
import type {BarrackTemplate,SoldierTemplate,MeleeAttack,MeleeCycle} from './BarracksCombat'
import {evaluateOutcome} from './Outcome.ts'
import type {Outcome} from './Outcome'
import {StageFlow} from './StageFlow.ts'
import {TutorialState} from './TutorialState.ts'
import {PowerSystem} from './PowerSystem.ts'
import {BuyAvailableSystem} from './BuyAvailable.ts'
import {FishingSystem} from './Fishing.ts'
import {RuntimeEntities} from './RuntimeEntities.ts'
import {BackgroundSounds} from './BackgroundSounds.ts'
import {HeroSystem} from './HeroSystem.ts'
import {powerUpgradeTemplates} from './PowerUpgrades.ts'
import type {PowerUpgradeSelection} from './PowerUpgrades'
export interface EnemyTemplate {
  death_spawns?:unknown
  smokebomb?:{hp_threshold:number;min_nodes_to_exit:number;delay:number;animation:string;sound:string;smoke_t:string}
  ranged?:{attacks:EnemyRangedAttack[]}
  webAnimationDurations?:Record<string,number>
  sound_events?:Record<string,string>
  motion: { max_speed: number;invulnerable?:boolean }
  health: { immune_to?:number;raw_armor?:number;raw_magic_armor?:number;ignore_damage?:boolean;hp_max: number | number[]; armor: number; magic_armor: number; damage_factor:number; dead_lifetime:number }
  vis:{flags:number;bans:number}
  unit:{hide_after_death?:boolean;hit_offset:Point;blood_color?:string;show_blood_pool?:boolean;death_animation?:string;fade_time_after_death?:number;fade_duration_after_death?:number;can_explode?:boolean;can_disintegrate?:boolean;explode_fx?:string;disintegrate_fx?:string;pop_offset?:Point;mod_offset?:Point;damage_factor?:number;is_stunned?:boolean;stun_count?:number;ignore_stun?:boolean;size?:number}
  enemy: { gems?:number;can_do_magic?:boolean;can_accept_magic?:boolean;gold: number; lives_cost: number;melee_slot?:Point;max_blockers?:number }
  melee?:{attacks:MeleeAttack[]}
  render: { sprites: { z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;name?:string;scale?:Point;anchor: Point; offset: Point; prefix: string; angles: {walk: string[]}; angles_custom: {walk: number[]};angles_stickiness?:{walk?:number} }[] }
}
export interface EnemyInstance {
  dodge?:DodgeState
  id: number; name: string; born: number; age: number; path: EnemyRoute; template: EnemyTemplate; hp: number; diedAt?:number
  deathManaged?:boolean;deathStartedAt?:number;deathFinishedAt?:number;deathHidden?:boolean;corpseAlpha?:number;deathRemovalQueuedAt?:number;lastDamageTypes?:number;damageTypesAt?:number;headingAngle?:number
  teleporting?:boolean;teleportHidden?:boolean;teleportAt?:number;teleportCount?:number;
  skillLocked?:boolean;visualOverride?:{name:string;at:number;loop?:boolean;facingLeft?:boolean};smokeDodgeUntil?:number;smokeDodgeVisualAt?:number;
  idleStartedAt?:number;
  rangedHolding?:boolean;rangedAttackActive?:boolean;
  motionSpeed?:Point;meleeManaged?:boolean;meleeHolding?:boolean;blocked?:boolean;meleeAttack?:MeleeCycle;meleeReadyAt?:number;escapedAt?:number
  frozen?:boolean;animationAge?:number
}
export class GameSession {
  readonly throttle=new CulverineThrottleRuntime()
  readonly sulfur:CulverineSulfurRuntime
  readonly healthBars=new HealthBarRuntime()
  readonly paintOrder=new UnitPainterHistory()
  readonly enemyDeaths:EnemyDeathSystem
  readonly staticEffects:StaticEffects
  readonly enemies: EnemyInstance[] = []
  readonly waves: WaveRunner
  readonly towers: TowerSystem
  readonly knightArmor=new KnightArmorSystem()
  readonly knightHeal=new KnightHealSystem()
  readonly knightLegacy:KnightLegacySystem
  readonly reinforcementSpecial:ReinforcementSpecialRuntime
  private soldKnightRosters=new Map<number,SoldierInstance[]>()
  readonly wizardEmpower:WizardEmpowerSystem
  readonly archerRange:ArcherRangeSystem
  readonly archerPierceStun:ArcherPierceStunSystem
  readonly archerMark:ArcherMarkRuntime
  readonly wizardCopies:WizardCopiesRuntime
  readonly combat:RangedCombat
  readonly barracks:BarracksCombat
  readonly powers:PowerSystem
  readonly enemySkills:EnemySkills
  readonly enemyTeleports:EnemyTeleport
  readonly enemyRanged:EnemyRangedCombat
  readonly heroes:HeroSystem
  readonly buyAvailable:BuyAvailableSystem
  readonly creatures:AmbientCreatures
  readonly fishing:FishingSystem
  entities?:RuntimeEntities
  readonly backgroundSounds:BackgroundSounds
  cinematic=false
  tutorial?:TutorialState
  private accumulator=0
  private tick=0
  gold = 0
  lives = 0
  paused = false
  outcome?:Outcome
  levelScriptComplete=false
  private hadEnemies=false
  private stageFlow?:StageFlow
  private mode:GameMode
  private nextId = 1
  private pendingEnemies:{enemy:EnemyInstance;tick:number}[]=[]
  readonly waveGems:WaveGems
  private pendingWaveCall=false
  private stepping=false
  time = 0
  onCommand: (command: WaveCommand) => void = () => {}
  readonly nativeEffects:{name:string;pos:Point;at:number}[]=[]
  onSound:(name:string,options?:{delay?:number})=>void=()=>{}
  onStopSound:(name:string)=>void=()=>{}
  private soldierSpatial=new NativeSpatialEntities<SoldierInstance>()
  private enemySpatial=new NativeSpatialEntities<EnemyInstance>()
  private level: LevelData
  private templates: Record<string,EnemyTemplate>
  private random: () => number
  constructor(level: LevelData, program: WaveProgram, templates: Record<string,EnemyTemplate>, random = Math.random, mode:GameMode='campaign',selectedTowers:import('./TowerSystem').TowerKind[]=['archers','knights','catapult'],powerUpgrades:PowerUpgradeSelection={},globalUpgrades:GlobalUpgradeSelection={}) {
    templates=initializeNativeTemplateRandom(templates,random)
    templates=globalUpgradeTemplates(powerUpgradeTemplates(templates,powerUpgrades),globalUpgrades)
    this.level=level;this.templates=templates;this.random=random;this.mode=mode;this.waveGems=new WaveGems(mode,random)
    this.towers=new TowerSystem(level,mode,templates as unknown as Record<string,TowerTemplate>,selectedTowers)
    this.buyAvailable=new BuyAvailableSystem(this.towers,templates as unknown as ConstructorParameters<typeof BuyAvailableSystem>[1])
    this.creatures=new AmbientCreatures(level,mode,templates as unknown as ConstructorParameters<typeof AmbientCreatures>[2],random)
    this.creatures.onRemove=m=>this.entities?.remove(m);this.creatures.onSound=name=>this.onSound(name)
    this.fishing=new FishingSystem(level,mode,random)
    this.backgroundSounds=new BackgroundSounds(level,random)
    this.backgroundSounds.onSound=name=>this.onSound(name)
    this.backgroundSounds.onRemove=()=>this.entities?.remove(this.backgroundSounds)
    this.fishing.onSound=name=>this.onSound(name)
    this.fishing.onSignal=(name,args)=>{if(name==='got-gold')this.gold+=Number(args[1]);this.waves.signal(name);this.onCommand({name:'signal',signal_name:name,value:args})}
    const reward=(enemy:EnemyInstance)=>{
      enemy.hp=0
      this.powers?.royal.onEnemyKilled(enemy,this.time)
        this.gold+=enemy.template.enemy.gold
      const gems=enemy.template.enemy.gems??0;if(gems>0){this.waveGems.collected+=gems;this.onCommand({name:'signal',signal_name:'show-gems-reward',value:gems})}
      if(this.enemyDeaths.supports(enemy))enemy.deathManaged=true;else{const sound=enemy.template.sound_events?.death;if(sound)this.onSound(sound)}
      this.waves.signal('got-enemy-gold')
      this.onCommand({name:'signal',signal_name:'got-enemy-gold'})
    }
    this.staticEffects=new StaticEffects(templates as unknown as ConstructorParameters<typeof StaticEffects>[0])
    this.staticEffects.onCreate=m=>{this.entities?.queue(m.name,m)}
    this.staticEffects.onRegisterTween=(m,update)=>this.entities?.setTween(m,update)
    this.staticEffects.onRemove=m=>this.entities?.remove(m)
    this.enemyDeaths=new EnemyDeathSystem(templates as unknown as ConstructorParameters<typeof EnemyDeathSystem>[0])
    this.enemyDeaths.onRegisterTween=(model,update)=>this.entities?.setTween(model,update)
    this.enemyDeaths.onBlood=b=>{this.entities?.queue('decal_blood_pool',b)}
    this.enemyDeaths.onEffect=fx=>{this.entities?.queue(fx.name,fx)}
    this.enemyDeaths.isEffectPresent=fx=>!!this.entities?.registry.entities.get(this.entities.entity(fx)?.id??-1)
    this.enemyDeaths.onRemove=model=>this.entities?.remove(model)
    this.enemyDeaths.onSound=name=>this.onSound(name)
    this.combat=new RangedCombat(templates as unknown as Record<string,CombatTemplate>,random,reward)
    this.wizardCopies=new WizardCopiesRuntime(level,templates as unknown as ConstructorParameters<typeof WizardCopiesRuntime>[1],copiesData.landFrames,random)
    this.combat.enemyCandidates=(pool,at,radius)=>{if(!this.entities)return pool;const found:EnemyInstance[]=[];this.enemySpatial.filter(found,'targets',at.x,at.y,radius);return found.filter(e=>pool.includes(e)).concat(pool.filter(e=>!this.entities!.entity(e)))}
    this.combat.projectileTargetPresent=(enemy,pool)=>{const e=this.entities?.entity(enemy);return e?!!this.entities!.registry.entities.get(e.id):pool.includes(enemy)}
    this.combat.deferParticlePhase=true;this.combat.deferArcherControllers=true
    this.combat.onQueueArcherController=c=>this.entities?.queue('controller_archers_shooter',c,'archerShooter')
    this.combat.onRemoveArcherController=c=>this.entities?.remove(c)
    this.combat.onAllocateProjectile=(model,name)=>{if(this.entities){const e=this.entities.allocate(name);this.entities.bind(e,model,'projectile')}}
    this.combat.onQueueProjectile=(shot,name)=>{const allocated=this.entities?.entity(shot);if(allocated)this.entities!.registry.queueInsert(allocated);else this.entities?.queue(name,shot,'projectile')}
    this.wizardCopies.onQueue=(model,kind)=>this.entities?.queue(model.name,model,kind)
    this.wizardCopies.onRemove=model=>this.entities?.remove(model)
    this.wizardCopies.onReserve=name=>this.combat.reserveCopiesProjectile(name)
    this.wizardCopies.onBomb=(model,shot,time)=>this.combat.queueCopiesBomb(model,shot,time)
    this.wizardCopies.onShard=(model,shot,time)=>this.combat.queueCopiesShard(model,shot,time)
    this.combat.onCopiesPayload=(pos,level)=>this.wizardCopies.queueBounce(pos,level)
    this.combat.onCopiesLanded=(pos,level)=>this.wizardCopies.queueAura(pos,level)
    this.wizardCopies.book.targets=(pos,range)=>this.combat.enemyCandidates(this.enemies,pos,range).filter(e=>e.hp>0&&e.escapedAt===undefined&&this.combat.targetValid(e)&&(e.path.position.x-pos.x)**2+(e.path.position.y-pos.y)**2/(.7*.7)<=range*range).map(e=>({id:e.id,pos:e.path.position}))
    this.combat.onInsertProjectile=(shot,p)=>{p.registryBound=!!this.entities;this.entities?.rebind(shot,p,'projectile')}
    this.combat.onRemoveProjectile=p=>this.entities?.remove(p)
    const particleModels=new Map<number,object>()
    this.combat.onParticleCreate=(name,_time,p)=>{const model={system:this.combat.firebookTrails,sourceId:p.id};particleModels.set(p.id,model);this.entities?.queue(name,model,'particle')}
    this.combat.firebookTrails.onRemove=trail=>{const model=particleModels.get(trail.sourceId);if(model){this.entities?.remove(model);particleModels.delete(trail.sourceId)}}
    this.combat.onDamageCreate=()=>this.entities?.allocate('damage').id
    this.combat.onEffectCreate=(name,time,pos,transform)=>{if(!this.staticEffects.queue(name,pos,time,transform)){const model={name,pos:{...pos},at:time};this.nativeEffects.push(model);this.entities?.queue(name,model)}}
    this.wizardEmpower=new WizardEmpowerSystem(templates as unknown as ConstructorParameters<typeof WizardEmpowerSystem>[0]);this.combat.wizardTowers.empower=this.wizardEmpower;this.combat.wizardTowers.onSound=name=>this.onSound(name)
    this.archerRange=new ArcherRangeSystem(templates as unknown as ConstructorParameters<typeof ArcherRangeSystem>[0]);this.archerRange.deferSources=true;this.combat.onArcherPowerUpdates=(site,time)=>this.archerRange.syncUpgrades(site,time);this.combat.onArcherRangeMain=(site,time)=>this.archerRange.advanceSource(site,time,this.entities?[...this.entities.persistent.get('towers').values()].filter(e=>!e.pending_removal).flatMap(e=>{const s=this.towers.sites.find(s=>this.entities!.entity(s)===e);return s?[s]:[]}):this.towers.sites);this.archerRange.onSound=name=>this.onSound(name);this.archerRange.onCast=(site,time)=>{const state=this.combat.shooters.get(site.id);if(state)state.archerTs=time}
    this.reinforcementSpecial=new ReinforcementSpecialRuntime(templates as unknown as ConstructorParameters<typeof ReinforcementSpecialRuntime>[0])
    this.knightLegacy=new KnightLegacySystem(this.random)
    this.archerPierceStun=new ArcherPierceStunSystem(templates as unknown as ConstructorParameters<typeof ArcherPierceStunSystem>[0])
    this.combat.archerPierceRays.onModifier=(name,enemy)=>this.archerPierceStun.queue(name,enemy)
    this.sulfur=new CulverineSulfurRuntime(templates as unknown as ConstructorParameters<typeof CulverineSulfurRuntime>[0])
    this.archerMark=new ArcherMarkRuntime(templates.mod_archers_skill_c_weak as unknown as ConstructorParameters<typeof ArcherMarkRuntime>[0])
    if(this.combat.archerMarkCaster){
      this.combat.archerMarkCaster.onEagle=(name,enemy,time)=>{
        const model={name,pos:enemy.path.position,at:time};this.nativeEffects.push(model);this.entities?.queue(name,model);this.combat.onEffect(name,model.pos,time)
      }
      this.combat.archerMarkCaster.onMark=(enemy,level,site)=>this.archerMark.queue(enemy,level,this.entities?.entity(site)?.id)
    }
    this.combat.cellAt=pos=>new RoadPlacement(level).cell(pos)
    this.combat.catapultTowers.findTrapPosition=(site,scope,range,spacing)=>{const mines=[...(this.entities?this.combat.nativeTraps.traps:this.combat.catapultTraps.traps)].filter(t=>(t.pos.x-site.pos.x)**2+(t.pos.y-site.pos.y)**2<=scope*scope).map(t=>t.pos),positions=catapultTrapPositions(level,site.pos,mines,range,spacing);return positions[Math.floor(random()*positions.length)]}
    this.combat.targetValid=e=>!(e.path instanceof EnemyPath) || level.navigation?.targetNodes?.[e.path.pi-1]?.[e.path.ni-1]!==false
    this.combat.predictTarget=(enemy,seconds)=>{
      const path=enemy.path,speed=enemy.motionSpeed?Math.hypot(enemy.motionSpeed.x,enemy.motionSpeed.y):enemy.blocked||enemy.meleeHolding||enemy.frozen||enemy.rangedHolding||enemy.skillLocked?0:Math.hypot(path.direction.x,path.direction.y)*enemy.template.motion.max_speed
      if(path instanceof EnemyPath){const prediction=path.nativePrediction(seconds,speed);return {pos:prediction.pos,valid:level.navigation?.targetNodes?.[path.pi-1]?.[prediction.ni-1]!==false}}
      return {pos:path.predict(speed*seconds),valid:this.combat.targetValid(enemy)}
    }
    this.barracks=new BarracksCombat(templates as unknown as Record<string,SoldierTemplate&BarrackTemplate>,random,reward)
    this.barracks.enemyCandidates=(pool,pos,range)=>this.combat.enemyCandidates(pool,pos,range);this.barracks.targetValid=e=>this.combat.targetValid(e);this.barracks.cellAt=p=>this.combat.cellAt(p)
    this.barracks.dodges.onCreate=(name,pop)=>{this.entities?.queue(name,pop,'pop');this.entities?.setTween(pop,time=>this.barracks.dodges.advanceOne(pop,time))}
    this.barracks.dodges.onRemove=pop=>this.entities?.remove(pop)
    this.enemyDeaths.cellAt=pos=>this.combat.cellAt(pos)
    this.combat.onMainComplete=()=>{if(this.entities){this.entities.timedPhase();this.fishing.advanceTimed(this.time);this.entities.tweenPhase()}else{this.barracks.dodges.advance(this.time);this.enemyDeaths.advanceTweens(this.time);this.staticEffects.advance(this.time)}}
    this.barracks.onDamageCreate=()=>this.entities?.allocate('damage').id
    this.barracks.onEffectCreate=(name,pos,time)=>{
      if(this.entities&&pos&&time!==undefined){const model={name,pos:{...pos},at:time};this.nativeEffects.push(model);this.entities.queue(name,model)}
      else this.entities?.queue(name)
    }
    this.barracks.onSpecialFirstMain=(s,time)=>this.reinforcementSpecial.start(s,time)
    this.barracks.onKnightTowerLoop=site=>{this.knightArmor.towerLoop(site,this.barracks.soldiers);this.knightHeal.towerLoop(site,this.barracks.soldiers);this.knightLegacy.towerLoop(site,this.barracks.soldiers)}
    this.barracks.onKnightSkillMain=(s,outer)=>{this.knightArmor.soldierMain(s,outer);this.knightHeal.powerMain(s,outer,this.time);this.knightLegacy.soldierMain(s,outer)}
    this.barracks.onKnightCastMain=(s,time)=>this.knightHeal.advance(s,time)
    this.barracks.onKnightInCooldown=(s,time)=>{this.knightHeal.tryStart(s,time)}
    this.barracks.onKnightMeleeModifier=(key,enemy,soldier,level,time)=>this.knightLegacy.stuns.queue(key,enemy,{sourceId:this.entities?.entity(soldier)?.id,targetId:this.entities?.entity(enemy)?.id,level,ts:time})
    this.knightHeal.onSound=name=>this.onSound(name)
    this.barracks.onCreate=s=>this.entities?.queue(s.name,s,s.hero?'hero':'soldier')
    this.towers.onCompletionQueued=(site,name,time)=>this.entities?.scheduleTower(site,name,Math.round(time*30),true)
    this.combat.dodges=this.barracks.dodges
    this.powers=new PowerSystem(level,templates as unknown as ConstructorParameters<typeof PowerSystem>[1],this.barracks,random,reward,this.towers.sites)
    this.powers.royal.runtime.onQueue=(name,model)=>this.entities?.queue(name,model,'royal')
    this.powers.royal.runtime.onRemove=model=>this.entities?.remove(model)
    this.powers.royal.runtime.siteId=site=>this.entities?.entity(site)?.id
    this.powers.royal.runtime.hasTower=site=>{if(!this.entities)return !!site.tower;const id=this.entities.entity(site)?.id,entity=id===undefined?undefined:this.entities.registry.entities.get(id);return !!entity&&/^tower_(archers|wizard|knights|catapult|culverine)_lvl/.test(entity.template)}
    this.powers.onQueueRainControl=c=>this.entities?.queue('power_rain_of_fire_control',c,'rainControl')
    this.powers.rainControl.onRemove=c=>this.entities?.remove(c)
    this.powers.onQueueMeteor=shot=>this.entities?.queue('bullet_power_rain_of_fire',shot,'meteor')
    this.powers.onInsertMeteor=(shot,m)=>this.entities?.rebind(shot,m,'meteor')
    this.powers.onRemoveMeteor=m=>this.entities?.remove(m)
    const rainParticles=new Map<number,object>()
    this.powers.onMeteorParticle=m=>{const model={system:this.powers.rainTrails,sourceId:m.id};rainParticles.set(m.id,model);this.entities?.queue('ps_power_rain_of_fire',model,'particle')}
    this.powers.rainTrails.onRemove=t=>{const model=rainParticles.get(t.sourceId);if(model){this.entities?.remove(model);rainParticles.delete(t.sourceId)}}
    this.powers.onMeteorShadow=shadow=>this.entities?.queue('decal_rain_of_fire_shadow',shadow)
    this.powers.onRemoveShadow=shadow=>this.entities?.remove(shadow)
    this.powers.onDamageCreate=()=>this.entities?.allocate('damage')
    this.powers.onEffectCreate=(name,pos,time)=>{if(!this.staticEffects.queue(name,pos,time)){const model={name,pos:{...pos},at:time};this.nativeEffects.push(model);this.entities?.queue(name,model)}}
    this.powers.onQueueReinforcement=c=>this.entities?.queue('power_reinforcements_control',c,'reinforcementControl')
    this.powers.royal.configure((powerUpgrades.royal_edict??[]).map(id=>`power_royal_edict_${id}`))
    this.powers.rainAreas.targetValid=this.combat.targetValid
    this.powers.royal.onRespawn=site=>this.barracks.respawnDead(site,!!this.entities)
    this.powers.royal.onGold=(amount,pos)=>{this.gold+=amount;this.onSound('GUICoins');this.waves.signal('got-gold');this.onCommand({name:'signal',signal_name:'got-gold',value:[pos,amount]})}
    this.powers.royal.onResetSkills=site=>{this.combat.wizardTowers.resetSkillCooldowns(site,this.time);this.archerRange.resetSkillCooldowns(site,this.time);this.combat.archerMarkCaster?.resetSkillCooldowns(site,this.time);this.combat.archerPierceCaster?.resetSkillCooldowns(site,this.time);this.combat.catapultTowers.resetSkillCooldowns(site,this.time);this.combat.culverineTowers.resetSkillCooldowns(site,this.time)}
    this.powers.canUse=kind=>this.waves.wave>0&&(!this.tutorial||this.tutorial.unlockedPowers.has(kind))
    this.enemySkills=new EnemySkills(level,templates as unknown as ConstructorParameters<typeof EnemySkills>[1],random);this.enemySkills.onSound=name=>this.onSound(name)
    this.enemySkills.onHealthBarAlpha=(source,alpha)=>this.healthBars.setAlpha(source,alpha)
    this.enemyRanged=new EnemyRangedCombat(level,templates as unknown as ConstructorParameters<typeof EnemyRangedCombat>[1],random);this.enemyRanged.onSound=name=>this.onSound(name);this.enemyRanged.onKill=reward
    this.enemyRanged.dodges=this.barracks.dodges
    this.enemyTeleports=new EnemyTeleport(templates.mod_gerald_skill_c_teleport as unknown as ConstructorParameters<typeof EnemyTeleport>[0])
    this.heroes=new HeroSystem(templates as unknown as ConstructorParameters<typeof HeroSystem>[0],this.barracks,random,reward)
    this.heroes.ranged.enemyCandidates=this.combat.enemyCandidates
    this.heroes.ranged.predictTarget=this.combat.predictTarget
    this.heroes.ranged.onQueueProjectile=p=>{this.entities?.queue(p.name,p,'heroProjectile')}
    this.heroes.ranged.onRemoveProjectile=p=>this.entities?.remove(p)
    const heroParticleModels=new Map<number,object>()
    this.heroes.ranged.onParticleCreate=(name,_time,p)=>{const model={system:this.heroes.ranged.trails,sourceId:p.id};heroParticleModels.set(p.id,model);this.entities?.queue(name,model,'particle')}
    this.heroes.ranged.trails.onRemove=trail=>{const model=heroParticleModels.get(trail.sourceId);if(model){this.entities?.remove(model);heroParticleModels.delete(trail.sourceId)}}
    this.heroes.ranged.onDamageCreate=()=>this.entities?.allocate('damage').id
    this.heroes.ranged.onEffectCreate=name=>{this.entities?.queue(name)}
    this.heroes.geraldUltimate.targetValid=this.combat.targetValid
    this.heroes.zefiraSkills.targetValid=this.combat.targetValid
    this.heroes.zefiraUltimate.level=level
    this.heroes.survivor.onTeleport=(enemy,time)=>{this.enemyTeleports.apply(enemy,time)}
    this.heroes.onSound=name=>this.onSound(name)
    this.heroes.onCinematic=active=>{this.cinematic=active}
    this.barracks.onReinforcementSpawn=()=>this.powers.onSignal('spawned-reinforcement')
    this.powers.onSound=name=>this.onSound(name)
    this.powers.onSignal=name=>{this.waves.signal(name);this.onCommand({name:'signal',signal_name:name})}
    this.barracks.onRemove=s=>this.entities?.remove(s)
    this.barracks.onSound=name=>this.onSound(name)
    this.barracks.onStopSound=name=>this.onStopSound(name)
    this.combat.onSound=(name,options)=>this.onSound(name,options)
    this.waves = new WaveRunner(program, ({command,time}) => {
      if (command.name === 'gold') this.gold = Number(command.value)
      if (command.name === 'lives') this.lives = Number(command.value)
      if (command.name === 'spawn') for (const spawn of command.spawns ?? []) this.spawn(spawn,time)
      if(command.name==='wave'){this.waveGems.start(this.waves.wave);this.onSound('GUINextWaveIncoming')}
      if(command.name==='signal')this.tutorial?.handle(command.signal_name!,command.signal_params,time)
      this.onCommand(command)
    },true)
  }
  rallyRange(id:string) {
    const site=this.towers.sites.find(s=>s.id===id),template=site?.tower?this.templates[site.tower] as unknown as BarrackTemplate&TowerTemplate:undefined
    if(!site || !template?.barrack || site.canBeModified===false || site.building)return
    const offset=template.tower.range_offset??{x:0,y:0}
    return {pos:{x:site.pos.x+offset.x,y:site.pos.y+offset.y},radius:template.barrack.rally_range*(site.rangeFactor??1),terrains:template.barrack.rally_terrains,anywhere:template.barrack.rally_anywhere}
  }
  setRally(id:string,pos:Point):boolean {
    const range=this.rallyRange(id),site=this.towers.sites.find(s=>s.id===id)
    if(!range || !site || this.paused || this.cinematic || this.outcome || this.tutorial?.inputLocked)return false
    if((pos.x-range.pos.x)**2+((pos.y-range.pos.y)/.7)**2>range.radius**2)return false
    if(!range.anywhere && !new RoadPlacement(this.level).valid(pos,range.terrains))return false
    this.barracks.setRally(site,pos,this.time);this.combat.onEffect('decal_rally_feedback',pos,this.time)
    const sound=this.templates[site.tower!].sound_events?.change_rally_point;if(sound&&!this.barracks.deferKnightTowers)this.onSound(sound)
    return true
  }
  build(id:string,kind:TowerKind) {
    if(this.outcome)throw new Error('战斗已经结束')
    if(this.paused || this.cinematic)throw new Error('当前无法建造')
    const site=this.towers.sites.find(s=>s.id===id)
    if(this.tutorial && (!site || !this.tutorial.canBuild(site,kind)))throw new Error('请按引导在指定位置建造弓箭塔')
    this.gold=this.towers.build(id,kind,this.gold,this.time);if(!this.entities)this.onSound('GUITowerBuilding')
    this.entities?.scheduleTower(site!,`tower_build_${kind}`,this.tick+1)
  }
  upgradeTower(id:string) {
    if(this.outcome || this.paused || this.cinematic)throw new Error('当前无法升级')
    const site=this.towers.sites.find(s=>s.id===id)
    if(this.tutorial && (!site || !this.tutorial.canSelect(site)))throw new Error('请先完成教学')
    this.gold=this.towers.upgrade(id,this.gold)
    const effect=()=>{const pos={x:site!.pos.x,y:site!.pos.y+10};if(this.entities){const model={name:'fx_tower_buy_dust',pos,at:this.time};this.nativeEffects.push(model);this.entities.queue(model.name,model)}this.combat.onEffect('fx_tower_buy_dust',pos,this.time);if(!this.entities){const sound=this.templates[site!.tower!].sound_events?.insert;if(sound)this.onSound(sound)}}
    if(this.entities)this.entities.scheduleTower(site!,site!.tower!,this.tick+1,true,()=>this.barracks.upgradeNativeSite(site!,this.time),effect)
    else{this.barracks.upgradeSite(site!);effect()}
    this.combat.removeTowerState(id)
    this.onCommand({name:'signal',signal_name:'tower-upgraded',signal_params:[id]})
  }
  upgradeTowerPower(id:string,power:string){
    if(this.outcome||this.paused||this.cinematic)throw new Error('当前无法升级')
    const site=this.towers.sites.find(s=>s.id===id)
    if(this.tutorial&&(!site||!this.tutorial.canSelect(site)))throw new Error('请先完成教学')
    this.gold=this.towers.upgradePower(id,power,this.gold)
    this.onCommand({name:'signal',signal_name:'tower-power-upgraded',signal_params:[id,power,String(site!.powerLevels![power])]})
  }
  sellTower(id:string) {
    if(this.outcome || this.paused || this.cinematic)throw new Error('当前无法出售')
    const site=this.towers.sites.find(s=>s.id===id)
    if(this.tutorial && (!site || !this.tutorial.canSelect(site)))throw new Error('请先完成教学')
    if(!site?.tower||site.building||site.canBeModified===false||site.selling)throw new Error('此防御塔无法出售')
    const sound=this.templates[site.tower].sound_events?.sell
    const sell=()=>{
      if(this.entities)for(const binding of this.entities.towerModifiersFor(site))this.entities.remove(binding.model)
      else this.powers.royal.remove(id)
      this.gold=this.towers.sell(id,this.gold,this.waves.wave);site.selling=false
      const indicator=this.buyAvailable.indicators.get(id)
      if(indicator){this.entities?.remove(indicator);this.buyAvailable.indicators.delete(id)}
      // Native tower removal owns the old roster, even after sale clears the site.
      const sourceId=this.entities?.entity(site)?.id
      if(sourceId!==undefined&&this.entities?.entity(site)?.template.startsWith('tower_knights_'))this.soldKnightRosters.set(sourceId,this.barracks.soldiers.filter(s=>s.siteId===id).sort((a,b)=>a.slot-b.slot))
      this.combat.shooters.delete(id);this.barracks.removeSite(id)
    }
    const dust=()=>{
      const model={name:'fx_tower_sell_dust',pos:{x:site.pos.x,y:site.pos.y+35},at:this.time}
      if(this.entities){this.nativeEffects.push(model);this.entities.queue(model.name,model)}
      this.combat.onEffect(model.name,model.pos,this.time)
      if(sound)this.onSound(sound)
      this.onCommand({name:'signal',signal_name:'tower-removed',signal_params:[id]})
    }
    if(this.entities){site.selling=true;this.entities.scheduleTower(site,site.holder,this.tick+1,true,undefined,dust,sell)}
    else{sell();dust()}
  }
  get levelData():LevelData{return this.level}
  initializeEntities(stage:number,campaignComplete:boolean,restarted=false,skipCutscenes=false){
    if(this.entities)throw new Error('Session entity registry is already initialized')
    const team=this.heroes.team.length?this.heroes.team.map(h=>h.name):stage===1?['hero_gerald']:['hero_gerald','hero_zefira']
    this.entities=new RuntimeEntities(this.level,stage,this.mode,team,campaignComplete,this.towers.sites,restarted,skipCutscenes)
    this.entities.onTowerInsert=name=>{const sound=this.templates[name].sound_events?.insert;if(sound)this.onSound(sound)}
    this.heroes.ranged.onQueueHit=hit=>{
      hit.shared=true
      this.combat.queueSharedDamage(hit.p.target,{value:hit.value,damage_type:(this.templates[hit.p.name] as unknown as CombatTemplate).bullet!.damage_type},hit.popOrder,(applied,result)=>{hit.applied=applied;hit.result=result;if(hit.p.source&&applied>0&&hit.p.xpFactor)hit.p.source.xpQueued+=applied*hit.p.xpFactor})
    }
    this.barracks.nativeSpecialAuras=true
    this.reinforcementSpecial.id=m=>this.entities!.entity(m)?.id
    this.reinforcementSpecial.present=id=>id!==undefined&&!!this.entities!.registry.entities.get(id)
    this.reinforcementSpecial.units=()=>[...this.entities!.bindingsInOrder()].filter(b=>b.kind==='soldier'||b.kind==='hero').map(b=>b.model as SoldierInstance)
    this.reinforcementSpecial.candidates=(id,key)=>[...this.entities!.modifiersForEntityId(id)].filter(b=>b.kind==='reinforcementSpecial'&&(b.model as ReinforcementSpecialModel).key===key).map(b=>b.model as ReinforcementSpecialModel)
    this.reinforcementSpecial.onQueue=m=>this.entities!.queue(m.key,m,'reinforcementSpecial')
    this.reinforcementSpecial.onRemove=m=>this.entities!.remove(m)
    this.knightLegacy.id=s=>this.entities!.entity(s)?.id
    this.knightLegacy.present=id=>id!==undefined&&!!this.entities!.registry.entities.get(id)
    this.knightLegacy.soldiers=()=>this.barracks.soldiers.filter(s=>this.knightLegacy.present(this.entities!.entity(s)?.id))
    this.knightLegacy.onQueue=m=>this.entities!.queue('aura_knights_skill_c_check',m,'knightLegacyAura')
    this.knightLegacy.onRemove=m=>this.entities!.remove(m)
    this.knightLegacy.stuns.present=e=>this.knightLegacy.present(this.entities!.entity(e)?.id)
    this.knightLegacy.stuns.onQueue=m=>this.entities!.queue(m.key,m,'knightLegacyStun')
    this.knightLegacy.stuns.onRemove=m=>this.entities!.remove(m)
    this.knightArmor.id=s=>this.entities!.entity(s)?.id
    this.knightArmor.present=id=>id!==undefined&&!!this.entities!.registry.entities.get(id)
    this.knightArmor.heroes=()=>this.heroes.team.filter(h=>{const id=this.entities!.entity(h)?.id;return id!==undefined&&!!this.entities!.registry.entities.get(id)})
    this.knightArmor.onQueue=m=>this.entities!.queue('aura_knights_skill_a_check',m,'knightArmor')
    this.knightArmor.onRemove=m=>this.entities!.remove(m)
    this.combat.firebook.native=true
    const firebook=this.combat.firebook.runtime
    firebook.present=e=>{const entity=this.entities!.entity(e);return !!entity&&!!this.entities!.registry.entities.get(entity.id)}
    firebook.candidates=e=>[...this.entities!.modifiersFor(e)].filter(b=>b.kind==='firebookBurn').map(b=>b.model as import('./FirebookBurnRuntime').NativeFirebookBurn)
    firebook.onQueue=m=>this.entities!.queue('mod_firebook_aura',m,'firebookBurn')
    firebook.onRemove=m=>this.entities!.remove(m)
    this.wizardEmpower.native=true
    const empower=this.wizardEmpower.runtime
    empower.id=site=>this.entities!.entity(site)?.id
    empower.present=id=>id!==undefined&&!!this.entities!.registry.entities.get(id)
    empower.candidates=(id,kind)=>[...this.entities!.modifiersForEntityId(id)].filter(b=>b.kind==='wizardEmpower'&&(b.model as import('./WizardEmpowerRuntime').NativeEmpowerModel).kind===kind).map(b=>b.model as import('./WizardEmpowerRuntime').NativeEmpowerModel)
    empower.onQueue=(name,m)=>this.entities!.queue(name,m,'wizardEmpower')
    empower.onRemove=m=>this.entities!.remove(m)
    this.wizardEmpower.sitesInOrder=()=>[...this.entities!.persistent.get('towers').values()].filter(e=>!e.pending_removal).flatMap(e=>{const site=this.towers.sites.find(s=>this.entities!.entity(s)===e);return site?[site]:[]})
    this.archerRange.native=true
    const range=this.archerRange.runtime
    range.id=site=>this.entities!.entity(site)?.id
    range.present=id=>id!==undefined&&!!this.entities!.registry.entities.get(id)
    range.candidates=target=>[...this.entities!.modifiersFor(target)].filter(b=>b.kind==='archerRange'&&(b.model as NativeRangeBuff).targetId===range.id(target)).map(b=>b.model as NativeRangeBuff)
    range.candidatesForSource=id=>{const models=new Map([...this.entities!.bindingsInOrder('archerRange')].filter(b=>(b.model as NativeRangeModel).kind==='buff').map(b=>[this.entities!.entity(b.model)!.id,b.model as NativeRangeBuff]));return [...this.entities!.persistent.get('modifiers').values()].flatMap(e=>{const m=models.get(e.id);return m&&m.sourceId===id?[m]:[]})}
    range.onQueue=(name,m)=>this.entities!.queue(name,m,'archerRange')
    range.onRemove=m=>this.entities!.remove(m)
    this.archerPierceStun.present=firebook.present
    this.archerPierceStun.onQueue=m=>this.entities!.queue(m.key,m,'archerPierceStun')
    this.archerPierceStun.onRemove=m=>this.entities!.remove(m)
    this.combat.archerPierceRays.onQueue=m=>this.entities!.queue(m.name,m,'archerPierceRay')
    this.combat.archerPierceRays.onRemove=m=>this.entities!.remove(m)
    this.archerMark.present=firebook.present
    this.archerMark.candidates=e=>[...this.entities!.modifiersFor(e)].filter(b=>b.kind==='archerMark').map(b=>b.model as ArcherMark)
    this.archerMark.onQueue=m=>this.entities!.queue('mod_archers_skill_c_weak',m,'archerMark')
    this.archerMark.onRemove=m=>this.entities!.remove(m)
    this.combat.deferProjectileInsertSound=true
    this.combat.deferEffectInsertSound=true
    this.heroes.ranged.deferProjectileInsertSound=true
    this.barracks.onRemoveModifiers=s=>{for(const b of this.entities!.bindingsInOrder()){const m=b.model as {target?:SoldierInstance};if(m.target===s&&this.entities!.entity(b.model)?.modifier)this.entities!.remove(b.model)}}
    this.heroes.nativeLifeEnabled=true
    this.heroes.survivor.native=true
    for(const h of this.heroes.team)h.nativeHeroLife=true
    this.enemyTeleports.defer=true
    const teleport=this.enemyTeleports.runtime
    teleport.present=e=>{const entity=this.entities!.entity(e);return !!entity&&!!this.entities!.registry.entities.get(entity.id)}
    this.heroes.survivor.targetPresent=teleport.present
    this.heroes.survivor.onTeleport=(enemy,time)=>{teleport.queue(enemy,time,this.heroes.gerald)}
    teleport.onQueue=m=>this.entities!.queue('mod_gerald_skill_c_teleport',m,'enemyTeleport')
    teleport.onRemove=m=>this.entities!.remove(m)
    teleport.onUnblock=e=>{for(const s of [...this.barracks.blockers(e)])this.barracks.releaseKnight(s)}
    const survivorEffect=(name:string,pos:Point,time:number,notify:(name:string,pos:Point,time:number)=>void)=>{const m={name,pos,at:time};this.nativeEffects.push(m);this.entities!.queue(name,m);notify(name,pos,time)}
    teleport.onEffect=(name,pos,time)=>survivorEffect(name,pos,time,this.enemyTeleports.onEffect)
    this.heroes.survivor.onNativeEffect=(name,pos,time)=>survivorEffect(name,pos,time,this.heroes.survivor.onEffect)
    this.heroes.life.onRelease=h=>{this.barracks.finishHeroRally(h);this.barracks.releaseKnight(h)}
    this.heroes.life.onSound=name=>this.onSound(name)
    this.heroes.life.onQueue=m=>this.entities!.queue(m.name,m,'heroLife')
    this.heroes.life.onRemove=m=>this.entities!.remove(m)
    this.barracks.dodges.deferDamagePops=true
    this.heroes.nativeGeraldRally=true
    const zefira=this.heroes.zefiraSkills;zefira.deferShield=true
    this.barracks.onReflect=(enemy,value)=>this.combat.queueNativeDamage(enemy,{value,damage_type:64})
    const enemyRanged=this.enemyRanged.runtime;this.enemyRanged.defer=true
    enemyRanged.candidates=(enemy,radius)=>{const found:SoldierInstance[]=[];this.soldierSpatial.filter(found,'targets',enemy.path.position.x,enemy.path.position.y,radius);return found}
    enemyRanged.present=target=>{const e=this.entities!.entity(target);return !!e&&!!this.entities!.registry.entities.get(e.id)}
    enemyRanged.nodeValid=this.combat.targetValid
    enemyRanged.blocked=e=>this.barracks.blockers(e).length>0
    enemyRanged.canEnter=e=>{const s=this.barracks.enemyMelee.states.get(e);return !s||s.phase==='walk'||s.phase==='exit'}
    enemyRanged.cellAt=this.combat.cellAt
    enemyRanged.onSprite=(e,sprite)=>{e.visualOverride=sprite;const state=this.barracks.enemyMelee.states.get(e);if(state)state.sprite={...sprite}}
    enemyRanged.onQueueArrow=p=>this.entities!.queue(p.name,p,'enemyArrow')
    enemyRanged.onRemoveArrow=p=>this.entities!.remove(p)
    enemyRanged.onQueueEffect=m=>{this.nativeEffects.push(m);this.entities!.queue(m.name,m,'enemyArrowEffect')}
    enemyRanged.onRemoveEffect=m=>this.entities!.remove(m)
    enemyRanged.onEffect=m=>{if(m.kind==='miss')this.enemyRanged.onMiss(m.pos,m.rotation,m.at,m.pos,m);else this.enemyRanged.onEffect(m.name,m.pos,m.at,{rotation:m.rotation,bloodColor:m.bloodColor})}
    enemyRanged.onCreateDamage=()=>this.entities!.allocate('damage').id
    enemyRanged.onDamage=(p,value,popOrder)=>{const b=this.templates[p.name] as unknown as {bullet:import('./BarracksCombat').MeleeAttack};this.barracks.queueEnemyArrowDamage(p.target,value,b.bullet,popOrder)}
    const gerald=this.heroes.geraldSkills;gerald.deferModifiers=true
    gerald.candidates=hero=>{const found:SoldierInstance[]=[];this.soldierSpatial.filter(found,'targets',hero.pos.x,hero.pos.y,60);return found}
    gerald.nativeModifiers.onQueue=(name,model)=>this.entities!.queue(name,model,'geraldModifier')
    gerald.nativeModifiers.onRemove=model=>this.entities!.remove(model)
    gerald.nativeModifiers.present=target=>{const entity=this.entities!.entity(target);return !!entity&&!!this.entities!.registry.entities.get(entity.id)}
    gerald.nativeModifiers.onEffect=(name,pos,time)=>{const model={name,pos,at:time};this.nativeEffects.push(model);this.entities!.queue(name,model);gerald.onEffect(name,pos,time)}
    zefira.deferHammer=true
    zefira.nativeHammer.onQueue=(name,model)=>this.entities!.queue(name,model,'zefiraHammer')
    zefira.nativeHammer.onRemove=model=>this.entities!.remove(model)
    zefira.nativeHammer.present=e=>{const entity=this.entities!.entity(e);return !!entity&&!!this.entities!.registry.entities.get(entity.id)}
    zefira.nativeHammer.selectionTargets=hero=>this.combat.enemyCandidates(this.enemies,hero.pos,50).filter(e=>e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.bans&2)&&!(e.template.vis.flags&128)&&this.combat.targetValid(e)&&(e.path.position.x-hero.pos.x)**2+(e.path.position.y-hero.pos.y)**2/(.7*.7)<=50**2)
    zefira.nativeHammer.hitTargets=pos=>[...this.entities!.bindingsInOrder('enemy')].map(b=>b.model as EnemyInstance).filter(e=>e.hp>0&&!(e.template.vis.bans&8)&&!(e.template.vis.flags&128)&&(e.path.position.x-pos.x)**2+(e.path.position.y-pos.y)**2/(.7*.7)<=50**2)
    zefira.nativeHammer.onCreateDamage=()=>this.entities!.allocate('damage')
    zefira.nativeHammer.onDamage=(enemy,value)=>this.combat.queueNativeDamage(enemy,{value,damage_type:4},true)
    zefira.nativeHammer.onEffect=(name,pos,time)=>{this.barracks.onEffectCreate(name,pos,time);zefira.onEffect(name,pos,time)}
    zefira.nativeHammer.onStopSound=name=>this.onStopSound(name)
    zefira.nativeShield.onQueue=(name,model)=>this.entities!.queue(name,model,'zefiraShield')
    zefira.nativeShield.onRemove=model=>this.entities!.remove(model)
    zefira.nativeShield.present=e=>this.combat.projectileTargetPresent(e,this.enemies)
    zefira.nativeShield.blockedTargetPresent=h=>!!h.target&&this.combat.projectileTargetPresent(h.target,this.enemies)
    zefira.nativeShield.findEnemies=(pos,range)=>this.combat.enemyCandidates(this.enemies,pos,range).filter(e=>e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.bans&8)&&this.combat.targetValid(e)&&(e.path.position.x-pos.x)**2+(e.path.position.y-pos.y)**2/(.7*.7)<=range*range)
    zefira.nativeShield.onDamage=(enemy,value)=>this.combat.queueNativeDamage(enemy,{value,damage_type:4})
    zefira.nativeShield.onEffect=(name,pos,time)=>{this.barracks.onEffectCreate(name,pos,time);this.combat.onEffect(name,pos,time)}
    this.enemySkills.canStartShadow=e=>{const state=this.barracks.enemyMelee.states.get(e);return !state||state.phase==='walk'||state.phase==='exit'}
    this.barracks.enemyMelee.beforeAbility=e=>this.enemySkills.wantsShadow(e)
    this.enemySkills.defer=true
    this.enemySkills.runtime.onQueue=(name,model)=>this.entities!.queue(name,model,'smoke')
    this.enemySkills.runtime.onRemove=model=>this.entities!.remove(model)
    this.enemySkills.runtime.present=enemy=>{const e=this.entities!.entity(enemy);return !!e&&!!this.entities!.registry.entities.get(e.id)}
    this.enemySkills.runtime.targets=()=>[...this.entities!.bindingsInOrder('enemy')].map(b=>b.model as EnemyInstance)
    this.enemySkills.onDeparture=enemy=>this.entities!.remove(enemy)
    this.powers.royal.defer=true
    this.powers.royal.runtime.findSites=global=>[...(global?this.entities!.registry.entities:this.entities!.persistent.get('towers')).values()].filter(e=>!e.pending_removal).flatMap(e=>this.towers.sites.filter(s=>this.entities!.entity(s)?.id===e.id&&s.tower&&!s.building&&s.canBeMod!==false&&!s.towerBlocked&&(this.templates[s.tower] as unknown as {tower:{can_be_mod:boolean}}).tower.can_be_mod))
    this.powers.royal.runtime.present=enemy=>{const e=this.entities!.entity(enemy);return !!e&&!!this.entities!.registry.entities.get(e.id)}
    this.powers.royal.runtime.findEnemies=(pos,range,global)=>{
      const byId=new Map(this.enemies.map(e=>[this.entities!.entity(e)?.id,e]))
      const candidates=global?[...this.entities!.persistent.get('alive_enemies').values()].flatMap(e=>{const model=byId.get(e.id);return model?[model]:[]}):this.combat.enemyCandidates(this.enemies,pos,range)
      return candidates.filter(e=>e.hp>0&&e.escapedAt===undefined&&(global||(e.path.position.x-pos.x)**2+(e.path.position.y-pos.y)**2/(.7*.7)<=range*range))
    }
    this.combat.culverineTowers.native=true
    this.throttle.onQueue=m=>this.entities!.queue(m.name,m,'culverineThrottle');this.throttle.onRemove=m=>this.entities!.remove(m)
    this.combat.culverineTowers.onThrottleBuff=(name,pos,time)=>this.throttle.queue(name,pos,time);this.combat.culverineTowers.onThrottleRemove=m=>this.entities!.remove(m)
    const culverine=this.combat.nativeCulverine
    culverine.id=m=>this.entities!.entity(m)?.id
    culverine.present=m=>{const e=this.entities!.entity(m);return !!e&&!!this.entities!.registry.entities.get(e.id)}
    culverine.onQueue=m=>this.entities!.queue(m.name,m,'culverineNative')
    culverine.onRemove=m=>this.entities!.remove(m)
    this.combat.onSulfurDecal=(name,pos,time)=>this.sulfur.queueDecal(name,pos,time)
    this.combat.onSulfurLanded=(name,pos,level)=>this.sulfur.queueArea(name,pos,level)
    this.sulfur.id=culverine.id;this.sulfur.present=firebook.present
    this.sulfur.enemies=()=>[...this.entities!.bindingsInOrder('enemy')].map(b=>b.model as EnemyInstance)
    this.sulfur.candidates=e=>[...this.entities!.modifiersFor(e)].filter(b=>b.kind==='culverineSulfur').map(b=>b.model as import('./CulverineSulfurRuntime').SulfurModifier).filter(m=>m.kind==='modifier')
    this.sulfur.onQueue=m=>this.entities!.queue(m.name,m,'culverineSulfur');this.sulfur.onRemove=m=>this.entities!.remove(m)
    const bolin=this.heroes.bolinRuntime
    bolin.id=culverine.id;bolin.present=culverine.present;this.heroes.bolin.present=firebook.present
    this.heroes.bolin.find=(hero,a)=>luaSort(this.combat.enemyCandidates(this.enemies,hero.pos,a.max_range).filter(e=>!enemyIsDead(e)&&!(e.template.vis.flags&a.vis_bans)&&!(e.template.vis.bans&a.vis_flags)).map(enemy=>({enemy,pred:this.combat.predictTarget(enemy,0)})).filter(({pred})=>pred.valid&&(pred.pos.x-hero.pos.x)**2+(pred.pos.y-hero.pos.y)**2/(.7*.7)<=a.max_range*a.max_range),(x,y)=>x.enemy.path.remainingNodes<y.enemy.path.remainingNodes).map(t=>({enemy:t.enemy,point:t.pred.pos}))[0]
    const mortar=this.heroes.bolinMortar,mc=this.heroes.bolin.mortar;mc.level=this.level;mc.predict=(e,t)=>this.combat.predictTarget(e,t).pos
    mc.landingValid=(pi,ni,p)=>{const cell=new RoadPlacement(this.level).cell(p);return this.level.paths.active[pi-1]&&this.level.navigation?.targetNodes?.[pi-1]?.[ni-1]===true&&!!(cell&bolinMortarData.landOrIce)&&!(cell&bolinMortarData.noWalk)}
    mc.select=(h,a,t)=>luaSort(this.combat.enemyCandidates(this.enemies,h.pos,a.max_range+t*150).filter(e=>{const p=this.combat.predictTarget(e,t);const d=(p.pos.x-h.pos.x)**2+(p.pos.y-h.pos.y)**2/(.7*.7);const speed=e.motionSpeed?Math.hypot(e.motionSpeed.x,e.motionSpeed.y):e.blocked||e.meleeHolding||e.frozen||e.rangedHolding||e.skillLocked?0:Math.hypot(e.path.direction.x,e.path.direction.y)*e.template.motion.max_speed;const valid=e.path instanceof EnemyPath?this.level.navigation?.noBackwardsNodes?.[e.path.pi-1]?.[e.path.nativePrediction(t,speed).ni-1]!==false:p.valid;return !enemyIsDead(e)&&!(e.template.vis.flags&a.vis_bans)&&!(e.template.vis.bans&a.vis_flags)&&valid&&d>a.min_range*a.min_range&&d<=a.max_range*a.max_range}),(x,y)=>x.path.remainingNodes<y.path.remainingNodes)
    mortar.id=culverine.id;mortar.present=culverine.present;mortar.enemies=this.sulfur.enemies
    mortar.onQueue=m=>this.entities!.queue(m.name,m,'bolinMortar');mortar.onRemove=m=>this.entities!.remove(m);mortar.onSound=(n,o)=>this.onSound(n,o)
    mortar.onCreateDamage=()=>this.entities!.allocate('damage').id;mortar.onDamage=(enemy,value,type,order)=>this.combat.queueSharedDamage(enemy,{value,damage_type:type},order,()=>{})
    mortar.onParticle=(name,m)=>this.entities!.queue(name,{system:mortar.trails,sourceId:m.id},'particle');mortar.trails.onRemove=t=>this.entities!.remove(t)
    mortar.slows=e=>[...this.entities!.modifiersFor(e)].filter(b=>b.kind==='bolinMortar').map(b=>b.model as import('./BolinMortarRuntime').MortarSlow)
    const mines=this.heroes.bolinMines,bm=this.heroes.bolin.mines;bm.level=this.level;bm.wave=()=>this.waves.wave
    bm.nearbyEnemy=(h,a)=>!!this.heroes.bolin.find(h,{...a,max_range:a.max_trigger_range} as unknown as import('./HeroSystem').HeroRangedAttack)
    bm.mines=()=>[...this.entities!.bindingsInOrder('bolinMines')].map(b=>b.model as import('./BolinMinesRuntime').BolinMineModel).filter((m):m is import('./BolinMinesRuntime').BolinMine=>m.kind==='mine')
    mines.id=culverine.id;mines.onQueue=m=>this.entities!.queue(m.name,m,'bolinMines');mines.onRemove=m=>this.entities!.remove(m);mines.onSound=(n,o)=>this.onSound(n,o)
    mines.candidates=(p,r)=>this.combat.enemyCandidates(this.enemies,p,r);mines.onCreateDamage=()=>this.entities!.allocate('damage').id
    mines.onDamage=(e,value,type,armor,order)=>this.combat.queueSharedDamage(e,{value,damage_type:type,reduce_armor:armor},order,()=>{})
    mines.onCrater=p=>mortar.crater(p);mines.onExplode=h=>bm.maxNear.set(h,false)
    bolin.onQueue=m=>this.entities!.queue(m.name,m,'bolinNative');bolin.onRemove=m=>this.entities!.remove(m);bolin.onSound=name=>this.onSound(name)
    bolin.onCreateDamage=()=>this.entities!.allocate('damage').id
    bolin.candidates=(pos,radius)=>this.combat.enemyCandidates(this.enemies,pos,radius)
    bolin.onAreaDamage=(enemy,value,type,order)=>this.combat.queueSharedDamage(enemy,{value,damage_type:type},order,()=>{})
    bolin.onDamage=(b,value,type,armor,order)=>this.combat.queueSharedDamage(b.target,{value,damage_type:type,reduce_armor:armor},order,(applied)=>{if(applied>0)b.hero.xpQueued+=applied*b.xpFactor})
    bolin.onParticle=(name,m)=>this.entities!.queue(name,{system:bolin.trails,sourceId:m.id},'particle');bolin.trails.onRemove=t=>this.entities!.remove(t)
    const traps=this.combat.nativeTraps
    traps.id=culverine.id;traps.stuns.present=firebook.present
    traps.resolveSource=id=>id===undefined?undefined:this.towers.sites.find(s=>this.entities!.entity(s)?.id===id&&this.entities!.registry.entities.get(id))
    traps.onQueue=m=>this.entities!.queue('aura_catapult_skill_c_trap',m,'catapultTrap');traps.onRemove=m=>this.entities!.remove(m)
    traps.stuns.onQueue=m=>this.entities!.queue(m.key,m,'catapultTrapStun');traps.stuns.onRemove=m=>this.entities!.remove(m)
    traps.modifiers=e=>[...this.entities!.modifiersFor(e)].filter(b=>b.kind==='catapultTrapStun').map(b=>b.model as ArcherPierceStun)
    const bombs=this.combat.nativeBombs
    bombs.id=culverine.id;bombs.onQueue=m=>this.entities!.queue(m.template,m,'catapultBomb');bombs.onRemove=m=>this.entities!.remove(m)
    const tar=this.combat.nativeTar
    tar.id=culverine.id;tar.present=firebook.present
    tar.enemies=this.sulfur.enemies
    tar.candidates=e=>[...this.entities!.modifiersFor(e)].filter(b=>b.kind==='catapultTar').map(b=>b.model as import('./CatapultTarRuntime').NativeTarSlow)
    tar.onQueue=m=>this.entities!.queue(m.name,m,'catapultTar');tar.onRemove=m=>this.entities!.remove(m)
    this.powers.deferRain=this.powers.deferReinforcements=true
    this.entities.onModelInsert=(model,kind)=>{
      if(kind==='bolinMines')return mines.insert(model as import('./BolinMinesRuntime').BolinMineModel,this.time)
      if(kind==='bolinMortar'){this.entities!.setTween(model,t=>mortar.tween(model as import('./BolinMortarRuntime').MortarModel,t));return mortar.insert(model as import('./BolinMortarRuntime').MortarModel,this.time)}
      if(kind==='bolinNative'){this.entities!.setTween(model,t=>bolin.tween(model as import('./BolinNativeRuntime').BolinModel,t));return bolin.insert(model as import('./BolinNativeRuntime').BolinModel)}
      if(kind==='catapultTrap')return traps.insert(model as import('./CatapultTrapsRuntime').NativeCatapultTrap,this.time)
      if(kind==='catapultTrapStun')return traps.insertStun(model as ArcherPierceStun,this.time)
      if(kind==='catapultBomb')return bombs.insert(model as import('./CatapultBombRuntime').NativeCatapultBomb)
      if(kind==='catapultTar'){this.entities!.setTween(model,t=>tar.tween(model as import('./CatapultTarRuntime').NativeTarModel,t));return tar.insert(model as import('./CatapultTarRuntime').NativeTarModel,this.time)}
      if(kind==='scene'&&this.nativeEffects.includes(model as (typeof this.nativeEffects)[number])){const sound=this.templates[(model as (typeof this.nativeEffects)[number]).name].sound_events?.insert;if(sound)this.onSound(sound)}
      if(kind==='culverineThrottle'){this.entities!.setTween(model,t=>this.throttle.tween(model as import('./CulverineThrottleRuntime').ThrottleBuff,t));return this.throttle.insert(model as import('./CulverineThrottleRuntime').ThrottleBuff)}
      if(kind==='culverineSulfur'){this.entities!.setTween(model,t=>this.sulfur.tween(model as import('./CulverineSulfurRuntime').SulfurModel,t));return this.sulfur.insert(model as import('./CulverineSulfurRuntime').SulfurModel,this.time)}
      if(kind==='culverineNative'){this.entities!.setTween(model,t=>culverine.tween(model as import('./CulverineNativeRuntime').NativeCulverineModel,t));return culverine.insert(model as import('./CulverineNativeRuntime').NativeCulverineModel)}
      if(kind==='enemyTeleport')return teleport.insert(model as import('./EnemyTeleportRuntime').NativeTeleport,this.time)
      if(kind==='heroProjectile'){const p=model as HeroProjectile,id=this.entities!.entity(p.target)?.id;if(!this.heroes.ranged.insertProjectile(p,this.time,id!==undefined&&!!this.entities!.registry.entities.get(id)))return false;const sound=this.templates[p.name].sound_events?.insert;if(sound)this.onSound(sound);return true}
      if(kind==='enemy'){const e=model as EnemyInstance;if(e.template.ranged)for(const a of e.template.ranged.attacks)if(a.max_range_variance!==undefined)a.max_range+=Math.floor(this.random()*(a.max_range_variance+1))}
      if(kind==='soldier'){
        const soldier=model as SoldierInstance
        this.knightArmor.insertSoldier(soldier);this.barracks.initializeKnightInsert(soldier,this.time);this.knightHeal.insertSoldier(soldier);this.knightLegacy.insertSoldier(soldier);this.barracks.initializeReinforcementInsert(soldier)
        this.entities!.setTween(model,t=>{if(soldier.name==='soldier_reinforcement_base')this.barracks.advanceReinforcementTween(soldier,t);this.barracks.advanceCorpseTween(soldier,t)})
      }
      if(kind==='heroLife')this.entities!.setTween(model,t=>this.heroes.life.tween(model as import('./HeroLifeRuntime').HeroTombstone,t))
      if(kind==='firebookBurn')return firebook.insert(model as import('./FirebookBurnRuntime').NativeFirebookBurn,this.time)
      if(kind==='reinforcementSpecial'){const m=model as ReinforcementSpecialModel;if(m.kind==='armor')this.entities!.setTween(m,time=>this.reinforcementSpecial.tween(m,time));return this.reinforcementSpecial.insert(m,this.time)}
      if(kind==='knightLegacyAura')return this.knightLegacy.insert(model as KnightLegacyAura)
      if(kind==='knightLegacyStun')return this.knightLegacy.stuns.insert(model as ArcherPierceStun,this.time)
      if(kind==='knightArmor'){const m=model as KnightArmorAura;this.entities!.setTween(m,t=>this.knightArmor.tween(m,t));return this.knightArmor.insert(m)}
      if(kind==='wizardEmpower'){const m=model as import('./WizardEmpowerRuntime').NativeEmpowerModel;this.entities!.setTween(m,t=>empower.tween(m,t));return empower.insert(m,this.time)}
      if(kind==='archerRange'){const m=model as NativeRangeModel;this.entities!.setTween(m,t=>range.tween(m,t));return range.insert(m,this.time)}
      if(kind==='archerPierceRay')return this.combat.archerPierceRays.insert(model as ArcherPierceRay)
      if(kind==='archerPierceStun')return this.archerPierceStun.insert(model as ArcherPierceStun,this.time)
      if(kind==='archerMark')return this.archerMark.insert(model as ArcherMark,this.time)
      if(kind==='enemyArrow')return this.enemyRanged.runtime.insertArrow(model as import('./EnemyRangedRuntime').NativeEnemyArrow,this.time)
      if(kind==='enemyArrowEffect'){const m=model as import('./EnemyRangedRuntime').EnemyArrowEffect;this.enemyRanged.runtime.insertEffect(m);if(m.kind==='miss')this.entities!.setTween(m,t=>this.enemyRanged.runtime.tween(m,t))}
      if(kind==='zefiraHammer')return this.heroes.zefiraSkills.nativeHammer.insert(model as import('./ZefiraHammerRuntime').HammerModel,this.time)
      if(kind==='geraldModifier'){this.entities!.setTween(model,t=>this.heroes.geraldSkills.nativeModifiers.tween(model as import('./GeraldModifierRuntime').NativeGeraldModifier,t));return this.heroes.geraldSkills.nativeModifiers.insert(model as import('./GeraldModifierRuntime').NativeGeraldModifier,this.time)}
      if(kind==='zefiraShield')return this.heroes.zefiraSkills.nativeShield.insert(model as import('./ZefiraShieldRuntime').ZefiraShieldModel,this.time)
      if(kind==='smoke'){this.entities!.setTween(model,t=>this.enemySkills.runtime.tween(model as import('./SmokeRuntime').SmokeModel,t));return this.enemySkills.runtime.insert(model as import('./SmokeRuntime').SmokeModel,this.time)}
      if(kind==='royal'){this.entities!.setTween(model,t=>this.powers.royal.runtime.tween(model as import('./RoyalRuntime').RoyalModel,t));return this.powers.royal.runtime.insert(model as import('./RoyalRuntime').RoyalModel,this.time)}
      if(kind==='meteor')this.powers.insertMeteor(model,this.time)
      if(kind==='reinforcementControl')this.barracks.reinforce((model as import('./PowerSystem').ReinforcementControl).pos,this.time)
      if(kind==='particle'){
        const p=model as {system:import('./FirebookTrail').FirebookTrailSystem;sourceId:number}
        p.system.prepare(this.time)
        const trail=p.system.trails.find(t=>t.sourceId===p.sourceId)
        if(trail)this.entities!.rebind(model,trail,'particle')
      }
      if(kind==='copyAura'){this.wizardCopies.insertAura(model as WizardCopiesAura);this.entities!.setTween(model,time=>this.wizardCopies.tween(model as WizardCopiesAura,time))}
      if(kind==='projectile'){const sound=this.combat.pendingProjectileInsertSound(model,this.enemies);if(sound)this.onSound(sound);return this.combat.insertArrow(model,this.time,this.enemies)}
    }
    this.entities.onModelRemove=(model,kind,template,removedId)=>{if(kind==='bolinMines')return mines.remove(model as import('./BolinMinesRuntime').BolinMineModel);if(kind==='bolinMortar')return mortar.remove(model as import('./BolinMortarRuntime').MortarModel,this.time);if(kind==='bolinNative')return bolin.remove(model as import('./BolinNativeRuntime').BolinModel);if(kind==='catapultTrap')return traps.remove(model as import('./CatapultTrapsRuntime').NativeCatapultTrap);if(kind==='catapultTrapStun')return traps.stuns.remove(model as ArcherPierceStun);if(kind==='catapultBomb')return bombs.remove(model as import('./CatapultBombRuntime').NativeCatapultBomb);if(kind==='catapultTar')return tar.remove(model as import('./CatapultTarRuntime').NativeTarModel,this.time);if(kind==='culverineThrottle')return this.throttle.remove(model as import('./CulverineThrottleRuntime').ThrottleBuff,this.time);if(kind==='tower'&&template.startsWith('tower_culverine'))this.combat.culverineTowers.removeThrottleEffects((model as TowerSite).id);if(kind==='culverineSulfur')return this.sulfur.remove(model as import('./CulverineSulfurRuntime').SulfurModel,this.time);if(kind==='culverineNative')return culverine.remove(model as import('./CulverineNativeRuntime').NativeCulverineModel,this.time);if(kind==='reinforcementSpecial')return this.reinforcementSpecial.remove(model as ReinforcementSpecialModel,this.time);if(kind==='knightLegacyAura')return this.knightLegacy.remove(model as KnightLegacyAura);if(kind==='knightLegacyStun')return this.knightLegacy.stuns.remove(model as ArcherPierceStun);if(kind==='tower'&&removedId!==undefined){const roster=this.soldKnightRosters.get(removedId);if(roster){for(const soldier of roster)this.entities!.remove(soldier);this.soldKnightRosters.delete(removedId)}}if(kind==='knightArmor')return this.knightArmor.remove(model as KnightArmorAura);if(kind==='wizardEmpower')return empower.remove(model as import('./WizardEmpowerRuntime').NativeEmpowerModel,this.time);if(kind==='archerRange')return range.remove(model as NativeRangeModel);if(kind==='archerPierceRay')return this.combat.archerPierceRays.remove(model as ArcherPierceRay);if(kind==='archerPierceStun')return this.archerPierceStun.remove(model as ArcherPierceStun);if(kind==='archerMark')return this.archerMark.remove(model as ArcherMark);if(kind==='copyAura')this.wizardCopies.removeAura(model as WizardCopiesAura);if(kind==='firebookBurn')return firebook.remove(model as import('./FirebookBurnRuntime').NativeFirebookBurn);if(kind==='enemyTeleport')return teleport.remove(model as import('./EnemyTeleportRuntime').NativeTeleport);if(kind==='heroLife')this.heroes.life.remove(model as import('./HeroLifeRuntime').HeroTombstone);if(kind==='enemyArrow')this.enemyRanged.runtime.removeArrow(model as import('./EnemyRangedRuntime').NativeEnemyArrow);if(kind==='enemyArrowEffect')this.enemyRanged.runtime.removeEffect(model as import('./EnemyRangedRuntime').EnemyArrowEffect);if(kind==='zefiraHammer')return this.heroes.zefiraSkills.nativeHammer.remove(model as import('./ZefiraHammerRuntime').HammerModel);if(kind==='geraldModifier')return this.heroes.geraldSkills.nativeModifiers.remove(model as import('./GeraldModifierRuntime').NativeGeraldModifier);if(kind==='zefiraShield')return this.heroes.zefiraSkills.nativeShield.remove(model as import('./ZefiraShieldRuntime').ZefiraShieldModel);if(kind==='soldier'){const i=this.barracks.soldiers.indexOf(model as SoldierInstance);if(i>=0)this.barracks.soldiers.splice(i,1)}if(kind==='smoke')return this.enemySkills.runtime.remove(model as import('./SmokeRuntime').SmokeModel,this.time);if(kind==='enemy'){this.enemyRanged.runtime.removeEnemy(model as EnemyInstance);const i=this.enemies.indexOf(model as EnemyInstance);if(i>=0)this.enemies.splice(i,1)}if(kind==='royal')return this.powers.royal.runtime.remove(model as import('./RoyalRuntime').RoyalModel,this.time);if(kind==='tower'&&template.startsWith('tower_archers_')){this.combat.removeArcherControllers(model as TowerSite,template);if(template==='tower_archers_lvl4')range.removeSource(model as TowerSite,removedId)}}
    for(const h of this.heroes.team)this.entities.bindInitial(h,h.name,'hero')
    for(const e of this.enemies)this.entities.bindInitial(e,e.name,'enemy')
    this.entities.bindInitial(this.backgroundSounds,'background_sounds_kr5','scene')
    for(const m of this.creatures.models)this.entities.bindInitial(m,m.name,'ambient')
    for(const fish of this.fishing.fishes)this.entities.bindInitial(fish,fish.template,'fishing')
    if(this.fishing.fisherman)this.entities.bindInitial(this.fishing.fisherman,this.fishing.fisherman.template,'fishing')
    this.fishing.onCreate=e=>this.entities!.queue(e.template,e)
    this.fishing.onRemove=e=>this.entities!.remove(e)
    this.buyAvailable.sitesInOrder=()=>[...this.entities!.persistent.get('towers').values()].filter(e=>!e.pending_removal).flatMap(e=>{const site=this.towers.sites.find(s=>this.entities!.entity(s)===e);return site?[site]:[]})
    this.entities.onTowerReplace=(site,id)=>{if(site.tower){range.retarget(site,id);empower.retarget(site,id);}const indicator=this.buyAvailable.indicators.get(site.id);if(indicator)indicator.targetId=id}
    this.buyAvailable.targetPresent=state=>state.targetId!==undefined&&!!this.entities!.registry.entities.get(state.targetId)
    this.buyAvailable.onRemove=state=>this.entities!.remove(state)
    this.buyAvailable.onCreate=site=>{const indicator=this.buyAvailable.indicators.get(site.id)!;indicator.targetId=this.entities!.entity(site)?.id;this.entities!.queue('mod_buy_available',indicator)}
  }
  get incomingWave(){if(this.pendingWaveCall)return;const incoming=this.waves.nextWave;if(!incoming)return;return {...incoming,flyingPaths:[...new Set(incoming.spawns.filter(s=>this.templates[s.enemy].vis.flags&128).map(s=>s.pi))]}}
  startTutorial(){this.tutorial=new TutorialState(this);this.waves.startManual('tutorial')}
  callNextWave(){
    if(this.outcome || this.paused || this.cinematic || this.pendingWaveCall || this.tutorial && !this.tutorial.canCallWave() || !this.waves.nextWave)return
    const number=this.waves.nextWave.number,remaining=this.waves.nextWave.remaining
    this.pendingWaveCall=true
    if(number>1){const seconds=Math.floor(remaining+.5);this.gold+=seconds;this.powers.earlyWaveBonus(seconds,this.time);this.onCommand({name:'signal',signal_name:'early-wave-called',signal_params:[String(seconds)]})}
  }
  configureStage(stage:number,tutorialRequired=true){this.waveGems.configure(stage);this.stageFlow=new StageFlow(stage,this.mode,tutorialRequired)}
  spawnCinematicEnemy(name:string,pathIndex:number,near:Point) {
    const lane=this.level.paths.paths[pathIndex-1][0]
    let index=0,distance=Infinity
    for(const [i,node] of lane.entries()){const d=(node.x-near.x)**2+(node.y-near.y)**2;if(d<distance){distance=d;index=i}}
    const template=structuredClone(this.templates[name]);template.health.hp_max=5;template.enemy.gold=0
    for(const attack of template.melee?.attacks??[]){attack.damage_min=0;attack.damage_max=0}
    const path=this.level.navigation?new EnemyPath(this.level.paths.paths,this.level.navigation,pathIndex,1):new PathFollower(lane.slice(index))
    if(path instanceof EnemyPath){path.ni=index+1;path.position.x=lane[index].x;path.position.y=lane[index].y}
    const enemy={id:this.nextId++,name,born:this.time,age:0,path,template,hp:5,headingAngle:path instanceof EnemyPath?path.headingToNextNode(template.motion.max_speed):Math.atan2(path.direction.y,path.direction.x)};this.enemies.push(enemy);this.entities?.queue(name,enemy,'enemy')
  }
  private spawn(command: SpawnCommand, time: number) {
    const base=this.templates[command.enemy]
    if(!base)throw new Error(`Missing enemy template ${command.enemy}`)
    const template=structuredClone(base)
    if(!this.entities&&template.ranged)for(const a of template.ranged.attacks)if(a.max_range_variance!==undefined)a.max_range+=Math.floor(this.random()*(a.max_range_variance+1))
    const lanes = this.level.paths.paths[command.pi-1]
    const lane = command.spi==='*' ? Math.floor(this.random()*lanes.length) : command.spi-1
    template.enemy.gems=this.waveGems.next()
    const hp = template.health.hp_max
    const path=this.level.navigation?new EnemyPath(this.level.paths.paths,this.level.navigation,command.pi,lane+1):new PathFollower(lanes[lane])
    const enemy={id:this.nextId++,name:command.enemy,born:time,age:0,path,template,hp:Array.isArray(hp)?hp[1]:hp,headingAngle:path instanceof EnemyPath?path.headingToNextNode(template.motion.max_speed):Math.atan2(path.direction.y,path.direction.x)}
    this.entities?.queue(command.enemy,enemy,'enemy')
    // wave_spawn creates during system updates, after the insertion flush.
    // Commands primed before the first tick still enter the first wave phase.
    this.pendingEnemies.push({enemy,tick:this.tick+(this.stepping?1:2)})
  }
  advance(dt: number) {
    if (this.paused || this.outcome?.kind==='defeat') return
    if (!Number.isFinite(dt)||dt<0) throw new Error('Invalid simulation step')
    this.accumulator+=dt
    while(this.accumulator+1e-9>=1/30){this.step(1/30);this.accumulator-=1/30;if(this.paused){this.accumulator=0;break}}
  }
  private step(dt:number) {
    this.stepping=true
    // Native simulation.lua112 computes time from the integer tick, avoiding accumulated drift.
    this.time=++this.tick*dt
    this.entities?.beginTick()
    for(let i=this.nativeEffects.length-1;i>=0;i--){const model=this.nativeEffects[i];if(this.time>model.at&&!this.entities?.registry.entities.get(this.entities.entity(model)?.id??-1))this.nativeEffects.splice(i,1)}
    this.creatures.beginTick(this.time)
    this.staticEffects.beginTick(this.time)
    this.enemyDeaths.beginTick(this.time,this.enemies)
    this.heroes.ranged.beginTick(this.time)
    if(this.entities)this.powers.beginRainTick()
    for(let i=0;i<this.pendingEnemies.length;){const pending=this.pendingEnemies[i];if(pending.tick>this.tick){i++;continue}this.pendingEnemies.splice(i,1);pending.enemy.born=this.time;this.enemies.push(pending.enemy)}
    // level1 observes lives and completion from the preceding system pass.
    // Its defeat still allows the rest of this already-started tick to run.
    const aliveAtLevel=this.pendingEnemies.length>0||this.enemies.some(e=>e.hp>0&&e.escapedAt===undefined)
    this.outcome??=evaluateOutcome(this.lives,this.mode,this.levelScriptComplete,this.waves.finished,aliveAtLevel)
    const sendWave=this.pendingWaveCall;this.pendingWaveCall=false
    this.waves.advanceTick(this.time,sendWave)
    this.barracks.dodges.beginTick(this.time)
    if(this.entities){const grid=this.enemySpatial.create('targets',-512/3,0,1024+1024/3,768);for(const b of this.entities.bindingsInOrder('enemy')){const e=b.model as EnemyInstance;if(!this.entities.entity(e)?.pending_removal)this.enemySpatial.insert(grid,e.path.position.x,e.path.position.y,e)}}
    if(!this.entities){this.backgroundSounds.advance(this.time,this.waves.wave);this.creatures.advance(this.time);this.fishing.advance(this.time)}
    if(this.entities){const grid=this.soldierSpatial.create('targets',-512/3,0,1024+1024/3,768);for(const b of this.entities.mainBindings())if(b.kind==='hero'||b.kind==='soldier'){const s=b.model as SoldierInstance;if(!this.entities.entity(s)?.pending_removal)this.soldierSpatial.insert(grid,s.pos.x,s.pos.y,s)}}
    this.heroes.advance(this.time,this.waves.wave,this.enemies)
    this.enemyTeleports.advance(this.time,this.barracks.soldiers)
    for(const site of this.towers.update(this.time)) {
      this.tutorial?.onBuilt(site)
      if(!this.entities){const sound=this.templates[site.tower!].sound_events?.insert;if(sound)this.onSound(sound)}
      this.combat.onEffect('fx_tower_buy_dust',{x:site.pos.x,y:site.pos.y+10},this.time)
      this.waves.signal('tower-built')
      this.onCommand({name:'signal',signal_name:'tower-built',signal_params:[site.id]})
    }
    this.archerRange.advance(this.time,this.towers.sites)
    if(this.level.data.entities_list.some(e=>e.template==='controller_show_buy_available'))this.buyAvailable.advance(this.time,this.gold)
    this.wizardEmpower.advance(this.time,this.towers.sites,this.enemies)
    for(const removed of this.enemySkills.advance(this.time,this.enemies)){const index=this.enemies.indexOf(removed);if(index>=0)this.enemies.splice(index,1)}
    this.barracks.deferKnightTowers=this.barracks.deferReinforcements=this.barracks.deferHeroes=this.barracks.deferKnights=this.barracks.deferEnemyMain=this.barracks.deferDamage=!!this.entities
    this.barracks.advance(this.time,dt,this.towers.sites,this.enemies)
    this.enemyRanged.advance(this.time,dt,this.enemies,this.barracks.soldiers)
    this.powers.advance(this.time,dt,this.enemies)
    const moveEnemy=(enemy:EnemyInstance)=>{
      if(this.enemySkills.advanceShadow(enemy,this.time))return
      if(enemy.hp<=0){this.enemyDeaths.advanceMain(enemy,this.time,()=>this.enemyRanged.runtime.resumeDeath(enemy,this.time)&&this.barracks.enemyMelee.resumeDeath(enemy,this.time));return}
      if(enemy.escapedAt!==undefined)return
      if(this.barracks.deferEnemyMain&&!this.enemyRanged.runtime.advanceEnemy(enemy,this.time))this.barracks.advanceEnemyMain(enemy,this.time)
      const age = Math.max(0,this.time-enemy.born)
      // Native utils.walk uses tick_length directly. Subtracting elapsed ages
      // introduces cancellation at exact node thresholds and changes nav_path.ni.
      const holding=enemy.blocked||enemy.meleeHolding||enemy.frozen||enemy.rangedHolding||enemy.skillLocked||enemy.template.unit.is_stunned
      enemy.path.advance(holding?0:dt*enemy.template.motion.max_speed)
      if(!holding&&(enemy.path.direction.x!==0||enemy.path.direction.y!==0))enemy.headingAngle=Math.atan2(enemy.path.direction.y,enemy.path.direction.x)
      enemy.motionSpeed=holding?{x:0,y:0}:{x:enemy.path.direction.x*enemy.template.motion.max_speed,y:enemy.path.direction.y*enemy.template.motion.max_speed}
      if(enemy.template.render.sprites[0].angles?.walk&&!enemy.meleeHolding&&!enemy.blocked&&!enemy.rangedHolding&&!enemy.skillLocked&&!enemy.frozen&&!enemy.template.unit.is_stunned)this.barracks.enemyMelee.walk(enemy)
      enemy.animationAge=enemy.animationAge===undefined?0:enemy.animationAge+(enemy.frozen?0:dt)
      enemy.age = age
      if(enemy.path.finished)enemy.motionSpeed={x:0,y:0}
    }
    this.combat.deferArcherControllers=!!this.entities
    this.combat.catapultTowers.waveGroupNumber=this.waves.wave
    if(this.entities){
      this.combat.advance(this.time,this.towers.sites,this.enemies,(advanceSource,advanceProjectile)=>{
        for(const binding of this.entities!.mainBindings()){
          if(binding.kind==='bolinMines')this.heroes.bolinMines.advance(binding.model as import('./BolinMinesRuntime').BolinMineModel,this.time)
          else if(binding.kind==='bolinMortar')this.heroes.bolinMortar.advance(binding.model as import('./BolinMortarRuntime').MortarModel,this.time)
          else if(binding.kind==='bolinNative')this.heroes.bolinRuntime.advance(binding.model as import('./BolinNativeRuntime').BolinModel,this.time)
          else if(binding.kind==='catapultTrap')this.combat.nativeTraps.advance(binding.model as import('./CatapultTrapsRuntime').NativeCatapultTrap,this.time)
          else if(binding.kind==='catapultTrapStun')this.combat.nativeTraps.stuns.advance(binding.model as ArcherPierceStun,this.time)
          else if(binding.kind==='catapultBomb')this.combat.nativeBombs.advance(binding.model as import('./CatapultBombRuntime').NativeCatapultBomb,this.time)
          else if(binding.kind==='catapultTar')this.combat.nativeTar.advance(binding.model as import('./CatapultTarRuntime').NativeTarModel,this.time)
          else if(binding.kind==='culverineSulfur')this.sulfur.advance(binding.model as import('./CulverineSulfurRuntime').SulfurModel,this.time)
          else if(binding.kind==='culverineNative')this.combat.nativeCulverine.advance(binding.model as import('./CulverineNativeRuntime').NativeCulverineModel,this.time)
          else if(binding.kind==='copyBounce')this.wizardCopies.advanceBounce(binding.model as WizardCopiesBounce,this.time)
          else if(binding.kind==='copyAura')this.wizardCopies.advanceAura(binding.model as WizardCopiesAura,this.time)
          else if(binding.kind==='firebookBurn')this.combat.firebook.runtime.advance(binding.model as import('./FirebookBurnRuntime').NativeFirebookBurn,this.time)
          else if(binding.kind==='reinforcementSpecial')this.reinforcementSpecial.advance(binding.model as ReinforcementSpecialModel,this.time)
          else if(binding.kind==='knightLegacyAura')this.knightLegacy.advance(binding.model as KnightLegacyAura,this.time)
          else if(binding.kind==='knightLegacyStun')this.knightLegacy.stuns.advance(binding.model as ArcherPierceStun,this.time)
          else if(binding.kind==='knightArmor')this.knightArmor.advance(binding.model as KnightArmorAura,this.time)
          else if(binding.kind==='wizardEmpower')this.wizardEmpower.runtime.advance(binding.model as import('./WizardEmpowerRuntime').NativeEmpowerModel,this.time)
          else if(binding.kind==='archerRange')this.archerRange.runtime.advance(binding.model as NativeRangeModel,this.time)
          else if(binding.kind==='archerPierceRay')this.combat.archerPierceRays.advance(binding.model as ArcherPierceRay,this.time,this.enemies)
          else if(binding.kind==='archerPierceStun')this.archerPierceStun.advance(binding.model as ArcherPierceStun,this.time)
          else if(binding.kind==='archerMark')this.archerMark.advance(binding.model as ArcherMark,this.time)
          else if(binding.kind==='enemyTeleport')this.enemyTeleports.runtime.advance(binding.model as import('./EnemyTeleportRuntime').NativeTeleport,this.time)
          else if(binding.kind==='ambient')this.creatures.advanceOne(binding.model as import('./AmbientCreatures').AmbientCreature,this.time)
          else if(binding.kind==='fishing')this.fishing.advanceActor(binding.model as import('./Fishing').FishingSprite,this.time)
          else if(binding.model===this.backgroundSounds)this.backgroundSounds.advance(this.time,this.waves.wave)
          else if(binding.kind==='zefiraHammer')this.heroes.zefiraSkills.nativeHammer.advance(binding.model as import('./ZefiraHammerRuntime').HammerModel,this.time)
          else if(binding.kind==='geraldModifier')this.heroes.geraldSkills.nativeModifiers.advance(binding.model as import('./GeraldModifierRuntime').NativeGeraldModifier,this.time)
          else if(binding.kind==='zefiraShield')this.heroes.zefiraSkills.nativeShield.advance(binding.model as import('./ZefiraShieldRuntime').ZefiraShieldModel,this.time)
          else if(binding.kind==='smoke')this.enemySkills.runtime.advance(binding.model as import('./SmokeRuntime').SmokeModel,this.time)
          else if(binding.kind==='royal')this.powers.royal.runtime.advance(binding.model as import('./RoyalRuntime').RoyalModel,this.time)
          else if(binding.kind==='rainControl')this.powers.rainControl.advanceOne(binding.model as import('./RainControl').RainCast,this.time)
          else if(binding.kind==='meteor')this.powers.advanceMeteor(binding.model as import('./PowerSystem').Meteor,this.time,dt,this.enemies)
          else if(binding.kind==='archerShooter')this.combat.advanceArcherController(binding.model as import('./ArcherShooter').ArcherState,this.time,this.enemies)
          else if(binding.kind==='tower'){this.barracks.advanceKnightTowerMain(binding.model as TowerSite,this.time);advanceSource(binding.model as TowerSite)}
          else if(binding.kind==='soldier'){const s=binding.model as SoldierInstance;if(s.name.startsWith('soldier_knights_lvl'))this.barracks.advanceKnightMain(s,this.time,dt,this.towers.sites,this.enemies);else if(s.name.startsWith('soldier_reinforcement'))this.barracks.advanceReinforcementMain(s,this.time,dt,this.towers.sites,this.enemies)}
          else if(binding.kind==='hero'){
            const lifeHero=binding.model as import('./HeroSystem').HeroUnit
            if(lifeHero.name==='hero_bolin'){
              this.heroes.bolin.begin(lifeHero,this.time)
              if(lifeHero.hp<=0&&!this.heroes.bolin.isAttacking(lifeHero)){if(!this.heroes.life.states.has(lifeHero))this.heroes.bolinRuntime.death(lifeHero);if(this.heroes.life.advance(lifeHero,this.time))continue;this.heroes.advanceHeroGrowth(this.time,lifeHero)}
              if(!this.heroes.bolin.isAttacking(lifeHero)&&lifeHero.template.unit?.is_stunned){lifeHero.idleRequestedAt=this.time;this.barracks.finishHeroIdle(lifeHero,this.time,dt,false);continue}
              if(!this.heroes.bolin.isAttacking(lifeHero))this.barracks.advanceSoldierMain(lifeHero,this.time,dt,this.towers.sites,this.enemies)
              this.heroes.bolin.advance(lifeHero,this.time);this.barracks.finishHeroIdle(lifeHero,this.time,dt);continue
            }
            if(lifeHero.name==='hero_gerald')this.heroes.survivor.beginNativeMain(this.time)
            if(lifeHero.nativeHeroLife&&(lifeHero.hp<=0||lifeHero.name==='hero_gerald'&&this.heroes.survivor.active)){if(lifeHero.deathContinuation&&!(lifeHero.name==='hero_gerald'&&this.heroes.survivor.active)){lifeHero.deathContinuation=false;this.barracks.resumeHeroMeleeDeath(lifeHero,this.time);if(this.heroes.ranged.resumeDeath(lifeHero,this.time)){this.barracks.finishHeroRangedMain(lifeHero,this.time,dt);this.barracks.finishHeroIdle(lifeHero,this.time,dt)}if(lifeHero.name==='hero_zefira')this.heroes.zefiraSkills.nativeHammer.advanceCast(this.time);else this.heroes.geraldSkills.advance(this.time,lifeHero,this.barracks.soldiers,false);continue}if(lifeHero.name==='hero_gerald'&&this.heroes.survivor.advanceNative(this.time,lifeHero,this.heroes.geraldRallyPending))continue;if(this.heroes.life.advance(lifeHero,this.time))continue;this.heroes.advanceHeroGrowth(this.time,lifeHero)}
            if((binding.model as import('./HeroSystem').HeroUnit).name==='hero_gerald'&&this.heroes.prepareGeraldRally(this.time))continue
            const rallyHero=binding.model as import('./HeroSystem').HeroUnit
            if(rallyHero.name==='hero_gerald'&&rallyHero.deploying){if(this.barracks.advanceGeraldRally(rallyHero,this.time,dt))continue;this.heroes.advanceGeraldGrowth(this.time)}
            const hero=binding.model as import('./HeroSystem').HeroUnit,wasRanged=this.heroes.ranged.isAttacking(hero),wasMelee=!!hero.attack,wasMoving=hero.moving,wasHammer=hero.name==='hero_zefira'&&!!this.heroes.zefiraSkills.cast
            if(hero.name==='hero_gerald')this.heroes.geraldSkills.advance(this.time,hero,this.barracks.soldiers,!this.heroes.geraldUltimate.cast)
            if(hero.name==='hero_zefira'){this.heroes.zefiraSkills.nativeShield.heroMain(hero);this.heroes.zefiraSkills.nativeHammer.advanceCast(this.time)}
            if(!wasRanged&&!wasHammer)this.barracks.advanceSoldierMain(hero,this.time,dt,this.towers.sites,this.enemies)
            if(hero.name==='hero_gerald'&&this.heroes.finishGeraldRallyHit(this.time))continue
            if(hero.name==='hero_gerald'&&!hero.attack&&!this.heroes.geraldSkills.casting&&(hero.actionYieldUntil??0)<=this.time+1e-9)this.heroes.geraldSkills.advance(this.time,hero,this.barracks.soldiers,!this.heroes.geraldUltimate.cast,true)
            this.heroes.ranged.advanceHero(this.time,hero,this.enemies)
            if(wasRanged&&!this.heroes.ranged.isAttacking(hero))this.barracks.finishHeroRangedMain(hero,this.time,dt)
            this.barracks.finishHeroIdle(hero,this.time,dt)
          }
          else if(binding.kind==='projectile')advanceProjectile(binding.model as import('./RangedCombat').Projectile)
          else if(binding.kind==='enemyArrow')this.enemyRanged.runtime.advanceArrow(binding.model as import('./EnemyRangedRuntime').NativeEnemyArrow,this.time,dt)
          else if(binding.kind==='heroProjectile')this.heroes.ranged.advanceProjectile(binding.model as HeroProjectile,this.time,dt,this.enemies)
          else if(binding.kind==='enemy'&&this.enemies.includes(binding.model as EnemyInstance))moveEnemy(binding.model as EnemyInstance)
        }
        // Public collection fixtures can contain models without a registry binding.
        for(const enemy of this.enemies)if(!this.entities!.entity(enemy))moveEnemy(enemy)
        for(const soldier of this.barracks.soldiers)if(soldier.name.startsWith('soldier_knights_lvl')&&!this.entities!.entity(soldier))this.barracks.advanceKnightMain(soldier,this.time,dt,this.towers.sites,this.enemies)
      })
    }else{
      for(const enemy of this.enemies)moveEnemy(enemy)
      this.combat.advance(this.time,this.towers.sites,this.enemies)
    }
    if(this.entities){this.powers.resolveMeteorHits(this.time);this.barracks.resolveDamage(this.time,this.enemies,[...this.entities.mainBindings()].filter(b=>b.kind==='soldier'||b.kind==='hero').map(b=>b.model as SoldierInstance));this.heroes.ranged.resolveHits(this.time);this.barracks.dodges.flushDamagePops();}else this.heroes.advanceCombat(this.time,dt,this.enemies)
    // goal_line17 follows every main/health/pop update; table order matters when
    // an earlier table slot escapes on the same tick that later enemies attack.
    const goals=this.entities?[...this.entities.bindingsInOrder('enemy')].map(b=>b.model as EnemyInstance):this.enemies
    const handled=new Set<EnemyInstance>()
    for(const enemy of [...goals,...this.enemies]){
      if(handled.has(enemy))continue;handled.add(enemy)
      if(!this.enemies.includes(enemy)||enemy.escapedAt!==undefined||!enemy.path.finished)continue
      enemy.escapedAt=this.time;enemy.blocked=false;enemy.meleeAttack=undefined;enemy.motionSpeed={x:0,y:0}
      this.powers?.royal.onEnemyKilled(enemy,this.time)
      this.onCommand({name:'signal',signal_name:'enemy-reached-goal'})
      this.lives=Math.max(0,Math.min(10000,this.lives-enemy.template.enemy.lives_cost));this.gold+=enemy.template.enemy.gold
      this.entities?.remove(enemy);this.onSound('GUILooseLife')
    }
    this.entities?.towerPhase()
    if(this.entities){
      this.combat.firebookTrails.prepare(this.time);this.heroes.ranged.trails.prepare(this.time);this.powers.rainTrails.prepare(this.time);this.heroes.bolinRuntime.trails.prepare(this.time);this.heroes.bolinMortar.trails.prepare(this.time)
      for(const b of this.entities.bindingsInOrder('particle')){const t=b.model as import('./FirebookTrail').FirebookTrail;if(t.kind==='bolinMortar')this.heroes.bolinMortar.trails.advanceOne(t,this.time,this.heroes.bolinMortar.particleSources());else if(t.kind==='bolinCasing')this.heroes.bolinRuntime.trails.advanceOne(t,this.time,this.heroes.bolinRuntime.particleSources());else if(t.kind==='rain')this.powers.rainTrails.advanceOne(t,this.time,this.powers.meteors);else if(t.kind==='zefira')this.heroes.ranged.trails.advanceOne(t,this.time,this.heroes.ranged.projectiles.map(p=>({id:p.id,pos:p.pos,rotation:p.particleRotation??0})));else this.combat.firebookTrails.advanceOne(t,this.time,this.combat.projectiles)}
    }else this.combat.advanceParticles(this.time)
    let alive=this.pendingEnemies.length>0||this.enemies.some(e=>e.hp>0 && e.diedAt===undefined && e.escapedAt===undefined)
    if(this.hadEnemies && !alive){this.waves.signal('all_enemies_died');this.onCommand({name:'signal',signal_name:'all_enemies_died'});alive=this.pendingEnemies.length>0||this.enemies.some(e=>e.hp>0 && e.diedAt===undefined && e.escapedAt===undefined)}
    this.hadEnemies=alive
    if(this.stageFlow)this.levelScriptComplete=this.stageFlow.advance(this.time,this.waves.finished,alive,this.waves.manualFinished('tutorial'))

    if(this.outcome?.kind==='defeat'){this.paused=true;this.onSound('GUIStageDefeat')}
    this.healthBars.advance(this)
    this.paintOrder.advance(this)
    this.stepping=false
  }
}
