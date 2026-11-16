import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {luaSort} from './LuaSort.ts'
import {recordEnemyDamage} from './EnemyDeath.ts'
import {FirebookTrailSystem} from './FirebookTrail.ts'
import {WizardFirebookSystem} from './WizardFirebook.ts'
import {CatapultTraps,catapultOwner} from './CatapultTraps.ts'
import {CatapultTarSystem} from './CatapultTar.ts'
import {CatapultBombSystem} from './CatapultBomb.ts'
import wizardTimes from '../../public/data/wizard-exo-times.json' with {type:'json'}
import {CatapultTowerSystem,catapultDirection} from './CatapultTower.ts'
import {WizardTowerSystem} from './WizardTower.ts'
import {archerGeometry} from './ArcherShooter.ts'
import {ArcherMarkCaster} from './ArcherMarkCaster.ts'
import {CulverineRaySystem} from './CulverineRay.ts'
import {CulverineTowerSystem} from './CulverineTower.ts'
import type {ArcherState,ArcherTemplate} from './ArcherShooter'
import {bulletDamageValue} from './BulletDamage.ts'
import {WizardBookMotion} from './WizardBookMotion.ts'
import {EnemyArrowMotion} from './EnemyArrowMotion.ts'
import {towerArrowAim} from './TowerArrow.ts'
import {CatapultMotion,catapultDamage} from './CatapultMotion.ts'
import {predictDamage} from './Damage.ts'
import type {Damage} from './Damage'
import type {DodgeSystem} from './DodgeSystem'
import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
import {BoltMotion} from './BoltMotion.ts'
import type {BoltMotionConfig} from './BoltMotion'
interface Attack {excluded_templates?:string[];ignored_terrains?:number[];node_prediction?:number;cooldown:number;shoot_time:number;bullet:string;vis_flags:number;vis_bans:number;bullet_start_offset:Point|Point[]}
export interface CombatTemplate {
  sound_events?:Record<string,string>
  tower?:{range_offset:Point;damage_factor?:number;long_idle_cooldown?:number;long_idle_pos?:Point[]}
  attacks?:{range:number;list:Attack[];attack_delay_on_spawn:number}
  shooters_sids?:number[]
  bows_sids?:number[]
  render:{sprites:{offset:Point;prefix?:string;name:string;exo?:boolean;anchor:Point}[]}
  bullet?:{particles_name?:string;mod?:string;align_with_trajectory?:boolean;pop?:string[];pop_chance?:number;pop_conds?:number;chance_to_ignore_mr?:number;explosive_factor?:number;critical_chance?:number;crit_ignores_armor?:boolean;fixed_height?:number;predict_target_pos?:boolean;prediction_error?:boolean;miss_decal?:string;miss_fx_water?:string;hit_blood_fx?:string;rotation_speed?:number;hide_radius?:number;ignore_hit_offset?:boolean;damage_decay_random?:boolean;damage_flags?:number;damage_bans?:number;hit_payload?:string;hit_decal?:string;hit_fx_water?:string;flight_time:number;g:number;hit_distance?:number;damage_min:number;damage_max:number;damage_radius:number;damage_type:number;reduce_armor:number;reduce_magic_armor:number;damage_factor:number;max_track_distance?:number;hit_fx?:string}
  force_motion?:BoltMotionConfig['force_motion']
  initial_impulse?:number;initial_impulse_duration?:number;initial_impulse_angle_abs?:number
}
export interface Projectile {registryBound?:boolean;removalQueued?:boolean;nativePsCreated?:boolean;trajectoryLastPos?:Point;hidden?:boolean;hitAt?:number;lingerDuration?:number;removeNext?:boolean;damageMin?:number;damageMax?:number;source?:string;level?:number;id:number;name:string;born:number;duration:number;from:Point;to:Point;pos:Point;target?:EnemyInstance;done:boolean;rotation:number;motion?:BoltMotion;tracking?:boolean;fixedDamage?:number;damageFactor?:number;reduceArmor?:number;bombMotion?:CatapultMotion;arrowMotion?:EnemyArrowMotion}
export interface ShootingState {readyAt:number;startedAt:number;firesAt?:number;target?:EnemyInstance;facingBack:boolean;archerTs?:number;shooterIndex?:number;archers?:Map<number,ArcherState>}
interface ArrowShot {name:string;from:Point;to:Point;target:EnemyInstance;predict:boolean;factor:number;reduceArmor:number;queuedAt:number}
export class RangedCombat {
  deferArcherControllers=false
  deferProjectileInsertSound=false
  readonly archerControllers=new Set<ArcherState>()
  onQueueArcherController:(controller:ArcherState)=>void=()=>{}
  onRemoveArcherController:(controller:ArcherState)=>void=()=>{}
  onCopiesLanded:(pos:Point,level:number,time:number)=>void=()=>{}
  onAllocateProjectile:(model:object,name:string)=>void=()=>{}
  onCopiesPayload:(pos:Point,level:number,time:number)=>void=()=>{}
  private pendingCopies=new Map<object,{name:string;from:Point;to:Point;targetId:number;level:number;min:number;max:number;queuedAt:number}>()
  private pendingArrows=new Map<object,ArrowShot>()
  onQueueProjectile:(shot:object,name:string,time:number)=>void=()=>{}
  onInsertProjectile:(shot:object,projectile:Projectile)=>void=()=>{}
  onParticleCreate:(name:string,time:number,projectile:Projectile)=>void=()=>{}
  onRemoveProjectile:(projectile:Projectile)=>void=()=>{}
  onMainComplete:()=>void=()=>{}
  onDamageCreate:()=>number|void=()=>{}
  onEffectCreate:(name:string,time:number,pos:Point,transform?:{rotation?:number;flipX?:boolean})=>void=()=>{}

