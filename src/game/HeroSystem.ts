import {BolinController} from './BolinController.ts'
import {BolinNativeRuntime} from './BolinNativeRuntime.ts'
import {BolinMortarRuntime} from './BolinMortarRuntime.ts'
import {BolinMinesRuntime} from './BolinMinesRuntime.ts'
import {heroStartingXp} from './HeroTeam.ts'
import {bolinUpgradeTemplates} from './BolinUpgrades.ts'
import {HeroLifeRuntime} from './HeroLifeRuntime.ts'
import {ZefiraTalents} from './ZefiraTalents.ts'
import {ZefiraUltimate} from './ZefiraUltimate.ts'
import {GeraldUltimate} from './GeraldUltimate.ts'
import {GeraldTalents} from './GeraldTalents.ts'
import {ZefiraMovement} from './ZefiraMovement.ts'
import {ZefiraSkills} from './ZefiraSkills.ts'
import {GeraldSurvivor} from './GeraldSurvivor.ts'
import {heroUpgradeData,validateHeroUpgrades} from './HeroUpgrades.ts'
import {GeraldSkills} from './GeraldSkills.ts'
import {consumeHeroXp,heroLevel} from './HeroProgression.ts'
import type {Point,LevelData} from './types'
import type {BarracksCombat,SoldierInstance,SoldierTemplate} from './BarracksCombat'
import type {EnemyInstance} from './GameSession'
import type {CameraRequest,TutorialBalloon} from './TutorialState'
import {HeroRangedCombat} from './HeroRangedCombat.ts'
export interface HeroRangedAttack {xp_gain_factor?:number;min_range:number;max_range:number;cooldown:number;shoot_time:number;animation:string;vis_flags:number;vis_bans:number;bullet:string;bullet_start_offset:Point[];node_prediction:number;chance?:number}
export interface HeroTemplate extends SoldierTemplate {
  hero:{level:number;xp:number;level_stats:{hp_max:number[];armor:number[];regen_health:number[];melee_damage_min:number[];melee_damage_max:number[];ranged_damage_min?:number[];ranged_damage_max?:number[]}}
  ranged?:{attacks:HeroRangedAttack[]}
  webAnimationDurations:Record<string,number>
  health_bar?:{offset:Point;hidden?:boolean}
}
export interface HeroUnit extends SoldierInstance {template:HeroTemplate;hero:true;level:number;xp:number;xpQueued:number;levelUpEndsAt?:number;rangedCriticalChance?:number;rangedDamage?:[number,number];respawnEndsAt?:number;portraitVisible:boolean}
export interface HeroIntro {pos:Point;at:number;phrasePlayed:boolean;finished:boolean;phase:number;phaseAt:number}
interface ZefiraIntro {at:number;phase:number;phaseAt:number;finished:boolean}
interface Teleport {hero:HeroUnit;to:Point;at:number;phase:'out'|'in'}
/** Original default team, first-stage entry and second-stage Zefira introduction. */
export class HeroSystem {
  readonly bolin=new BolinController()
  readonly bolinRuntime:BolinNativeRuntime
  readonly bolinMortar:BolinMortarRuntime
  readonly bolinMines:BolinMinesRuntime
  readonly life=new HeroLifeRuntime()
  nativeLifeEnabled=false
  readonly team:HeroUnit[]=[]
  readonly ranged:HeroRangedCombat
  readonly geraldUltimate:GeraldUltimate
  readonly geraldSkills:GeraldSkills
  readonly zefiraSkills:ZefiraSkills
  readonly zefiraUltimate:ZefiraUltimate
  readonly zefiraTalents=new ZefiraTalents()
  readonly zefiraMovement=new ZefiraMovement()
  readonly geraldTalents=new GeraldTalents()
  readonly survivor=new GeraldSurvivor()
  intro?:HeroIntro
  zefiraIntro?:ZefiraIntro
  camera?:CameraRequest
  balloon?:TutorialBalloon
  curtains=false
  guiHidden=false
  selectedId?:number
  respawnDuration=32/30
  private balloonExpiresAt?:number
  private teleport?:Teleport
  onSound:(name:string)=>void=()=>{}
  onCinematic:(active:boolean)=>void=()=>{}
  onMageBullet:(name?:string)=>void=()=>{}
  playerLevel=0
  stage=1
  mode=1
  selectedTeam?:string[]
  bolinTemplates?:Record<string,HeroTemplate>
  savedXp:Record<string,number>={}
  savedUpgrades:Record<string,string[]>={}
  private templates:Record<string,HeroTemplate>
  private barracks:BarracksCombat
  constructor(templates:Record<string,HeroTemplate>,barracks:BarracksCombat,random:()=>number=Math.random,onKill:(enemy:EnemyInstance)=>void=()=>{}){
    this.zefiraSkills=new ZefiraSkills(random,onKill)
    this.zefiraUltimate=new ZefiraUltimate(random,onKill)
    this.zefiraUltimate.onSound=name=>this.onSound(name)
    this.geraldUltimate=new GeraldUltimate(this.zefiraSkills.modifiers,random,onKill)
    this.geraldUltimate.onSound=name=>this.onSound(name)
    this.zefiraSkills.onSound=name=>this.onSound(name)
    barracks.onSpecialAttack=(s,_target,time,enemies)=>s===this.zefira&&this.zefiraSkills.tryHammer(s as HeroUnit,time,enemies)
    this.zefiraMovement.onReleaseTarget=h=>barracks.releaseKnight(h)
    this.zefiraMovement.onSound=name=>this.onSound(name)
    this.survivor.onSound=name=>this.onSound(name)
    this.templates=templates;this.barracks=barracks
    this.bolinRuntime=new BolinNativeRuntime(()=>this.bolinTemplates??this.templates,random)
    this.bolinMortar=new BolinMortarRuntime(()=>this.bolinTemplates??this.templates,random)
    this.bolinMines=new BolinMinesRuntime(()=>this.bolinTemplates??this.templates,random)
    this.bolin.mines.random=random;this.bolin.mines.onThrow=(h,a,p)=>this.bolinMines.throw(h,a,p)
    this.bolin.mortar.onFire=(h,a,points,flight)=>this.bolinMortar.fire(h,a,points,flight)
    this.bolin.onCasing=(h,a)=>this.bolinRuntime.casing(h,a)
    this.bolin.onShoot=(h,a,target,from,to)=>this.bolinRuntime.shoot(h,a,target,from,to)
    this.geraldSkills=new GeraldSkills(templates as unknown as ConstructorParameters<typeof GeraldSkills>[0])
    this.geraldSkills.onSound=name=>this.onSound(name)
    this.ranged=new HeroRangedCombat(templates as unknown as ConstructorParameters<typeof HeroRangedCombat>[0],random,onKill,barracks.dodges)
    this.ranged.onSound=name=>this.onSound(name)
  }
  get gerald(){return this.team.find(h=>h.name==='hero_gerald')}
  get zefira(){return this.team.find(h=>h.name==='hero_zefira')}
  get projectiles(){return this.ranged.projectiles}
  insertTeam(level:LevelData,time:number,includeZefira=true) {
    const positions=level.data.custom_spawn_pos??level.data.entities_list.filter(e=>e.template==='decal_defend_point5'&&e.pos).map(e=>({pos:e.pos!}))
    if(!positions.length)throw new Error('Missing original hero spawn positions')
    for(const [index,name] of (includeZefira?(this.selectedTeam??['hero_gerald','hero_zefira']):[this.selectedTeam?.[0]??'hero_gerald']).entries())this.insert(name,positions[index%positions.length].pos,time)
  }
  private cinematic(active:boolean){this.curtains=active;this.guiHidden=active;this.onCinematic(active)}
  startIntro(pos:Point,time:number) {
    if(this.intro)return
    this.intro={pos:{...pos},at:time,phrasePlayed:false,finished:false,phase:0,phaseAt:time}
    this.onSound('Stage01GeraldEnter');this.cinematic(true)
  }
  startZefiraIntro(time:number) {
    this.insertGerald({x:164,y:356},time);this.insert('hero_zefira',{x:0,y:0},time).portraitVisible=false
    this.zefiraIntro={at:time,phase:0,phaseAt:time,finished:false}
    this.camera={pos:{x:400,y:410},zoom:2,duration:0,at:time}
    this.onMageBullet('bolt_tower_wizard_cinematic');this.cinematic(true)
  }
  advance(time:number,wave=0,enemies:EnemyInstance[]=[]) {
    if(this.balloonExpiresAt!==undefined && time>=this.balloonExpiresAt || wave>0 && this.balloon?.id==='TB_HERO2'){this.balloon=undefined;this.balloonExpiresAt=undefined}
    this.survivor.advance(time,this.gerald,!this.geraldSkills.casting&&!this.geraldUltimate.cast)
    for(const hero of this.team)if(!hero.nativeHeroLife&&hero.diedAt!==undefined&&!(hero===this.gerald&&this.survivor.active)) {
      if(hero.respawnEndsAt===undefined && time-hero.diedAt>=hero.template.health.dead_lifetime){hero.respawnEndsAt=time+(hero.template.webAnimationDurations?.level_up??this.respawnDuration);hero.visualOverride={name:'level_up',at:time};const sound=hero.template.sound_events?.respawn;if(sound)this.onSound(sound)}
      if(hero.respawnEndsAt!==undefined && time+1e-9>=hero.respawnEndsAt){hero.hp=hero.template.health.hp_max;hero.diedAt=undefined;hero.visualOverride=undefined;hero.born=time;hero.readyAt=time;hero.respawnEndsAt=undefined}
    }
    this.geraldTalents.advance(time,this.gerald,!this.survivor.active&&this.gerald?.respawnEndsAt===undefined)
    const ultimateHandled=this.geraldUltimate.advance(time,this.gerald,enemies)
    if(!this.geraldSkills.deferModifiers)this.geraldSkills.advance(time,this.gerald,this.barracks.soldiers,!ultimateHandled)
    this.ranged.processInterrupts(time)
    this.zefiraUltimate.advance(time,this.zefira,enemies,wave,!this.zefiraMovement.hasPending)
    this.zefiraMovement.advance(time,this.zefira,1/30,!this.zefiraUltimate.cast)
    this.zefiraTalents.advance(time,this.zefira,enemies)
    this.zefiraSkills.advance(time,this.zefira,enemies)
    this.advanceGrowth(time,ultimateHandled?this.gerald:undefined)
    this.advanceTeleport(time)
    const intro=this.intro
    if(intro && !intro.finished && time-intro.phaseAt>=[200/30,20/30,49/30][intro.phase]) {
      intro.phaseAt=time;intro.phase++
      if(intro.phase===2){intro.phrasePlayed=true;this.onSound('HeroGeraldTauntIntro')}
      if(intro.phase===3){intro.finished=true;this.insertGerald(intro.pos,time);this.cinematic(false)}
    }
    const z=this.zefiraIntro
    if(!z || z.finished || time-z.phaseAt<[1,1.7,2,2,.5,.5,1.5][z.phase])return
    z.phaseAt=time;z.phase++
    if(z.phase===1)this.showBalloon('S02_INTRO_01',{x:367,y:371},time,1.5)
    if(z.phase===2){const hero=this.zefira!;hero.scriptLocked=true;hero.visualOverride={name:'teleport_out',at:time};this.teleport={hero,to:{x:396,y:356},at:time,phase:'out'}}
    if(z.phase===3){this.onMageBullet();this.showBalloon('S02_INTRO_02',{x:this.zefira!.pos.x,y:this.zefira!.pos.y+(this.zefira!.template.health_bar?.offset.y??30)+15},time,1.5)}
    if(z.phase===4){this.curtains=false;this.camera={pos:{x:512,y:360},zoom:1,duration:2,at:time}}
    if(z.phase===5){this.guiHidden=false;this.onCinematic(false)}
    if(z.phase===6)this.zefira!.portraitVisible=true
    if(z.phase===7){z.finished=true;if(wave===0)this.showBalloon('TB_HERO2',undefined,time,5)}
  }
  advanceCombat(time:number,dt:number,enemies:EnemyInstance[]){this.ranged.advance(time,dt,this.team,enemies)}
  insertGerald(pos:Point,time:number){return this.insert('hero_gerald',pos,time)}
  insert(name:string,pos:Point,time:number):HeroUnit {
    const previous=this.team.find(h=>h.name===name);if(previous)return previous
    const xp=Math.max(this.savedXp[name]??0,heroStartingXp(name)),level=heroLevel(xp),index=level-1
    const nodes=validateHeroUpgrades(heroUpgradeData,name,xp,this.savedUpgrades[name]??[])
    if(name==='hero_bolin')this.bolinTemplates=bolinUpgradeTemplates(this.templates,nodes)
    const template=structuredClone((name==='hero_bolin'?this.bolinTemplates!:this.templates)[name]),ls=template.hero.level_stats
    const map=(key:keyof typeof ls,factor:number,addition=0)=>{const values=ls[key];if(values)ls[key]=values.map(n=>n*factor+addition)}
    if(name==='hero_gerald'){
      if(nodes.includes('talent_1')&&template.dodge)template.dodge.chance=.35
      this.geraldUltimate.configure(nodes)
      this.survivor.configure(nodes)
      this.geraldTalents.configure(nodes)
      this.geraldSkills.configure(nodes.map(id=>`${name}_${id}`))
      if(nodes.includes('upg_a'))template.melee.attacks[0].xp_gain_factor=(template.melee.attacks[0].xp_gain_factor??1)*1.3
      if(nodes.includes('upg_b')){map('melee_damage_min',1.1);map('melee_damage_max',1.1)}
      if(nodes.includes('upg_c'))map('hp_max',1.1)
      if(nodes.includes('upg_d'))template.health.dead_lifetime=20
      if(nodes.includes('upg_e'))map('armor',1,.1)
    }else if(name==='hero_zefira'){
      this.zefiraUltimate.configure(nodes)
      if(nodes.includes('talent_2'))template.melee.attacks[0].critical_chance=.2
      this.zefiraSkills.configure(nodes)
      this.zefiraTalents.configure(nodes)
      this.zefiraMovement.configure(nodes)
      if(nodes.includes('upg_a'))template.health.dead_lifetime=20
      if(nodes.includes('upg_c'))map('regen_health',1.2)
      if(nodes.includes('upg_d'))map('hp_max',1.2)
      if(nodes.includes('upg_e'))for(const key of ['melee_damage_min','melee_damage_max','ranged_damage_min','ranged_damage_max'] as const)map(key,1.05)
    }
    template.health.hp_max=ls.hp_max[index];template.health.armor=ls.armor[index];template.regen.health=ls.regen_health[index]
    for(const [attackIndex,attack]of template.melee.attacks.entries())if(attack.basic_attack||name==='hero_gerald'&&attackIndex===1){attack.damage_min=ls.melee_damage_min[index];attack.damage_max=ls.melee_damage_max[index]}
    if(template.health_bar)template.health_bar.hidden=false
    const unit=this.barracks.insertHero(name,pos,time,template) as HeroUnit
    if(name==='hero_zefira'&&nodes.includes('talent_2'))unit.rangedCriticalChance=.2
    unit.nativeHeroLife=this.nativeLifeEnabled
    unit.level=level;unit.xp=xp;unit.xpQueued=0;template.hero.level=level;template.hero.xp=xp;unit.portraitVisible=true
    if(ls.ranged_damage_min && ls.ranged_damage_max)unit.rangedDamage=[ls.ranged_damage_min[index],ls.ranged_damage_max[index]]
    this.team.push(unit);if(name==='hero_gerald')this.geraldTalents.insertRegeneration(unit);return unit
  }
  advanceHeroGrowth(time:number,hero:HeroUnit){this.advanceGrowth(time,undefined,hero)}
  advanceGeraldGrowth(time:number){this.advanceGrowth(time,undefined,this.gerald)}
  private advanceGrowth(time:number,skip?:HeroUnit,only?:HeroUnit) {
    for(const hero of this.team) {
      if(only&&hero!==only)continue
      if(hero.name==='hero_bolin'&&hero.template.unit?.is_stunned)continue
      if(hero===skip||hero===this.gerald&&this.nativeGeraldRally&&this.pendingGeraldRally)continue
      if(hero.levelUpEndsAt!==undefined) {
        if(time+1e-9>=hero.levelUpEndsAt){hero.levelUpEndsAt=undefined;hero.scriptLocked=false;hero.visualOverride=undefined}
        else continue
      }
      if(hero.hp<=0 || hero.scriptLocked || time+1e-9<(hero.actionYieldUntil??0) || hero.deploying || hero.moving&&!hero.target || hero.attack || hero.rangedUntil!==undefined)continue
      if(!consumeHeroXp(hero,this.stage,this.mode,2,this.playerLevel))continue
      const template=hero.template,ls=template.hero.level_stats,index=hero.level-1
      template.hero.level=hero.level;template.hero.xp=hero.xp
      template.health.hp_max=ls.hp_max[index];template.health.armor=ls.armor[index];template.regen.health=ls.regen_health[index]
      for(const [attackIndex,attack]of template.melee.attacks.entries())if(attack.basic_attack||hero.name==='hero_gerald'&&attackIndex===1){attack.damage_min=ls.melee_damage_min[index];attack.damage_max=ls.melee_damage_max[index]}
      if(ls.ranged_damage_min && ls.ranged_damage_max)hero.rangedDamage=[ls.ranged_damage_min[index],ls.ranged_damage_max[index]]
      hero.hp=template.health.hp_max;hero.scriptLocked=true;hero.visualOverride={name:hero.name==='hero_bolin'?'levelup':'level_up',at:time};hero.levelUpEndsAt=time+template.webAnimationDurations[hero.visualOverride.name]
      if(template.sound_events?.level_up)this.onSound(template.sound_events.level_up)
      this.onSound('HeroLevelUp')
    }
  }
  moveSelected(pos:Point){const hero=this.team.find(h=>h.id===this.selectedId);return hero?this.move(hero,pos):false}
  nativeGeraldRally=false
  get geraldRallyPending(){return this.pendingGeraldRally}
  private pendingGeraldRally=false
  private geraldRallyHitAt?:number
  /** GUI only raises nav_rally.new; the yielding own-main consumes it. */
  prepareGeraldRally(time:number){
    const hero=this.gerald;if(!hero||!this.pendingGeraldRally)return false
    if(hero.hp<=0){this.pendingGeraldRally=false;return false}
    if(time<(hero.actionYieldUntil??0))return true
    if(hero.deploying){this.barracks.finishHeroRally(hero);hero.deploying=false}
    if(hero.attack){const cycle=hero.attack,times=cycle.attack.hit_times??[cycle.attack.hit_time??0]
      // Native single-melee checks rally only inside the pre-hit wait. A rally
      // on the hit boundary resumes damage before returning to the outer main.
      if(cycle.nextHit<times.length&&time-cycle.startedAt>=times[cycle.nextHit]){this.geraldRallyHitAt=time;return false}
    }
    if(hero.attack||this.geraldSkills.casting){
      if(hero.meleeVisual)hero.idleVisual={...hero.meleeVisual,loop:false}
      this.barracks.interruptHeroMelee(hero);hero.deploying=false;hero.moving=false
      this.barracks.finishHeroRally(hero)
      if(this.geraldSkills.casting)this.geraldSkills.interruptForRally(time,hero,this.barracks.soldiers)
      hero.actionYieldUntil=(Math.round(time*30)+1)*(1/30);return true
    }
    if(hero.scriptLocked)return false
    this.pendingGeraldRally=false;this.barracks.releaseKnight(hero);hero.visualOverride=undefined;hero.rangedUntil=undefined;hero.deploying=true
    const sound=hero.template.sound_events?.change_rally_point;if(sound)this.onSound(sound)
    return false
  }
  finishGeraldRallyHit(time:number){
    if(this.geraldRallyHitAt!==time)return false
    this.geraldRallyHitAt=undefined
    const hero=this.gerald;if(!hero)return false
    if(hero.meleeVisual)hero.idleVisual={...hero.meleeVisual,loop:false}
    this.barracks.interruptHeroMelee(hero)
    hero.actionYieldUntil=(Math.round(time*30)+1)*(1/30)
    return true
  }
  moveGerald(pos:Point){return this.gerald?this.move(this.gerald,pos):false}
  private move(hero:HeroUnit,pos:Point) {
    if(hero.hp<=0)return false
    if(hero===this.gerald&&this.nativeGeraldRally){this.pendingGeraldRally=true;hero.rally={...pos};hero.center={...pos};return true}
    if(hero===this.zefira){this.ranged.requestInterrupt(hero);this.zefiraUltimate.requestInterrupt();return this.zefiraMovement.request(hero,pos)}
    hero.target=undefined;hero.attack=undefined;hero.visualOverride=undefined;hero.rangedUntil=undefined;hero.scriptLocked=false;hero.rally={...pos};hero.center={...pos};hero.deploying=true
    const sound=hero.template.sound_events?.change_rally_point;if(sound)this.onSound(sound)
    return true
  }
  private showBalloon(id:string,pos:Point|undefined,time:number,duration:number){this.balloon={id,pos};this.balloonExpiresAt=time+duration}
  private advanceTeleport(time:number){
    const t=this.teleport;if(!t)return
    if(time-t.at+1e-9<t.hero.template.webAnimationDurations[`teleport_${t.phase}`])return
    if(t.phase==='out'){t.hero.pos={...t.to};t.hero.rally={...t.to};t.hero.center={...t.to};t.phase='in';t.at=time;t.hero.visualOverride={name:'teleport_in',at:time}}
    else {t.hero.scriptLocked=false;t.hero.visualOverride=undefined;this.teleport=undefined}
  }
}