  onSound:(name:string)=>void=()=>{}
  projectileTargetPresent:(enemy:EnemyInstance,pool:EnemyInstance[])=>boolean=(enemy,pool)=>pool.includes(enemy)
  targetValid:(enemy:EnemyInstance)=>boolean=()=>true
  predictTarget:(enemy:EnemyInstance,seconds:number)=>{pos:Point;valid:boolean}=(enemy,seconds)=>({pos:enemy.path.predict(enemy.blocked||enemy.meleeHolding||enemy.frozen||enemy.rangedHolding||enemy.skillLocked?0:enemy.template.motion.max_speed*seconds),valid:this.targetValid(enemy)})
  cellAt:(point:Point)=>number=()=>1
  onEffect:(name:string,pos:Point,time:number,transform?:{flipX?:boolean;rotation?:number;bloodColor?:string;animationName?:string})=>void=()=>{}
  readonly projectiles:Projectile[]=[]
  readonly culverineRays:CulverineRaySystem
  readonly culverineTowers:CulverineTowerSystem
  readonly wizardTowers:WizardTowerSystem
  readonly catapultTowers:CatapultTowerSystem
  readonly catapultBombs:CatapultBombSystem
  readonly catapultTar:CatapultTarSystem
  deferParticlePhase=false
  private particleSources:Projectile[]=[]
  readonly firebookTrails:FirebookTrailSystem
  readonly firebook:WizardFirebookSystem
  readonly catapultTraps:CatapultTraps
  private pendingWizardShots:{name:string;from:Point;to:Point;targetId?:number;factor:number;sign:number;plain?:boolean;damageMin?:number;damageMax?:number}[]=[]
  private pendingCatapultShots:{source?:string;name:string;from:Point;to:Point;factor:number;level:number;damageMin?:number;damageMax?:number}[]=[]
  readonly shooters=new Map<string,ShootingState>()
  readonly archerMarkCaster?:ArcherMarkCaster
  readonly damageOverrides=new Map<string,number>()
  readonly bulletOverrides=new Map<string,string>()
  private nextId=1
  private templates:Record<string,CombatTemplate>
  private random:()=>number
  private onKill:(enemy:EnemyInstance)=>void
  constructor(templates:Record<string,CombatTemplate>,random:()=>number,onKill:(enemy:EnemyInstance)=>void) {
    this.templates=templates;this.random=random;this.onKill=onKill
    const markAttack=(templates.tower_archers_lvl4 as unknown as {timed_attacks?:{list:ConstructorParameters<typeof ArcherMarkCaster>[0][]}}|undefined)?.timed_attacks?.list[1]
    if(markAttack){this.archerMarkCaster=new ArcherMarkCaster(markAttack);this.archerMarkCaster.onSound=name=>this.onSound(name)}
    this.firebookTrails=new FirebookTrailSystem(random)
    this.firebook=new WizardFirebookSystem(templates.mod_firebook_aura as unknown as ConstructorParameters<typeof WizardFirebookSystem>[0],random)
    this.firebook.onDamage=(enemy,damage)=>this.queueHit({enemy,damage})
    this.catapultTar=new CatapultTarSystem(templates)
    this.catapultTraps=new CatapultTraps(templates,random,onKill)
    this.catapultTraps.onSound=name=>this.onSound(name);this.catapultTraps.targetValid=e=>this.targetValid(e)
    this.catapultBombs=new CatapultBombSystem(templates.aura_catapult_skill_b_bomb as unknown as ConstructorParameters<typeof CatapultBombSystem>[0],onKill)
    this.catapultBombs.onSound=name=>this.onSound(name);this.catapultBombs.targetValid=e=>this.targetValid(e)
    this.catapultTowers=new CatapultTowerSystem(templates as unknown as ConstructorParameters<typeof CatapultTowerSystem>[0])
    this.catapultTowers.onShoot=(site,name,from,to,factor,time,level)=>{const shot={source:catapultOwner(site),name,from,to,factor,level};this.pendingCatapultShots.push(shot);this.onQueueProjectile(shot,name,time)}
    this.catapultTowers.trapCount=site=>this.catapultTraps.count(site)
    this.wizardTowers=new WizardTowerSystem(templates as unknown as ConstructorParameters<typeof WizardTowerSystem>[0],wizardTimes,random)
    this.wizardTowers.onCopies=(_site,name,from,to,targetId,level,min,max,time)=>{const shot={name,from,to,targetId:Number(targetId),level,min,max,queuedAt:time};this.pendingCopies.set(shot,shot);this.onQueueProjectile(shot,name,time)}
    this.wizardTowers.onFirebook=(_site,name,from,to,_target,level,damageMin,damageMax,time)=>{const shot={name,from,to:{...to},level,damageMin,damageMax,factor:1};this.pendingCatapultShots.push(shot);this.onQueueProjectile(shot,name,time)}
    this.wizardTowers.onShoot=(site,name,from,target,sign,time)=>{const shot={name,from,to:{...target.pos},targetId:Number(target.id),factor:(this.templates[site.tower!].tower?.damage_factor??1)*(site.damageFactor??1),sign};this.pendingWizardShots.push(shot);this.onQueueProjectile(shot,name,time)}
    this.culverineRays=new CulverineRaySystem(templates as unknown as ConstructorParameters<typeof CulverineRaySystem>[0],onKill)
    this.culverineRays.targetValid=e=>this.targetValid(e)
    this.culverineRays.onEffect=(name,pos,time)=>this.effect(name,pos,time)
    this.culverineTowers=new CulverineTowerSystem(templates as unknown as ConstructorParameters<typeof CulverineTowerSystem>[0],random)
    this.culverineTowers.onSound=name=>this.onSound(name)
    this.culverineTowers.onShoot=(name,from,to,target,factor,time)=>this.culverineRays.launch(name,from,to,target,undefined,factor,time)
  }
  reserveCopiesProjectile(name:string){const model={};this.onAllocateProjectile(model,name);return model}
  queueCopiesBomb(model:object,shot:{name:string;from:Point;to:Point;level:number},time:number){const pending=Object.assign(model,{...shot,factor:1});this.pendingCatapultShots.push(pending);this.onQueueProjectile(pending,shot.name,time)}
  queueCopiesShard(model:object,shot:{name:string;from:Point;to:Point;target?:number|string;min:number;max:number},time:number){const pending=Object.assign(model,{name:shot.name,from:shot.from,to:shot.to,targetId:shot.target===undefined?undefined:Number(shot.target),factor:1,sign:0,plain:true,damageMin:shot.min,damageMax:shot.max});this.pendingWizardShots.push(pending);this.onQueueProjectile(pending,shot.name,time)}
  private effect(name:string,pos:Point,time:number,transform?:{flipX?:boolean;rotation?:number;bloodColor?:string;animationName?:string}){this.onEffectCreate(name,time,pos,transform);this.onEffect(name,pos,time,transform)}
  /** Replacing the native tower entity ends its source scripts immediately.
   * Queued shots and autonomous payloads retain their captured source data. */
  removeTowerState(id:string){
    this.shooters.delete(id)
    this.wizardTowers.states.delete(id)
    this.catapultTowers.states.delete(id)
    this.culverineTowers.states.delete(id)
  }
  /** Wizard filter17993 validates the attack forecast. FFE's separate prediction
   * argument is numeric zero: truthy in Lua, so range uses the current path node. */
  enemyCandidates:(pool:EnemyInstance[],at:Point,radius:number)=>EnemyInstance[]=(pool)=>pool
  catapultTargets(site:TowerSite,enemies:EnemyInstance[],seconds:number,direction?:number){
    const t=this.templates[site.tower!],a=t.attacks!.list[0],o=t.tower!.range_offset,origin={x:site.pos.x+o.x,y:site.pos.y+o.y},range=t.attacks!.range*(site.rangeFactor??1)
    return luaSort(this.enemyCandidates(enemies,origin,range+seconds*150).filter(e=>e.hp>0&&!e.path.finished&&!((e.frozen?4096:e.template.vis.flags)&(site.attackBansOverride??a.vis_bans))&&!(e.template.vis.bans&a.vis_flags)).map(enemy=>({enemy,predicted:this.predictTarget(enemy,seconds)})).filter(({enemy,predicted})=>predicted.valid&&(predicted.pos.x-origin.x)**2+((predicted.pos.y-origin.y)/.7)**2<=range*range&&(direction===undefined||catapultDirection(origin,this.predictTarget(enemy,this.templates[a.bullet].bullet!.flight_time).pos)===direction)),(a,b)=>a.enemy.path.remainingNodes<b.enemy.path.remainingNodes)
  }
  wizardTargets(site:TowerSite,enemies:EnemyInstance[],attackIndex=0){
    const t=this.templates[site.tower!],a=t.attacks!.list[attackIndex],o=t.tower!.range_offset,origin={x:site.pos.x+o.x,y:site.pos.y+o.y},range=t.attacks!.range*(site.rangeFactor??1)
    return luaSort(this.enemyCandidates(enemies,origin,range).filter(e=>{
      if(a.excluded_templates?.includes(e.name)||a.ignored_terrains?.some(flag=>this.cellAt(e.path.position)&flag)||e.hp<=0||e.path.finished||!this.targetValid(e)||!this.predictTarget(e,a.node_prediction??0).valid||((e.frozen?4096:e.template.vis.flags)&(site.attackBansOverride??a.vis_bans))||(e.template.vis.bans&a.vis_flags))return false
      const node=this.predictTarget(e,0)
      return node.valid&&(node.pos.x-origin.x)**2+(node.pos.y-origin.y)**2/(.7*.7)<=range*range
    }),(a,b)=>a.path.remainingNodes<b.path.remainingNodes).map(e=>({id:e.id,pos:e.path.position,hitOffset:e.template.unit.hit_offset}))
  }
  dodges?:DodgeSystem
  private projectileHits:{enemy:EnemyInstance;damage:Damage;bullet?:CombatTemplate['bullet'];result?:number;popOrder?:number}[]=[]
  queueNativeDamage(enemy:EnemyInstance,damage:Damage,allocated=false){if(allocated)this.projectileHits.push({enemy,damage});else this.queueHit({enemy,damage})}
  private queueHit(hit:(typeof this.projectileHits)[number]){const order=this.onDamageCreate();hit.popOrder=typeof order==='number'?order:undefined;this.projectileHits.push(hit)}
  /** Original health phase resolves queued damage in reverse insertion order,
   * then clamps HP/awards each death once. Other combat systems keep their own
   * phases until the global simulation dispatcher is ported. */
  private resolveProjectileHits(time:number){
    const touched=new Set<EnemyInstance>()
    for(let i=this.projectileHits.length-1;i>=0;i--){
      const {enemy:e,damage}=this.projectileHits[i],h=e.template.health
      if(e.diedAt!==undefined||e.escapedAt!==undefined||h.ignore_damage||((h.immune_to??0)&damage.damage_type))continue
      recordEnemyDamage(e,damage.damage_type,time)
      const before=e.hp,applied=predictDamage({...h,hp:e.hp},damage)
      e.hp-=applied;this.projectileHits[i].result=(applied>0?1:0)|(before>0&&e.hp<=0?2:0);touched.add(e)
    }
    for(const e of touched)if(e.hp<=0){e.hp=0;e.diedAt=time;this.onKill(e)}
    // Native pops run after health, in original queue order (health runs backwards).
    // Projectile sources have no soldier/enemy component, so placement uses the target.
    for(const hit of this.projectileHits){const b=hit.bullet;this.dodges?.showDamage(undefined,hit.enemy,time,b?.pop,b?.pop_chance,b?.pop_conds,hit.result??0,hit.popOrder)}
    this.projectileHits.length=0
  }
  advance(time:number,sites:TowerSite[],enemies:EnemyInstance[],interleave?:(advanceSource:(site:TowerSite)=>void,advanceProjectile:(projectile:Projectile)=>void)=>void) {
    for(let i=this.projectiles.length-1;i>=0;i--)if(this.projectiles[i].removeNext)this.projectiles.splice(i,1)
    this.firebook.advance(time,enemies)
    this.catapultTraps.advance(time,sites,enemies)
    this.catapultTar.advance(time,enemies)
    this.catapultBombs.advance(time,enemies)
    // Native queue insertion precedes scripts; a bolt remains queued even when its source is sold.
    for(const shot of [...this.pendingWizardShots,...this.pendingCatapultShots])this.insertArrow(shot,time,enemies)
    if(!this.deferArcherControllers)for(const shot of [...this.pendingCopies.values()])if(time>shot.queuedAt)this.insertArrow(shot,time,enemies)
    if(!this.deferArcherControllers)for(const shot of [...this.pendingArrows.values()])if(time>shot.queuedAt)this.insertArrow(shot,time,enemies)
    this.catapultTowers.advance(time,sites,()=>undefined,[])
    this.wizardTowers.advance(time,sites,()=>[],[])
    const pickCulverine=(site:TowerSite)=>{
      const t=this.templates[site.tower!],a=t.attacks!.list[0],o=t.tower!.range_offset,origin={x:site.pos.x+o.x,y:site.pos.y+o.y},range=t.attacks!.range*(site.rangeFactor??1)
      const enemy=enemies.filter(e=>e.hp>0&&!e.path.finished&&this.targetValid(e)&&!(e.template.vis.flags&(site.attackBansOverride??a.vis_bans))&&!(e.template.vis.bans&a.vis_flags)&&(e.path.position.x-origin.x)**2+((e.path.position.y-origin.y)/.7)**2<=range*range).sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes)[0]
      if(!enemy)return
      return {enemy,point:enemy.path.predict(enemy.blocked||enemy.meleeHolding||enemy.frozen||enemy.rangedHolding||enemy.skillLocked?0:enemy.template.motion.max_speed/30)}
    }
    this.culverineTowers.advance(time,sites,pickCulverine,[])
    const advanceSource=(site:TowerSite)=>{
      if(!site.tower || site.attackDisabled)return
      if(site.tower.startsWith('tower_culverine_')){this.culverineTowers.advance(time,sites,pickCulverine,[site]);return}
      if(site.tower.startsWith('tower_catapult_')){
        this.catapultTowers.advance(time,sites,(site,seconds,direction)=>{
          const choices=this.catapultTargets(site,enemies,seconds,direction)
          const selected=choices[0];if(!selected)return
          return {target:{id:selected.enemy.id,pos:selected.enemy.path.position,predict:seconds=>this.predictTarget(selected.enemy,seconds).pos},pos:selected.predicted.pos}
        },[site])
        return
      }
      if(site.tower.startsWith('tower_wizard_')){
        this.wizardTowers.advance(time,sites,(site,index)=>this.wizardTargets(site,enemies,index),[site])
        return
      }
      const template=this.templates[site.tower],attacks=template.attacks,baseAttack=attacks?.list[0]
      const attack=baseAttack?{...baseAttack,bullet:this.bulletOverrides.get(site.id)??baseAttack.bullet}:undefined
      if(!attack)return
      const bullet=this.templates[attack.bullet]
      let state=this.shooters.get(site.id)
      if(!state){state={readyAt:time+attacks!.attack_delay_on_spawn,startedAt:-Infinity,facingBack:false};this.shooters.set(site.id,state)}
      const origin={x:site.pos.x+template.tower!.range_offset.x,y:site.pos.y+template.tower!.range_offset.y}
      const targets=()=>enemies.filter(e=>e.hp>0 && !e.path.finished && this.targetValid(e) && !((e.frozen?4096:e.template.vis.flags)&(site.attackBansOverride??attack.vis_bans)) && !(e.template.vis.bans&attack.vis_flags) && (e.path.position.x-origin.x)**2+((e.path.position.y-origin.y)/.7)**2<=(attacks!.range*(site.rangeFactor??1))**2).sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes)
      if(bullet.bullet?.fixed_height!==undefined){this.archer(site,template,attack,state,time,enemies);return}
      if(state.firesAt!==undefined && time+1e-9>=state.firesAt) {
        const target=targets()[0]??state.target!
        if(target.hp>0) {
          const shooter=template.shooters_sids?template.render.sprites[template.shooters_sids[0]-1].offset:{x:0,y:0}
          const offset=Array.isArray(attack.bullet_start_offset)?attack.bullet_start_offset[state.facingBack?1:0]:attack.bullet_start_offset
          const from={x:site.pos.x+shooter.x+offset.x,y:site.pos.y+shooter.y+offset.y}
          const predicted=target.path.predict(target.blocked || target.meleeHolding || target.frozen || target.rangedHolding || target.skillLocked?0:target.template.motion.max_speed*bullet.bullet!.flight_time)
          let to=bullet.bullet!.ignore_hit_offset?{...predicted}:{x:predicted.x+target.template.unit.hit_offset.x,y:predicted.y+target.template.unit.hit_offset.y}
          const bombMotion=bullet.bullet!.damage_radius>0?new CatapultMotion(from,to,bullet.bullet!,(this.random()-.5)*Math.PI):undefined
          this.projectiles.push({bombMotion,damageFactor:bullet.bullet!.damage_factor*(site.damageFactor??1),id:this.nextId++,name:attack.bullet,born:time,duration:bullet.bullet!.flight_time,from,to,pos:{...from},target,done:false,rotation:0,fixedDamage:this.damageOverrides.get(attack.bullet)})
          const sound=bullet.sound_events?.insert;if(sound)this.onSound(sound)
        }
        state.firesAt=undefined
      }
      if(state.firesAt===undefined && time+1e-9>=state.readyAt) {
        const target=targets()[0]
        if(target){state.target=target;state.startedAt=time;state.firesAt=time+attack.shoot_time;state.readyAt=time+attack.cooldown;state.facingBack=target.path.position.y>site.pos.y}
      }
    
    }
    const advanced=new Set<Projectile>()
    const advanceProjectile=(p:Projectile)=>{if(advanced.has(p)||!this.projectiles.includes(p))return;advanced.add(p);this.updateProjectiles(time,enemies,[p]);if(p.done&&p.hitAt===undefined&&!p.removalQueued){p.removalQueued=true;this.onRemoveProjectile(p)}}
    if(interleave)interleave(advanceSource,advanceProjectile);else for(const site of sites)advanceSource(site)
    if(!this.deferArcherControllers)for(const controller of this.archerControllers)if(time>controller.createdAt)this.advanceArcherController(controller,time,enemies)
    this.culverineRays.advance(time,enemies,source=>sites.some(s=>`${s.id}:${s.tower}`===source))
    // Standalone callers and source families without registry bindings retain
    // their ordinary update; entities already dispatched above never run twice.
    for(const p of this.projectiles)advanceProjectile(p)
    this.onMainComplete()
    this.resolveProjectileHits(time)
    this.particleSources=this.projectiles.slice()
    if(!this.deferParticlePhase)this.advanceParticles(time)
    for(let i=this.projectiles.length-1;i>=0;i--)if(this.projectiles[i].done&&this.projectiles[i].hitAt===undefined){if(!this.projectiles[i].removalQueued)this.onRemoveProjectile(this.projectiles[i]);if(this.projectiles[i].registryBound)this.projectiles[i].removeNext=true;else this.projectiles.splice(i,1)}
  }
  private updateProjectiles(time:number,enemies:EnemyInstance[],projectiles:Projectile[]){
    for(const projectile of projectiles) {
      if(projectile.done){if(projectile.hitAt!==undefined&&!projectile.removeNext&&time-projectile.hitAt>=projectile.lingerDuration!){projectile.removeNext=true;this.onRemoveProjectile(projectile)}continue}
      const bullet=this.templates[projectile.name].bullet!
      if(!projectile.nativePsCreated&&bullet.particles_name){projectile.nativePsCreated=true;this.onParticleCreate(bullet.particles_name,time,projectile)}
      if(projectile.motion) {
        const target=projectile.target,offset=bullet.ignore_hit_offset?{x:0,y:0}:target?.template.unit.hit_offset??{x:0,y:0}
        if(projectile.tracking && target && enemies.includes(target) && target.hp>0 && target.escapedAt===undefined && !(target.template.vis.bans&2)) {
          const next={x:target.path.position.x+offset.x,y:target.path.position.y+offset.y}
          if(Math.max(Math.abs(next.x-projectile.to.x),Math.abs(next.y-projectile.to.y))>(bullet.max_track_distance??128))projectile.tracking=false
          else projectile.to=next
        }
        const template=this.templates[projectile.name],age=time-projectile.born
        if(!(template.initial_impulse!==undefined&&age<template.initial_impulse_duration!))projectile.trajectoryLastPos={...projectile.pos}
        const arrived=projectile.motion.step(projectile.pos,projectile.to,age,1/30)
        // During the initial impulse the original last_pos stays at the spawn
        // point; an arriving step breaks before updating the sprite rotation.
        if(!arrived&&bullet.align_with_trajectory){const previous=projectile.trajectoryLastPos??projectile.from;projectile.rotation=Math.atan2(projectile.pos.y-previous.y,projectile.pos.x-previous.x)}
        if(!arrived)continue
      } else if(projectile.arrowMotion) {
        const e=projectile.target!,offset=e.template.unit.hit_offset,target={x:e.path.position.x+offset.x,y:e.path.position.y+offset.y}
        const arrived=projectile.arrowMotion.step(time-projectile.born,1/30,target)
        Object.assign(projectile.pos,projectile.arrowMotion.pos);projectile.rotation=projectile.arrowMotion.rotation
        if(!arrived)continue
        projectile.done=true;this.resolveArrow(projectile,bullet,time,enemies);if(projectile.name==='bullet_skill_c_wizard_1'){this.onCopiesPayload({...projectile.to},projectile.level??1,time);projectile.hidden=true;const wait=this.firebookTrails.stop(projectile.id);if(wait!==undefined){projectile.hitAt=time;projectile.lingerDuration=wait}}continue
      } else if(projectile.bombMotion) {
        if(!projectile.bombMotion.step(time-projectile.born,1/30)){Object.assign(projectile.pos,projectile.bombMotion.pos);projectile.rotation=projectile.bombMotion.rotation;continue}
        Object.assign(projectile.pos,projectile.bombMotion.pos);projectile.rotation=projectile.bombMotion.rotation
      } else {
        const elapsed=Math.min(projectile.duration,time-projectile.born),t=elapsed/projectile.duration
        projectile.pos.x=projectile.from.x+(projectile.to.x-projectile.from.x)*t
        projectile.pos.y=projectile.from.y+(projectile.to.y-projectile.from.y)*t+.5*bullet.g*elapsed*(elapsed-projectile.duration)
        projectile.rotation=Math.atan2((projectile.to.y-projectile.from.y)/projectile.duration+bullet.g*(elapsed-projectile.duration/2),(projectile.to.x-projectile.from.x)/projectile.duration)
        if(t<1)continue
      }
      projectile.done=true
      if(projectile.motion&&bullet.particles_name==='ps_tower_wizard_bolt_trail'){projectile.hidden=true;const wait=this.firebookTrails.stop(projectile.id);if(wait!==undefined){projectile.hitAt=time;projectile.lingerDuration=wait}}
      const radialCandidates=bullet.mod==='mod_firebook_aura'?this.enemyCandidates(enemies,projectile.to,bullet.damage_radius):enemies
      const targets=bullet.damage_radius>0?radialCandidates.filter(e=>e.hp>0 && this.targetValid(e) && !(e.template.vis.flags&(bullet.damage_bans??0)) && !(e.template.vis.bans&(bullet.damage_flags??0)) && (e.path.position.x-projectile.to.x)**2+(e.path.position.y-projectile.to.y)**2/(.7*.7)<=bullet.damage_radius**2):projectile.target?[projectile.target]:[]
      for(const enemy of targets) {
        if(enemy.hp<=0 || enemy.escapedAt!==undefined)continue
        if(!projectile.motion&&!bullet.damage_radius&&enemy.smokeDodgeUntil!==undefined&&time<=enemy.smokeDodgeUntil&&!enemy.template.unit.is_stunned)continue
        if(projectile.motion && (!projectile.tracking||!enemies.includes(enemy)))continue
        if(!projectile.motion && !bullet.damage_radius && Math.hypot(enemy.path.position.x+enemy.template.unit.hit_offset.x-projectile.to.x,enemy.path.position.y+enemy.template.unit.hit_offset.y-projectile.to.y)>(bullet.hit_distance??30))continue
        let reduceMagicArmor=bullet.reduce_magic_armor
        if(projectile.motion&&(bullet.chance_to_ignore_mr??0)<this.random())reduceMagicArmor=0
        const raw=projectile.bombMotion&&!bullet.damage_decay_random?0:projectile.fixedDamage!==undefined?Math.max(1,Math.ceil(projectile.fixedDamage*(projectile.damageFactor??bullet.damage_factor))):bulletDamageValue(projectile.damageMin??bullet.damage_min,projectile.damageMax??bullet.damage_max,projectile.damageFactor??bullet.damage_factor,this.random)
        this.queueHit({enemy,bullet:projectile.bombMotion?undefined:bullet,damage:{value:projectile.bombMotion&&!bullet.damage_decay_random?catapultDamage(projectile.damageMin??bullet.damage_min,projectile.damageMax??bullet.damage_max,projectile.damageFactor??bullet.damage_factor,enemy.path.position,projectile.to,bullet.damage_radius):raw,damage_type:bullet.damage_type,reduce_armor:bullet.reduce_armor,reduce_magic_armor:reduceMagicArmor,explosive_factor:bullet.explosive_factor}})
        if(bullet.mod==='mod_firebook_aura')this.firebook.queue(enemy,projectile.level??1)
      }
      if(projectile.bombMotion)this.dodges?.showAt(projectile.pos,time,bullet.pop,bullet.pop_chance)
      const water=!!(this.cellAt(projectile.to)&2),hitFx=water&&bullet.hit_fx_water?bullet.hit_fx_water:bullet.hit_fx
      if(hitFx)this.effect(hitFx,projectile.to,time)
      if(bullet.hit_decal&&!water)this.effect(bullet.hit_decal,projectile.to,time)
      const hitSound=(!projectile.bombMotion||hitFx)?this.templates[projectile.name].sound_events?.[water&&bullet.hit_fx_water?'hit_water':'hit']:undefined;if(hitSound)this.onSound(hitSound)
      if(bullet.hit_payload==='aura_wizard_skill_c')this.onCopiesLanded({...projectile.to},projectile.level??1,time)
      if(bullet.hit_payload==='aura_catapult_skill_c_trap')this.catapultTraps.queue(projectile.to,projectile.level!,projectile.source)
      if(bullet.hit_payload==='aura_catapult_skill_a')this.catapultTar.queue(projectile.to,projectile.level!)
      if(bullet.hit_payload==='aura_catapult_skill_b_bomb')this.catapultBombs.queue(projectile.to,projectile.level!)
    }
  }
  /** Native particle_system is after all main scripts. Keep the just-finished
   * projectile snapshot through this phase; its native removal is next tick. */
  advanceParticles(time:number){this.firebookTrails.advance(time,this.particleSources);this.particleSources=[]}
  /** The tower triggers a child; the child's own main coroutine performs the windup. */
  private archer(site:TowerSite,template:CombatTemplate,attack:Attack,state:ShootingState,time:number,enemies:EnemyInstance[]) {
    const t=template as ArcherTemplate
    if(state.archerTs===undefined){
      state.archerTs=time-attack.cooldown+Math.round(template.attacks!.attack_delay_on_spawn*30)/30;state.archers=new Map();state.shooterIndex=0
      for(const [index,sid] of t.shooters_sids.entries()){
        const c:ArcherState={site,key:site.tower!,instance:site.instance??0,createdAt:time,sid,shooterId:index,startedAt:time,back:false,flipX:false,pending:false,predPos:{x:1024,y:0},initialized:false,idleTs:0,idleCooldown:0,phase:'idle',animation:'idle',loop:false}
        state.archers.set(sid,c);this.archerControllers.add(c);this.onQueueArcherController(c)
      }
    }
    if(site.tower==='tower_archers_lvl4'&&this.archerMarkCaster&&((site.powerLevels?.skill_c??0)>0||this.archerMarkCaster.states.has(site.id))){
      const c=(template as unknown as {timed_attacks:{list:{vis_flags:number;vis_bans:number;min_hp:number}[]}}).timed_attacks.list[1]
      if(this.archerMarkCaster.advance(site,time,()=>this.archerTargets(site,template,{...attack,vis_flags:c.vis_flags,vis_bans:c.vis_bans},enemies).find(e=>e.hp>=c.min_hp)))return
    }
    if(time-state.archerTs>attack.cooldown) {
      const target=this.archerTargets(site,template,attack,enemies)[0]
      if(target) {
        state.archerTs=time;state.shooterIndex=(state.shooterIndex!+1)%t.shooters_sids.length
        const c=state.archers!.get(t.shooters_sids[state.shooterIndex])!
        c.pending=true;c.target=target;c.targetId=target.id;c.predPos={...target.path.position}
      }else state.archerTs=time-attack.cooldown+10/30-1e-6
    }
  }
  private archerTargets(site:TowerSite,t:CombatTemplate,a:Attack,enemies:EnemyInstance[],forecast?:number){
    const o=t.tower!.range_offset,origin={x:site.pos.x+o.x,y:site.pos.y+o.y},range=t.attacks!.range*(site.rangeFactor??1)
    return luaSort(this.enemyCandidates(enemies,origin,range+(forecast===undefined?0:forecast*150)).filter(e=>{
      if(e.hp<=0||e.escapedAt!==undefined||e.path.finished||!this.targetValid(e)||((e.frozen?4096:e.template.vis.flags)&(site.attackBansOverride??a.vis_bans))||(e.template.vis.bans&a.vis_flags))return false
      const p=forecast===undefined?{pos:e.path.position,valid:true}:this.predictTarget(e,forecast)
      return p.valid&&(p.pos.x-origin.x)**2+(p.pos.y-origin.y)**2/(.7*.7)<=range*range
    }),(a,b)=>a.path.remainingNodes<b.path.remainingNodes)
  }
  removeArcherControllers(site:TowerSite,key:string){for(const c of this.archerControllers)if(c.site===site&&c.key===key){c.removed=true;this.onRemoveArcherController(c);this.archerControllers.delete(c)}}
  advanceArcherController(c:ArcherState,time:number,enemies:EnemyInstance[]){
    if(c.removed)return
    const t=this.templates[c.key],a={...t.attacks!.list[0],bullet:this.bulletOverrides.get(c.site.id)??t.attacks!.list[0].bullet},idle=t.tower!.long_idle_cooldown??3
    if(!c.initialized){c.initialized=true;c.idleCooldown=idle+this.random();c.idleTs=time-c.idleCooldown}
    const animate=()=>{const f=archerGeometry(c.site.pos,t as ArcherTemplate,c.sid,c.predPos);c.back=f.back;c.flipX=f.flipX;c.animation='shoot';c.loop=false}
    if(c.phase==='idle'&&c.pending){c.pending=false;c.phase='windup';c.startedAt=time;animate()}
    if(c.phase==='windup'){
      if(time-c.startedAt<Math.round(a.shoot_time*30)/30)return
      const selected=this.archerTargets(c.site,t,a,enemies,10/30)[0],enemy=selected??c.target!
      if(selected){c.predPos=selected.path.position;animate()}
      const b=this.templates[a.bullet].bullet!,from=archerGeometry(c.site.pos,t as ArcherTemplate,c.sid,c.predPos).from,offset=enemy.template.unit.hit_offset
      let factor=(t.tower?.damage_factor??1)*(c.site.damageFactor??1),reduceArmor=b.reduce_armor
      if(b.critical_chance!==undefined&&this.random()<b.critical_chance){factor*=2;if(b.crit_ignores_armor)reduceArmor=1}
      const shot:ArrowShot={name:a.bullet,from,to:{x:c.predPos.x+offset.x,y:c.predPos.y+offset.y},target:enemy,predict:!!selected,factor,reduceArmor,queuedAt:time}
      this.pendingArrows.set(shot,shot);this.onQueueProjectile(shot,a.bullet,time);c.phase='animation'
    }
    if(c.phase==='animation'){
      if(nativeLogicAnimationFrame(28,time,c.startedAt,false,30).runs===0)return
      c.idleTs=time;c.phase='idle'
    }
    if(c.idleCooldown<time-c.idleTs){
      c.idleTs=time;c.idleCooldown=idle+this.random()
      const pos=t.tower!.long_idle_pos?.[c.shooterId]??{x:1024,y:0}
      c.animation='idle';c.loop=true;c.back=pos.y>c.site.pos.y;c.flipX=pos.x<c.site.pos.x
      // animation_start(loop=true) preserves the previous native sprite clock.
    }
  }
  /** Deferred motion models are materialized below the insertion flush; their
   * sound belongs to the original queue position, ahead of main scripts. */
  pendingProjectileInsertSound(model:object,enemies:EnemyInstance[]):string|undefined {
    const copy=this.pendingCopies.get(model);if(copy){const target=enemies.find(e=>e.id===copy.targetId);return target&&this.projectileTargetPresent(target,enemies)?this.templates[copy.name].sound_events?.insert:undefined}
    const wizard=this.pendingWizardShots.find(shot=>shot===model)
    if(wizard){const target=enemies.find(e=>e.id===wizard.targetId);return target&&!(target.template.vis.bans&2)?this.templates[wizard.name].sound_events?.insert:undefined}
    const shot=this.pendingCatapultShots.find(shot=>shot===model)
    return shot?this.templates[shot.name].sound_events?.insert:undefined
  }
  /** Called inside the registry insertion flush, before any main script or SSO update. */
  insertArrow(model:object,time:number,enemies:EnemyInstance[]):boolean|undefined{
    const shard=this.pendingWizardShots.find(s=>s===model&&s.plain)
    if(shard&&shard.targetId!==undefined&&!enemies.some(e=>e.id===shard.targetId&&!(e.template.vis.bans&2))){this.pendingWizardShots.splice(this.pendingWizardShots.indexOf(shard),1);return false}
    const wizard=this.pendingWizardShots.find(s=>s===model)
    if(wizard){
      this.pendingWizardShots.splice(this.pendingWizardShots.indexOf(wizard),1)
      const shot=wizard
      const target=enemies.find(e=>e.id===shot.targetId);if(shot.targetId!==undefined&&(!target||target.template.vis.bans&2))return false
      const bullet=this.templates[shot.name],config:BoltMotionConfig=shot.plain?bullet as BoltMotionConfig:{...bullet,force_motion:{...bullet.force_motion!,v:{...bullet.force_motion!.v,x:100*shot.sign},a:{...bullet.force_motion!.a}},initial_impulse_angle_abs:bullet.initial_impulse_angle_abs!-Math.PI/4*shot.sign}
      this.projectiles.push({id:this.nextId++,name:shot.name,born:time,duration:0,from:shot.from,to:shot.to,pos:{...shot.from},target,done:false,rotation:Math.atan2(shot.to.y-shot.from.y,shot.to.x-shot.from.x),damageMin:shot.damageMin,damageMax:shot.damageMax,damageFactor:shot.factor,motion:new BoltMotion(config,shot.from,shot.to),trajectoryLastPos:{...shot.from},tracking:!!target})
      this.onInsertProjectile(shot,this.projectiles.at(-1)!)
      if(bullet.bullet?.particles_name==='ps_tower_wizard_bolt_trail')this.firebookTrails.queue(this.projectiles.at(-1)!,time,'wizard')
      const sound=bullet.sound_events?.insert;if(sound&&!this.deferProjectileInsertSound)this.onSound(sound)
      return true
    }
    const catapult=this.pendingCatapultShots.find(s=>s===model)
    if(catapult){
      this.pendingCatapultShots.splice(this.pendingCatapultShots.indexOf(catapult),1)
      const shot=catapult
      const template=this.templates[shot.name],b=shot.name==='bullet_catapult_skill_c'?{...template.bullet!,flight_time:Math.round(template.bullet!.flight_time*30)/30}:template.bullet!,motion=new CatapultMotion(shot.from,shot.to,b,(this.random()-.5)*Math.PI)
      this.projectiles.push({id:this.nextId++,name:shot.name,born:time,duration:b.flight_time,from:shot.from,to:shot.to,pos:{...shot.from},done:false,rotation:0,bombMotion:motion,damageFactor:shot.factor,level:shot.level,source:shot.source,damageMin:shot.damageMin,damageMax:shot.damageMax})
      this.onInsertProjectile(shot,this.projectiles.at(-1)!)
      if(b.particles_name==='ps_firebook_wizard')this.firebookTrails.queue(this.projectiles.at(-1)!,time)
      else if(b.particles_name==='ps_skill_c_wizard_1')this.firebookTrails.queue(this.projectiles.at(-1)!,time,'copies')
      else if(b.particles_name==='ps_catapult')this.firebookTrails.queue(this.projectiles.at(-1)!,time,'catapult')
      const sound=template.sound_events?.insert;if(sound&&!this.deferProjectileInsertSound)this.onSound(sound)
      return true
    }
    const copy=this.pendingCopies.get(model)
    if(copy){
      this.pendingCopies.delete(model);const target=enemies.find(e=>e.id===copy.targetId)
      if(!target||!this.projectileTargetPresent(target,enemies))return false
      const b=this.templates[copy.name].bullet!,velocity=target.motionSpeed??{x:0,y:0},motion=new WizardBookMotion(copy.from,copy.to,velocity,{...b,hit_distance:b.hit_distance??22},this.random)
      const p:Projectile={id:this.nextId++,name:copy.name,born:time,duration:motion.duration,from:copy.from,to:motion.aim,pos:{...copy.from},target,done:false,rotation:0,arrowMotion:motion,level:copy.level,damageMin:copy.min,damageMax:copy.max,damageFactor:1}
      this.projectiles.push(p);this.onInsertProjectile(model,p);this.firebookTrails.queue(p,time,'copies');const sound=this.templates[copy.name].sound_events?.insert;if(sound&&!this.deferProjectileInsertSound)this.onSound(sound);return true
    }
    const shot=this.pendingArrows.get(model);if(!shot)return
    this.pendingArrows.delete(model)
    if(!this.projectileTargetPresent(shot.target,enemies))return false
    const b=this.templates[shot.name].bullet!,enemy=shot.target
    const velocity=enemy.motionSpeed??(enemy.blocked||enemy.meleeHolding||enemy.frozen||enemy.rangedHolding||enemy.skillLocked?{x:0,y:0}:{x:enemy.path.direction.x*enemy.template.motion.max_speed,y:enemy.path.direction.y*enemy.template.motion.max_speed})
    const {to}=towerArrowAim(shot.to,velocity,{...b,fixed_height:b.fixed_height!,predict_target_pos:shot.predict},this.random)
    const arrowMotion=new EnemyArrowMotion(shot.from,to,{...b,fixed_height:b.fixed_height!,hit_distance:b.hit_distance??30})
    const p:Projectile={id:this.nextId++,name:shot.name,born:time,duration:arrowMotion.duration,from:shot.from,to,pos:{...shot.from},target:enemy,done:false,rotation:0,arrowMotion,damageFactor:shot.factor,reduceArmor:shot.reduceArmor,fixedDamage:this.damageOverrides.get(shot.name)}
    this.projectiles.push(p);this.onInsertProjectile(shot,p)
    const sound=this.templates[shot.name].sound_events?.insert;if(sound)this.onSound(sound)
    return true
  }
  private resolveArrow(p:Projectile,b:NonNullable<CombatTemplate['bullet']>,time:number,enemies:EnemyInstance[]) {
    const e=p.target!,offset=e.template.unit.hit_offset,hitPos={x:e.path.position.x+offset.x,y:e.path.position.y+offset.y}
    const eligible=this.projectileTargetPresent(e,enemies)&&e.hp>0&&e.escapedAt===undefined&&Math.hypot(p.pos.x-hitPos.x,p.pos.y-hitPos.y)<(b.hit_distance??30)
    const dodge=eligible&&(this.dodges?this.dodges.checkEnemy(e,time,true):e.smokeDodgeUntil!==undefined&&time<=e.smokeDodgeUntil&&!e.template.unit.is_stunned)
    const hit=eligible&&!dodge
    if(hit) {
      const factor=p.damageFactor??b.damage_factor,raw=p.fixedDamage!==undefined?Math.max(1,Math.ceil(p.fixedDamage*factor)):bulletDamageValue(p.damageMin??b.damage_min,p.damageMax??b.damage_max,factor,this.random)
      this.queueHit({enemy:e,bullet:b,damage:{value:raw,damage_type:b.damage_type,reduce_armor:p.reduceArmor??b.reduce_armor,reduce_magic_armor:b.reduce_magic_armor}})
      if(b.hit_fx)this.effect(b.hit_fx,hitPos,time)
      if(b.hit_blood_fx && e.template.unit.blood_color!=='none'){this.effect(b.hit_blood_fx,hitPos,time,{rotation:p.rotation,bloodColor:e.template.unit.blood_color});const bloodSound=this.templates[b.hit_blood_fx]?.sound_events?.insert;if(bloodSound)this.onSound(bloodSound)}
    }
    // Original arrow.update creates dodge pop and requests hit sound before
    // allocating miss FX/decal; their entity IDs affect later Lua table order.
    if(this.projectileTargetPresent(e,enemies)&&e.hp>0&&e.dodge?.active&&e.dodge.show_pop)this.dodges?.show(e,time)
    const sound=this.templates[p.name].sound_events?.hit;if(sound)this.onSound(sound)
    if(!hit){
      if(this.cellAt(p.pos)&2){if(b.miss_fx_water)this.effect(b.miss_fx_water,p.to,time)}
      else if(b.miss_decal && this.cellAt(p.to)&2049)this.effect(b.miss_decal,p.to,time,{flipX:p.pos.x<p.from.x})
    }
  }
}
