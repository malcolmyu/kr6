import {BolinMinesRenderer} from './BolinMinesRenderer.ts'
import {BolinMortarRenderer} from './BolinMortarRenderer.ts'
import {BolinRenderer} from './BolinRenderer.ts'
import {CulverineThrottleRenderer} from './CulverineThrottleRenderer.ts'
import {CulverineNativeRenderer} from './CulverineNativeRenderer'
import {ReinforcementSpecialRenderer} from './ReinforcementSpecialRenderer'
import {KnightArmorRenderer} from './KnightArmorRenderer'
import {ArcherMarkRenderer} from './ArcherMarkRenderer'
import {WizardCopiesRenderer} from './WizardCopiesRenderer'
import {HeroLifeRenderer} from './HeroLifeRenderer'
import {StaticEffectRenderer} from './StaticEffectRenderer'
import {BloodRenderer} from './BloodRenderer'
import {buyAvailableSprite,buyAvailablePulse} from './BuyAvailable.ts'
import {FishingRenderer} from './FishingRenderer.ts'
import type {GlobalUpgradeSelection} from './GlobalUpgrades'
import {WizardEmpowerRenderer} from './WizardEmpowerRenderer'
import {ArcherRangeRenderer} from './ArcherRangeRenderer'
import {WizardFirebookRenderer} from './WizardFirebookRenderer'
import {DodgeRenderer} from './DodgeRenderer'
import {ZefiraSkillsRenderer} from './ZefiraSkillsRenderer'
import {GeraldSkillsRenderer} from './GeraldSkillsRenderer'
import {RoyalEdictRenderer} from './RoyalEdictRenderer'
import {CatapultTrapsRenderer} from './CatapultTrapsRenderer'
import {CatapultTarRenderer} from './CatapultTarRenderer'
import {CatapultBombRenderer} from './CatapultBombRenderer'
import {RainRenderer} from './RainRenderer'
import type {PowerKind} from './PowerSystem'
import type {PowerUpgradeSelection} from './PowerUpgrades'
import {nativeAnimationFrame} from './NativeAnimation'
import {nativePainterSort,nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder.ts'
import {HealthBarRenderer} from './HealthBarRenderer'
import * as THREE from 'three'
import type { GameMode, LevelData } from './types'
import { GameSession } from './GameSession'
import { SpriteAtlas } from './SpriteAtlas'
import type { AtlasSprite, Animation } from './SpriteAtlas'
import { ExoSprite } from './ExoSprite'
import type { ExoDefinition } from './ExoSprite'
import type { TowerTemplate, TowerSite } from './TowerSystem'
import {applyStageSetup} from './StageSetup'
import {EnvironmentRenderer} from './EnvironmentRenderer'
import {WorldCamera} from './WorldCamera'
import type {CameraRequest} from './TutorialState'

/** Original coordinates are y-up, in logical (half-texture-resolution) pixels. */
export class WorldRenderer {
  /** Keep simulation randomness independent from presentation/audio randomness. */
  sessionRandom:()=>number=Math.random
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private culverineThrottleRenderer?:CulverineThrottleRenderer
  private culverineNativeRenderer?:CulverineNativeRenderer
  private reinforcementSpecialRenderer?:ReinforcementSpecialRenderer
  private knightArmorRenderer?:KnightArmorRenderer
  private wizardEmpowerRenderer?:WizardEmpowerRenderer
  private archerRangeRenderer?:ArcherRangeRenderer
  private royalRenderer?:RoyalEdictRenderer
  private rainRenderer?:RainRenderer
  private bolinRenderer?:BolinRenderer
  private bolinMortarRenderer?:BolinMortarRenderer
  private bolinMinesRenderer?:BolinMinesRenderer
  private catapultBombRenderer?:CatapultBombRenderer
  private catapultTarRenderer?:CatapultTarRenderer
  private catapultTrapsRenderer?:CatapultTrapsRenderer
  private zefiraSkillsRenderer?:ZefiraSkillsRenderer
  private archerMarkRenderer?:ArcherMarkRenderer
  private copiesRenderer?:WizardCopiesRenderer
  private firebookRenderer?:WizardFirebookRenderer
  private dodgeRenderer?:DodgeRenderer
  private geraldSkillsRenderer?:GeraldSkillsRenderer
  private healthBars=new HealthBarRenderer(this.scene)
  private camera = new THREE.OrthographicCamera(-512/3, 1024+512/3, 768, 0, .1, 100)
  private cameraRig=new WorldCamera(768*16/9)
  private lastCameraRequest?:CameraRequest
  private observer: ResizeObserver
  private resources: { dispose(): void }[] = []
  private disposed = false
  private generation = 0
  session?: GameSession
  private atlas?: SpriteAtlas
  private animations: Record<string,Animation> = {}
  private sprites = new Map<number,AtlasSprite>()
  private smokeSprites=new Map<string,AtlasSprite>()
  private smokeDodgeSprites=new Map<number,AtlasSprite>()
  private enemyShadows=new Map<number,AtlasSprite>()
  private heroLifeRenderer?:HeroLifeRenderer
  private soldierSprites=new Map<number,AtlasSprite|ExoSprite>()
  private reinforcementBuffSprites=new Map<number,AtlasSprite>()
  private heroIntroParts:{art:ExoSprite;animation:string}[]=[]
  rallySelected?:string
  private rallyCircle?:AtlasSprite
  heroSelected=false
  private meteorSprites=new Map<number,{art:AtlasSprite;shadow:AtlasSprite}>()
  private staticEffectRenderer?:StaticEffectRenderer
  private bloodRenderer?:BloodRenderer
  private effects:{nativeAlpha?:()=>number;nativeFps?:number;model?:GameSession['nativeEffects'][number];art:AtlasSprite|ExoSprite;animation?:Animation;exoAnimation?:string;born:number;duration:number;anchor:{x:number;y:number};fade?:boolean;fadeAfter?:number}[]=[]
  private tutorialIndicator:{art:AtlasSprite;config:TowerTemplate['render']['sprites'][number]}[]=[]
  private tutorialIndicatorBorn=0
  private tutorialIndicatorVisible=false
  get viewportHeight(){return this.container.clientHeight}
  get cameraZoom(){return this.cameraRig.pose.zoom}
  private projectileSprites=new Map<number,AtlasSprite|ExoSprite>()
  private previousTime = 0
  onChange: () => void = () => {}
  onSound:(name:string,options?:{delay?:number})=>void=()=>{}
  onStopSound:(name:string)=>void=()=>{}
  onSiteSelect: (site:TowerSite|undefined)=>void=()=>{}
  projectPoint(point:{x:number;y:number}):{x:number;y:number} {
    const v=new THREE.Vector3(point.x,point.y,0).project(this.camera)
    return {x:(v.x+1)*50,y:(1-v.y)*50}
  }
  private towerAtlas?:SpriteAtlas
  private environment?:EnvironmentRenderer
  private fishingRenderer?:FishingRenderer
  private towerArt?:{exos:Record<string,ExoDefinition>;animations:Record<string,Animation>}
  private templates:Record<string,TowerTemplate>={}
  private towerVisuals=new Map<string,{key:string;root:THREE.Group;parts:{config:TowerTemplate['render']['sprites'][number];art:AtlasSprite|ExoSprite;update?:(time:number)=>void}[]}>()
  private buyIndicators=new Map<string,AtlasSprite>()
  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setTransparentSort(nativePainterSort)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.container.appendChild(this.renderer.domElement)
    this.renderer.domElement.addEventListener('pointerdown',event=>{
      const rect=this.renderer.domElement.getBoundingClientRect()
      const x=this.camera.left+(event.clientX-rect.left)/rect.width*(this.camera.right-this.camera.left),y=this.camera.top-(event.clientY-rect.top)/rect.height*(this.camera.top-this.camera.bottom)
      if(this.session?.cinematic || this.session?.paused || this.session?.outcome)return
      if(this.session?.tutorial?.inputLocked)return
      if(this.rallySelected){if(this.session?.setRally(this.rallySelected,{x,y}))this.cancelRally();return}
      if(this.heroSelected && this.session?.heroes.moveSelected({x,y})){this.heroSelected=false;return}
      const hero=this.session?.heroes.team.find(h=>h.hp>0&&Math.hypot(h.pos.x-x,h.pos.y-y)<25)
      if(hero){this.selectHero(hero.id);return}
      if(this.session?.powers.selected){if(!this.session.paused&&!this.session.outcome&&this.session.powers.cast({x,y},this.session.time)){this.session.tutorial?.closeMenu();this.onSiteSelect(undefined)}return}
      if(this.session?.fishing.click({x,y}))return
      if(this.session?.creatures.click({x,y}))return
      const site=this.session?.towers.sites.find(s=>Math.hypot(s.pos.x-x,s.pos.y-y)<35)
      if(site && this.session?.tutorial && !this.session.tutorial.canSelect(site))return
      if(this.session?.tutorial){if(site)this.session.tutorial.openMenu(site);else this.session.tutorial.closeMenu()}
      this.onSiteSelect(site)
    })
    this.camera.position.z = 10
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(container)
    this.resize()
    this.renderer.setAnimationLoop(time => this.frame(time))
  }
  private resize() {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.render(this.scene, this.camera)
  }
  cancelRally(){this.rallySelected=undefined;this.rallyCircle?.dispose();this.rallyCircle=undefined}
  selectRally(id:string){
    const range=this.session?.rallyRange(id);if(!range || !this.towerAtlas || this.session?.paused || this.session?.cinematic)return
    this.cancelRally();this.rallySelected=id;this.heroSelected=false;this.session!.powers.selected=undefined;this.onSiteSelect(undefined)
    const art=this.towerAtlas.create(),radius=(this.templates.decal_rally_range_KR5 as TowerTemplate&{actual_radius:number}).actual_radius
    art.setFrame('rally_circle_full',{x:.5,y:.5});art.root.scale.set(range.radius/radius,range.radius/radius*.7,1)
    art.root.position.set(range.pos.x,range.pos.y,2);art.setOrder(3500);this.scene.add(art.root);this.rallyCircle=art
  }
  selectHero(id:number) {
    const session=this.session,hero=session?.heroes.team.find(h=>h.id===id&&h.hp>0)
    if(!session || !hero || session.paused || session.cinematic || session.outcome)return
    this.cancelRally()
    this.heroSelected=!(this.heroSelected && session.heroes.selectedId===id);session.heroes.selectedId=id
    session.powers.selected=undefined;session.tutorial?.closeMenu();this.onSiteSelect(undefined)
  }
  onLoadProgress:(value:number)=>void=()=>{}
  async load(level: number, mode: GameMode = 'campaign',firstCampaignComplete=false,stageComplete=false,restarted=false,heroXp:Record<string,number>={},playerLevel=0,selectedPowers:PowerKind[]=['reinforcements','rain_of_fire'],heroUpgrades:Record<string,string[]>={},selectedTowers:import('./TowerSystem').TowerKind[]=['archers','knights','catapult'],onboarding:{stage1?:true;stage2?:true}={},powerXp:Partial<Record<PowerKind,number>>={},powerUpgrades:PowerUpgradeSelection={},globalUpgrades:GlobalUpgradeSelection={},selectedHeroes?:string[]): Promise<LevelData> {
    const generation = ++this.generation
    const prefix = `level${String(level).padStart(2, '0')}`
    const response = await fetch(`data/${prefix}.json`)
    if (!response.ok) throw new Error('无法读取关卡数据')
    const data: LevelData = await response.json()
    const manager=new THREE.LoadingManager();manager.onProgress=(_url,loaded,total)=>this.onLoadProgress(total?loaded/total:0)
    const loader = new THREE.TextureLoader(manager)
    const [texture, enemyTexture, frames, animations, templates, program,towers,stageArt,tutorialArt] = await Promise.all([
      loader.loadAsync(`assets/go_stage${String(level).padStart(2, '0')}_bg-1.png`),
      loader.loadAsync('assets/go_enemies_T1-1.png'),
      this.json('data/enemies-atlas.json'), this.json('data/enemies-animations.json'),
      this.json('data/entities.json'), this.json(`data/${prefix}-${mode}.json`),this.json('data/towers-art.json'),this.json(`data/${prefix}-art.json`),this.json('data/tutorial.json')
    ])
    const towerArt={atlas:{...towers.atlas,...stageArt.atlas},exos:{...towers.exos,...stageArt.exos},animations:{...towers.animations,...stageArt.animations},textures:[...new Set<string>([...towers.textures,...stageArt.textures])]}
    const towerTextures:Record<string,THREE.Texture>={}
    await Promise.all(towerArt.textures.map(async(name:string)=>{towerTextures[name]=await loader.loadAsync(`assets/${name}`)}))
    if (this.disposed || generation !== this.generation) { texture.dispose(); enemyTexture.dispose();Object.values(towerTextures).forEach(t=>t.dispose()); return data }
    this.clear()
    texture.colorSpace = THREE.SRGBColorSpace
    const geometry = new THREE.PlaneGeometry(texture.image.width / 2, texture.image.height / 2)
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    const mesh = new THREE.Mesh(geometry, material)
    const background = data.data.entities_list.find(e => e.template === 'decal_background')
    mesh.position.set(background?.pos?.x ?? 512, background?.pos?.y ?? 384, 0)
    this.resources.push(texture, material, geometry)
    this.scene.add(mesh)
    this.atlas = new SpriteAtlas(frames, {'go_enemies_T1-1.png':enemyTexture})
    this.animations = animations
    this.resources.push(this.atlas,enemyTexture)
    this.towerAtlas=new SpriteAtlas(towerArt.atlas,towerTextures)
    this.towerArt=towerArt;this.templates=templates
    this.templates.stage_01_tower_build_indicator=tutorialArt.buildIndicator
    this.resources.push(this.towerAtlas,...Object.values(towerTextures))
    this.session = new GameSession(data,program,templates,this.sessionRandom,mode,selectedTowers,powerUpgrades,globalUpgrades)
    this.session.heroes.selectedTeam=selectedHeroes
    const heroExo:ExoDefinition=towerArt.exos.hero_geraldDef
    this.session.heroes.respawnDuration=heroExo.animations.find(a=>a.name==='level_up')!.frames.length/heroExo.fps
    this.session.powers.equip(selectedPowers)
    this.royalRenderer=new RoyalEdictRenderer(this.scene,this.towerAtlas,towerArt.exos)
    this.rainRenderer=new RainRenderer(this.scene,this.towerAtlas)
    this.bolinMinesRenderer=new BolinMinesRenderer(this.scene,this.towerAtlas,towerArt.exos,templates)
    this.bolinMortarRenderer=new BolinMortarRenderer(this.scene,this.towerAtlas,towerArt.exos,towerArt.animations,templates)
    this.bolinRenderer=new BolinRenderer(this.scene,this.towerAtlas,towerArt.exos,towerArt.animations,templates)
    this.catapultBombRenderer=new CatapultBombRenderer(this.scene,this.towerAtlas,towerArt.animations)
    this.catapultTarRenderer=new CatapultTarRenderer(this.scene,this.towerAtlas,towerArt.animations)
    this.catapultTrapsRenderer=new CatapultTrapsRenderer(this.scene,this.towerAtlas,towerArt.animations)
    this.heroLifeRenderer=new HeroLifeRenderer(this.scene,this.towerAtlas,towerArt.exos)
    this.zefiraSkillsRenderer=new ZefiraSkillsRenderer(this.scene,this.towerAtlas,towerArt.exos,towerArt.animations)
    this.culverineThrottleRenderer=new CulverineThrottleRenderer(this.scene,this.towerAtlas,towerArt.exos,templates)
    this.culverineNativeRenderer=new CulverineNativeRenderer(this.scene,this.towerAtlas,towerArt.animations,templates)
    this.reinforcementSpecialRenderer=new ReinforcementSpecialRenderer(this.scene,this.towerAtlas,towerArt.animations,templates)
    this.knightArmorRenderer=new KnightArmorRenderer(this.scene,this.towerAtlas)
    this.wizardEmpowerRenderer=new WizardEmpowerRenderer(this.scene,this.towerAtlas,towerArt.exos,templates)
    this.archerRangeRenderer=new ArcherRangeRenderer(this.scene,this.towerAtlas,towerArt.exos,this.templates)
    this.archerMarkRenderer=new ArcherMarkRenderer(this.scene,this.towerAtlas,towerArt.exos.archer_markDef,templates.mod_archers_skill_c_weak.render.sprites[0])
    this.copiesRenderer=new WizardCopiesRenderer(this.scene,this.towerAtlas,this.towerArt!.animations,templates.aura_wizard_skill_c.render.sprites[0])
    this.firebookRenderer=new WizardFirebookRenderer(this.scene,this.towerAtlas,this.towerArt!.animations,templates.mod_firebook_aura.render.sprites[0])
    this.staticEffectRenderer=new StaticEffectRenderer(this.scene,this.towerAtlas,towerArt.exos)
    this.bloodRenderer=new BloodRenderer(this.scene,this.towerAtlas,towerArt.animations,templates)
    this.dodgeRenderer=new DodgeRenderer(this.scene,this.towerAtlas)
    this.geraldSkillsRenderer=new GeraldSkillsRenderer(this.scene,this.towerAtlas,towerArt.exos)
    this.session.heroes.savedUpgrades=structuredClone(heroUpgrades);this.session.heroes.savedXp={...heroXp};this.session.heroes.playerLevel=playerLevel
    this.session.powers.progression.configure(powerXp,playerLevel,mode==='campaign'?1:3)
    applyStageSetup(this.session,level,mode,firstCampaignComplete,stageComplete,restarted,onboarding)
    this.environment=new EnvironmentRenderer(this.scene,this.towerAtlas,towerArt.animations,towerArt.exos,templates,data,mode,Math.random,this.session.creatures)
    this.fishingRenderer=new FishingRenderer(this.scene,this.towerAtlas,towerArt.exos)
    this.session.onSound=(name,options)=>this.onSound(name,options)
    this.session.onStopSound=name=>this.onStopSound(name)
    this.session.combat.onEffect=(name,pos,time,transform)=>{
      if(this.session!.staticEffects.models.some(m=>m.name===name&&m.at===time&&m.pos.x===pos.x&&m.pos.y===pos.y))return
      const model=this.session!.nativeEffects.find(m=>m.name===name&&m.at===time&&m.pos.x===pos.x&&m.pos.y===pos.y&&!this.effects.some(e=>e.model===m))
      const entry=this.templates[name] as TowerTemplate&{use_blood_color?:boolean}
      const baseConfig=entry?.render.sprites[0]
      const config=transform?.animationName?{...baseConfig,name:transform.animationName}:entry?.use_blood_color&&transform?.bloodColor?{...baseConfig,name:transform.bloodColor}:baseConfig
      if(!config)return
      const tween=(this.templates[name] as TowerTemplate&{tween?:{props:{name:string;keys:number[][]}[]}})?.tween?.props.find(p=>p.name==='alpha')?.keys
      if(config.exo) {
        const art=new ExoSprite(this.towerAtlas!,this.towerArt!.exos[config.prefix!])
        art.root.position.set(pos.x+config.offset.x,pos.y+config.offset.y,2);art.setOrder(11000-pos.y)
        if(config.scale)art.root.scale.set(config.scale.x,config.scale.y,1)
        if(transform?.flipX)art.root.scale.x*=-1;if(transform?.rotation!==undefined)art.root.rotation.z=transform.rotation
        art.root.visible=!model;this.scene.add(art.root);this.effects.push({nativeFps:model?(config.fps??this.towerArt!.exos[config.prefix!].fps):undefined,model,art,exoAnimation:config.name,born:time,duration:tween?.at(-1)?.[0]??art.duration(config.name),anchor:config.anchor,fade:!!tween,fadeAfter:tween?.at(-2)?.[0]});return
      }
      const animation=config.animated===false?undefined:this.towerArt!.animations[config.prefix?`${config.prefix}_${config.name}`:config.name]
      if(!animation && !name.startsWith('decal_power_rain_of_fire') && name!=='decal_bomb_crater_KR5')return
      const art=this.towerAtlas!.create()
      if(!animation)art.setFrame(config.name,config.anchor)
      if(config.scale)art.root.scale.set(config.scale.x,config.scale.y,1)
      art.root.position.set(pos.x+config.offset.x,pos.y+config.offset.y,2);art.setOrder((name==='decal_power_reinforcements_special'?9998:11000)-pos.y)
      if(transform?.flipX)art.root.scale.x*=-1;if(transform?.rotation!==undefined)art.root.rotation.z=transform.rotation
      this.scene.add(art.root)
      art.root.visible=!model;this.effects.push({nativeFps:model?(config.fps??30):undefined,model,art,animation,born:time,duration:animation?(animation.to-animation.from+1)/30:2.5,anchor:config.anchor,fade:!animation,fadeAfter:name==='decal_bomb_crater_KR5'?1:undefined})
    }
    this.session.powers.royal.onConfetti=(pos,time)=>this.session!.combat.onEffect('decal_power_royal_edict_confetti',pos,time)
    this.session.powers.onEffect=this.session.combat.onEffect
    this.session.barracks.onEffect=this.session.combat.onEffect
    this.session.heroes.ranged.onEffect=this.session.combat.onEffect
    this.session.heroes.zefiraSkills.onEffect=this.session.combat.onEffect
    this.session.heroes.geraldUltimate.onEffect=this.session.combat.onEffect
    this.session.heroes.geraldSkills.onEffect=this.session.combat.onEffect
    this.session.heroes.survivor.onEffect=this.session.combat.onEffect
    this.session.enemyTeleports.onEffect=this.session.combat.onEffect
    this.session.enemyRanged.onEffect=this.session.combat.onEffect
    this.session.enemyRanged.onMiss=(pos,rotation,time,impact,model)=>{
      const grid=data.grid,cellAt=(p:{x:number;y:number})=>{const x=Math.max(0,Math.min(grid.grid.length-1,Math.ceil((p.x-grid.ox)/16)-1)),y=Math.max(0,Math.min(grid.grid[x].length-1,Math.ceil((p.y-grid.oy)/16)-1));return grid.grid[x][y]}
      if(cellAt(impact)&2){this.session!.combat.onEffect('fx_splash_small',pos,time);return}
      if(!(cellAt(pos)&2049))return
      const art=this.towerAtlas!.create();art.setFrame('shadow_archer_arrow2',{x:.5,y:.5});art.root.position.set(pos.x,pos.y,2);art.root.rotation.z=rotation;art.setOrder(5000);this.scene.add(art.root)
      this.effects.push({model,nativeAlpha:model?()=>model.alpha/255:undefined,art,born:time,duration:2.1,anchor:{x:.5,y:.5},fade:true})
    }
    this.renderer.render(this.scene, this.camera)
    return data
  }
  private async json(path: string) {
    const response=await fetch(path)
    if (!response.ok) throw new Error(`无法读取 ${path}`)
    return response.json()
  }
  private frame(time: number) {
    const dt=this.previousTime ? Math.min((time-this.previousTime)/1000,.1) : 0
    this.previousTime=time
    const session=this.session
    if(session && this.atlas) {
      session.advance(dt)
      const request=session.tutorial?.camera??session.heroes.camera
      if(request && request!==this.lastCameraRequest){this.cameraRig.request(request,this.container.clientHeight/768);this.lastCameraRequest=request}
      this.cameraRig.advance(session.time)
      const bounds=this.cameraRig.bounds
      this.camera.left=bounds.left;this.camera.right=bounds.right;this.camera.top=bounds.top;this.camera.bottom=bounds.bottom;this.camera.updateProjectionMatrix()
      session.powers.visibleTop=bounds.top
      this.environment?.advance(session.time)
      this.fishingRenderer?.advance(session.fishing,session.time)
      this.renderTowers()
      this.renderProjectiles()
      this.renderSoldiers()
      this.heroLifeRenderer?.advance(session)
      this.renderReinforcementBuffs()
      this.renderEnemyEffects()
      this.bloodRenderer?.advance(session)
      this.staticEffectRenderer?.advance(session)
      this.healthBars.advance(session)
      this.renderPowers()
      this.rainRenderer?.advance(session)
      this.bolinRenderer?.advance(session);this.bolinMortarRenderer?.advance(session);this.bolinMinesRenderer?.advance(session)
      this.catapultBombRenderer?.advance(session)
      this.catapultTarRenderer?.advance(session)
      this.catapultTrapsRenderer?.advance(session)
      this.archerRangeRenderer?.advance(session)
      this.culverineThrottleRenderer?.advance(session,session.throttle)
      this.culverineNativeRenderer?.advance(session)
      this.reinforcementSpecialRenderer?.advance(session)
      this.knightArmorRenderer?.advance(session)
      this.wizardEmpowerRenderer?.advance(session)
      this.royalRenderer?.advance(session)
      this.zefiraSkillsRenderer?.advance(session)
      this.archerMarkRenderer?.advance(session)
      this.copiesRenderer?.advance(session)
      this.firebookRenderer?.advance(session)
      this.dodgeRenderer?.advance(session)
      this.geraldSkillsRenderer?.advance(session)
      this.renderHeroIntro()
      this.renderTutorialIndicator()
      for(let i=this.effects.length-1;i>=0;i--) {
        const effect=this.effects[i],age=session.time-effect.born
        const registered=effect.model&&session.entities?.registry.entities.get(session.entities.entity(effect.model)?.id??-1)
        if(effect.model){const m=effect.model,config=this.templates[m.name]?.render.sprites[0],offset=config?.offset??{x:0,y:0};effect.art.root.position.set(m.pos.x+offset.x,m.pos.y+offset.y,2);if(config)effect.art.setOrder(...this.nativeOrder('kind'in m&&m.kind==='miss'?{...config,z:1400}:config,m.pos,registered?.id??0))}
        if(effect.model)effect.art.root.visible=!!registered
        if(effect.model?age>0&&!registered:age>=effect.duration){effect.art.dispose();this.effects.splice(i,1)}
        else if(effect.nativeAlpha)effect.art.setOpacity(effect.nativeAlpha())
        else if(effect.art instanceof ExoSprite){if(effect.fade)effect.art.setOpacity(Math.max(0,1-Math.max(0,age-(effect.fadeAfter??0))/(effect.duration-(effect.fadeAfter??0))));effect.art.animate(effect.exoAnimation!,age,false,effect.nativeFps)}
        else if(effect.animation){
          if(effect.model){const a=effect.animation,index=nativeAnimationFrame(a.to-a.from+1,age,false,effect.nativeFps??30).frame;effect.art.setFrame(`${a.prefix}_${String(a.from+index).padStart(4,'0')}`,effect.anchor)}
          else effect.art.animate(effect.animation,age,30,effect.anchor)
        }
        else if(effect.fade)effect.art.setOpacity(effect.fadeAfter!==undefined?Math.max(0,1-Math.max(0,age-effect.fadeAfter)/(effect.duration-effect.fadeAfter)):Math.max(0,Math.min(1,(2.5-age)/1.5)))
      }
      const liveEnemyIds=new Set(session.enemies.map(e=>e.id))
      for(const enemy of session.enemies) {
        let sprite=this.sprites.get(enemy.id)
        if(!sprite) { sprite=this.atlas.create();this.sprites.set(enemy.id,sprite);this.scene.add(sprite.root) }
        const config=enemy.template.render.sprites[0]
        if(enemy.escapedAt!==undefined&&!session.entities||enemy.teleportHidden){sprite.root.visible=false;continue}
        sprite.root.visible=!enemy.deathHidden
        sprite.setOpacity((enemy.corpseAlpha??255)/255)
        if(enemy.deathHidden)continue
        sprite.root.position.set(enemy.path.position.x+config.offset.x,enemy.path.position.y+config.offset.y,1)
        sprite.setOrder(...this.nativeOrder(config,enemy.path.position,session.entities?.entity(enemy)?.id??enemy.id))
        if(enemy.diedAt!==undefined&&!enemy.deathManaged&&!enemy.visualOverride) {
          const death=this.animations[`${config.prefix}_death`]
          const elapsed=session.time-enemy.diedAt
          sprite.root.visible=elapsed<enemy.template.health.dead_lifetime
          if(death)sprite.animate(death,Math.min(elapsed,(death.to-death.from+.99)/30),30,config.anchor,enemy.path.direction.x<0)
          continue
        }
        if(enemy.visualOverride?.loop!==undefined){const v=enemy.visualOverride,a=this.animations[`${config.prefix}_${v.name}`];if(a){const frame=nativeAnimationFrame(a.to-a.from+1,session.time-v.at,v.loop!,30).frame;sprite.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,config.anchor,v.facingLeft);continue}}
        if(enemy.template.unit.is_stunned){const a=this.animations[`${config.prefix}_idle`];if(a){sprite.animate(a,session.time-(enemy.idleStartedAt??enemy.teleportAt??session.time),30,config.anchor,enemy.path.direction.x<0);continue}}
        if(enemy.teleporting){const a=this.animations[`${config.prefix}_idle`];if(a){sprite.animate(a,session.time-(enemy.teleportAt??session.time),30,config.anchor,enemy.path.direction.x<0);continue}}
        if(enemy.visualOverride){const a=this.animations[`${config.prefix}_${enemy.visualOverride.name}`];if(a){sprite.animate(a,Math.min(session.time-enemy.visualOverride.at,(a.to-a.from+.99)/30),30,config.anchor,enemy.path.direction.x<0);continue}}
        const direction=enemy.path.direction
        const angle=(Math.atan2(direction.y,direction.x)*180/Math.PI+360)%360
        const [a,b,c,d]=config.angles_custom.walk
        const facing=angle>a && angle<b ? 1 : angle>c && angle<d ? 2 : 0
        const animation=this.animations[`${config.prefix}_${config.angles.walk[facing]}`]
        if(!animation) throw new Error(`Missing walk animation ${config.prefix}`)
        const ranged=session.enemyRanged.states.get(enemy.id)
        if(ranged?.holding){const name=ranged.cycle?ranged.cycle.attack.animation:'idle',attack=this.animations[`${config.prefix}_${name}`];if(attack){const t=ranged.cycle?Math.min(session.time-ranged.cycle.startedAt,(attack.to-attack.from+.99)/30):session.time-ranged.animationAt;sprite.animate(attack,t,30,config.anchor,ranged.facingLeft);continue}}
        const melee=enemy.meleeAttack
        const fighting=melee && this.animations[`${config.prefix}_${melee.attack.animation}`]
        if(fighting)sprite.animate(fighting,Math.min(session.time-melee.startedAt,(fighting.to-fighting.from+.99)/30),30,config.anchor,session.barracks.soldiers.find(s=>s.id===melee.targetId)?.pos.x!<enemy.path.position.x)
        else if(enemy.blocked&&this.animations[`${config.prefix}_idle`])sprite.animate(this.animations[`${config.prefix}_idle`],session.time-(enemy.idleStartedAt??session.time),30,config.anchor,(session.barracks.soldiers.find(s=>s.target===enemy)?.pos.x??enemy.path.position.x)<enemy.path.position.x)
        else sprite.animate(animation,enemy.animationAge??enemy.age,30,config.anchor,direction.x<0)
      }
      for(const [id,sprite]of this.sprites)if(!liveEnemyIds.has(id)){sprite.dispose();this.sprites.delete(id)}
      this.onChange()
    }
    this.renderer.render(this.scene,this.camera)
  }
  private renderEnemyEffects(){
    const session=this.session;if(!session||!this.towerAtlas||!this.towerArt)return
    const smoke=new Set<string>(),dodge=new Set<number>(),shadows=new Set<number>()
    const config=this.templates.decal_shadow_blades_smoke.render.sprites[0],animation=this.towerArt.animations[`${config.prefix}_${config.name}`]
    for(const area of session.enemySkills.areas)for(const [index,decal]of area.decals.entries()){
      const native='kind'in decal?decal as import('./SmokeRuntime').SmokeDecal:undefined;if(native&&!native.inserted)continue
      const id=area.id+'-'+index;smoke.add(id);let art=this.smokeSprites.get(id)
      if(!art){art=this.towerAtlas.create();this.scene.add(art.root);this.smokeSprites.set(id,art)}
      art.animate(animation,session.time-decal.animationAt,30,config.anchor);art.root.position.set(decal.pos.x+config.offset.x,decal.pos.y+config.offset.y,1);art.setOrder(...this.nativeOrder(config,decal.pos,session.entities?.entity(decal)?.id??0))
      art.setOpacity(native?native.alpha/255:area.endedAt===undefined?Math.min(1,(session.time-area.born)/(1/3)):Math.max(0,1-(session.time-area.endedAt)/(1/3)))
    }
    for(const e of session.enemies){
      const shadow=e.template.render.sprites[1]
      if(shadow?.name&&!e.teleportHidden&&(e.hp>0||e.name==='enemy_crow'&&e.deathStartedAt===undefined)&&(e.escapedAt===undefined||!!session.entities)){
        shadows.add(e.id);let art=this.enemyShadows.get(e.id);if(!art){art=this.towerAtlas.create();this.scene.add(art.root);this.enemyShadows.set(e.id,art)}
        art.setFrame(shadow.name,shadow.anchor);art.root.position.set(e.path.position.x+shadow.offset.x,e.path.position.y+shadow.offset.y,1);art.root.scale.set(shadow.scale?.x??1,shadow.scale?.y??1,1);art.setOrder(...this.nativeOrder(shadow,e.path.position,session.entities?.entity(e)?.id??e.id,2))
      }
      if(session.enemySkills.defer||e.teleportHidden||e.hp<=0||e.smokeDodgeUntil===undefined||session.time>e.smokeDodgeUntil)continue
      dodge.add(e.id);let art=this.smokeDodgeSprites.get(e.id);if(!art){art=this.towerAtlas.create();this.scene.add(art.root);this.smokeDodgeSprites.set(e.id,art)}
      const config=this.templates.mod_shadow_blades_smoke.render.sprites[0],offset=e.template.unit.mod_offset??{x:0,y:0}
      art.animate(this.towerArt.animations[`${config.prefix}_${config.name}`],session.time-(e.smokeDodgeVisualAt??0),30,config.anchor);art.root.position.set(e.path.position.x+offset.x,e.path.position.y+offset.y,1);art.setOrder(10000-e.path.position.y+.005)
    }
    for(const [e,m]of session.enemySkills.runtime.modifiers){
      if(e.teleportHidden)continue
      dodge.add(e.id);let art=this.smokeDodgeSprites.get(e.id);if(!art){art=this.towerAtlas.create();this.scene.add(art.root);this.smokeDodgeSprites.set(e.id,art)}
      const config=this.templates.mod_shadow_blades_smoke.render.sprites[0]
      art.animate(this.towerArt.animations[`${config.prefix}_${config.name}`],session.time-m.spriteTs,30,config.anchor,m.facingLeft);art.root.position.set(m.pos.x+m.offset.x,m.pos.y+m.offset.y,1);art.setOrder(...this.nativeOrder(config,m.pos,session.entities?.entity(m)?.id??0))
    }
    for(const [id,art]of this.smokeSprites)if(!smoke.has(id)){art.dispose();this.smokeSprites.delete(id)}
    for(const [id,art]of this.smokeDodgeSprites)if(!dodge.has(id)){art.dispose();this.smokeDodgeSprites.delete(id)}
    for(const [id,art]of this.enemyShadows)if(!shadows.has(id)){art.dispose();this.enemyShadows.delete(id)}
  }
  private renderTowers() {
    if(!this.session || !this.towerAtlas || !this.towerArt)return
    for(const [id,state]of this.session.buyAvailable.indicators){
      if(this.session.time<state.insertAt)continue
      let art=this.buyIndicators.get(id)
      if(!art){art=this.towerAtlas.create();art.setFrame(buyAvailableSprite.name,state.anchor);art.setOrder(buyAvailableSprite.z);this.scene.add(art.root);this.buyIndicators.set(id,art)}
      const pulse=buyAvailablePulse(this.session.time,this.session.buyAvailable.animationTs)
      art.root.position.set(state.site.pos.x+state.offset.x,state.site.pos.y+state.offset.y,1)
      art.root.scale.set(pulse.scale.x,pulse.scale.y,1);art.setOpacity(pulse.alpha/255);art.root.visible=!state.hidden
    }
    for(const site of this.session.towers.sites) {
      const entity=this.session.entities?.entity(site),registered=entity&&this.session.entities!.registry.entities.get(entity.id)
      const key:string=registered?.template??(site.building&&this.session.time>=(site.buildStartsAt??0)?site.building:site.tower??site.holder)
      const retiring=!!registered&&key!==(site.building??site.tower??site.holder)
      let visual=this.towerVisuals.get(site.id)
      if(visual?.key!==key) {
        visual?.parts.forEach(p=>p.art.dispose());visual?.root.removeFromParent()
        const root=new THREE.Group(),parts:NonNullable<typeof visual>['parts']=[]
        root.position.set(site.pos.x,site.pos.y,1);root.renderOrder=10000-site.pos.y
        for(const [index,config] of this.templates[key].render.sprites.entries()) {
          if(config.hidden)continue
          const art=config.exo?new ExoSprite(this.towerAtlas,this.towerArt.exos[config.prefix!]):this.towerAtlas.create()
          art.root.position.set(config.offset.x,config.offset.y,0)
          art.setOrder(...this.nativeOrder(config,site.pos,registered?.id??0,index+1))
          root.add(art.root);parts.push({config,art})
        }
        visual={key,root,parts};this.scene.add(root);this.towerVisuals.set(site.id,visual)
      }
      for(const rendered of visual!.parts) {
        const {config,art}=rendered
        art.setOrder(...this.nativeOrder(config,site.pos,registered?.id??0,this.templates[key].render.sprites.indexOf(config)+1))
        if(retiring&&rendered.update){rendered.update(this.session.time);continue}
        const elapsed=site.building?Math.max(0,this.session.time-site.buildStartsAt!):this.session.time
        if(site.building&&key===site.building&&this.templates[key].render.sprites.indexOf(config)===3){const duration=this.templates[key].build_duration??1;art.root.scale.x=Math.max(0,Math.min(1,elapsed/duration))}
        if(art instanceof ExoSprite) {
          if(site.tower?.startsWith('tower_catapult_')){
            const sid=this.templates[key].render.sprites.indexOf(config),part=this.session.combat.catapultTowers.states.get(site.id)?.parts[sid]
            if(part){const pose={...part};rendered.update=time=>{art.root.scale.x=pose.flip?-1:1;art.animate(pose.name,time-pose.ts,pose.loop,pose.fps??30)};rendered.update(this.session.time)}else art.animate(config.name,elapsed,true,config.fps??30)
            continue
          }
          if(site.tower?.startsWith('tower_culverine_')){
            const sid=this.templates[key].render.sprites.indexOf(config),part=this.session.combat.culverineTowers.states.get(site.id)?.parts[sid]
            if(part){const pose={...part};rendered.update=time=>{art.root.visible=!pose.hidden;art.root.scale.x=pose.flip?-1:1;art.animate(pose.name,time-pose.ts,pose.loop,30)};rendered.update(this.session.time)}else art.animate(config.name,elapsed,true,30)
            continue
          }
          if(site.tower?.startsWith('tower_wizard_')){
            const sid=this.templates[key].render.sprites.indexOf(config),part=this.session.combat.wizardTowers.states.get(site.id)?.parts[sid]
            if(part){const pose={...part,offset:{...part.offset}};rendered.update=time=>{art.root.position.set(pose.offset.x,pose.offset.y,0);art.root.scale.x=pose.flip?-1:1;art.animate(pose.name,time-pose.ts,pose.loop,config.fps??30)};rendered.update(this.session.time)}else art.animate(config.name,elapsed,true,config.fps??30)
            continue
          }
          const state=this.session.combat.shooters.get(site.id)
          if(site.tower?.startsWith('tower_archers_')) {
            const template=this.templates[key] as TowerTemplate&{shooters_sids:number[];bows_sids?:number[]}
            const sid=template.render.sprites.indexOf(config)+1,bowIndex=template.bows_sids?.indexOf(sid)??-1
            const shooterSid=bowIndex>=0?template.shooters_sids[bowIndex]:sid,controller=state?.archers?.get(shooterSid)
            if(controller){const pose={...(bowIndex>=0&&controller.bowPose?controller.bowPose:controller)},name=pose.animation+(pose.back&&pose.animation!=='stun'?'back':'');rendered.update=time=>{art.root.visible=bowIndex<0||!pose.back;art.root.scale.x=pose.flipX?-1:1;if(art.root.visible)art.animate(name,time-pose.startedAt,pose.loop,config.fps??30)};rendered.update(this.session.time)}
            else art.animate(config.name,elapsed)
            continue
          }
          const attackName=state?.facingBack?'shootback':'shoot'
          const definition=this.towerArt.exos[config.prefix!]
          const attack=definition.animations.find(a=>a.name===attackName||a.name==='attack')
          const attacking=state && attack && this.session.time-state.startedAt<attack.frames.length/definition.fps
          art.animate(attacking?attack.name:config.name,attacking?this.session.time-state.startedAt:elapsed)
        }
        else if(config.prefix && this.towerArt.animations[`${config.prefix}_${config.name}`]) {
          const door=this.session.barracks.doors.get(site.id)
          const name=door && config.prefix.includes('_door_')?door.animation:config.name
          const animation=this.towerArt.animations[`${config.prefix}_${name}`]
          if(door&&config.prefix.includes('_door_')){
            const startedAt=door.startedAt;rendered.update=time=>{const frame=nativeAnimationFrame(animation.to-animation.from+1,time-startedAt,false,30).frame;art.setFrame(`${animation.prefix}_${String(animation.from+frame).padStart(4,'0')}`,config.anchor)};rendered.update(this.session.time)
          }else art.animate(animation,elapsed,30,config.anchor)
        }
        else art.setFrame(config.name.replace('%04i',String(site.terrain).padStart(4,'0')),config.anchor)
      }
    }
  }
  private renderSoldiers() {
    if(!this.session || !this.towerAtlas || !this.towerArt)return
    const live=new Set<number>()
    for(const soldier of this.session.barracks.soldiers) {
      const entity=this.session.entities?.entity(soldier);if(entity&&!this.session.entities!.registry.entities.get(entity.id))continue
      if(soldier.mainStartTick!==undefined&&Math.round(this.session.time*30)<soldier.mainStartTick)continue
      live.add(soldier.id)
      let art=this.soldierSprites.get(soldier.id)
      const config=soldier.template.render.sprites[0]
      if(!art){art=config.exo?new ExoSprite(this.towerAtlas,this.towerArt.exos[config.prefix]):this.towerAtlas.create();this.soldierSprites.set(soldier.id,art);this.scene.add(art.root)}
      const idle=!soldier.visualOverride&&soldier.diedAt===undefined&&!soldier.meleeVisual&&!soldier.attack&&!soldier.moving?soldier.idleVisual:undefined
      const name=soldier.visualOverride?.name??(soldier.diedAt!==undefined?'death':soldier.meleeVisual?.name??(soldier.attack?soldier.attack.attack.animation:soldier.moving?'walk':idle?.name??'idle'))
      let elapsed=this.session.time-(soldier.visualOverride?.at??soldier.diedAt??soldier.meleeVisual?.at??soldier.attack?.startedAt??idle?.at??soldier.born)
      if(art instanceof ExoSprite) {
        if(soldier.diedAt!==undefined || soldier.attack || soldier.meleeVisual)elapsed=Math.min(elapsed,art.duration(name)-.001)
        if(soldier.nativeHeroLife&&soldier.visualOverride)art.animate(name,this.session.time-soldier.visualOverride.at,soldier.visualOverride.loop??false,30);else art.animate(name,elapsed,idle?.loop??true,idle?30:undefined);art.root.scale.set((config.scale?.x??1)*(soldier.facingLeft?-1:1),config.scale?.y??1,1)
      } else {
        const animation=this.towerArt.animations[`${soldier.prefix??config.prefix}_${name}`]
        if(!animation)continue
        if(soldier.diedAt!==undefined || soldier.attack || soldier.meleeVisual)elapsed=Math.min(elapsed,(animation.to-animation.from+.99)/30)
        if((soldier.nativeReinforcement||soldier.name==='soldier_reinforcement_special'||soldier.name.startsWith('soldier_knights_lvl'))&&soldier.visualOverride){const frame=nativeAnimationFrame(animation.to-animation.from+1,elapsed,soldier.visualOverride.loop??false,30).frame;art.setFrame(`${animation.prefix}_${String(animation.from+frame).padStart(4,'0')}`,config.anchor,soldier.facingLeft)}
        else art.animate(animation,elapsed,30,config.anchor,soldier.facingLeft)
        art.root.scale.set(config.scale?.x??1,config.scale?.y??1,1)
        art.setOpacity(soldier.corpseAlpha!==undefined?soldier.corpseAlpha/255:soldier.fadeOutAt!==undefined?Math.max(0,1-(this.session.time-soldier.fadeOutAt)/(10/30)):soldier.expiresAt!==undefined&&soldier.name!=='soldier_reinforcement_special'?Math.min(1,(this.session.time-soldier.born)/(10/30)):1)
      }
      art.root.position.set(soldier.pos.x+config.offset.x,soldier.pos.y+config.offset.y,1)
      art.setOrder(...this.nativeOrder(config,soldier.pos,entity?.id??soldier.id))
    }
    for(const [id,art] of this.soldierSprites)if(!live.has(id)){art.dispose();this.soldierSprites.delete(id)}
  }
  private renderReinforcementBuffs(){
    if(!this.session||!this.towerAtlas)return
    const buffs=this.session.barracks.reinforcementAura.buffs,time=this.session.time
    for(const [id,buff]of buffs){let art=this.reinforcementBuffSprites.get(id);if(!art){art=this.towerAtlas.create();art.setFrame('reinforcements_lvl3_buff_decal',{x:.5,y:.5});this.scene.add(art.root);this.reinforcementBuffSprites.set(id,art)}const p=buff.target.pos;art.root.position.set(p.x,p.y,1);art.setOrder(9999-p.y);art.setOpacity(Math.max(0,Math.min(1,buff.removeAt===undefined?time-buff.spriteAt:1-(time-buff.removeAt))))}
    for(const [id,art]of this.reinforcementBuffSprites)if(!buffs.has(id)){art.dispose();this.reinforcementBuffSprites.delete(id)}
  }
  private renderHeroIntro() {
    if(!this.session || !this.towerAtlas || !this.towerArt)return
    const intro=this.session.heroes.intro
    if(!intro || intro.finished){for(const part of this.heroIntroParts)part.art.dispose();this.heroIntroParts=[];return}
    if(!this.heroIntroParts.length) {
      for(const name of ['decal_stage_01_portal','decal_stage_01_gerald_intro']) {
        const config=this.templates[name].render.sprites[0],art=new ExoSprite(this.towerAtlas,this.towerArt.exos[config.prefix!])
        art.root.position.set(intro.pos.x+config.offset.x,intro.pos.y+config.offset.y,1);art.root.scale.set(config.scale?.x??1,config.scale?.y??1,1);art.setOrder(10000-intro.pos.y+this.heroIntroParts.length/10)
        this.scene.add(art.root);this.heroIntroParts.push({art,animation:config.name})
      }
    }
    for(const part of this.heroIntroParts)part.art.animate(part.animation,Math.min(this.session.time-intro.at,part.art.duration(part.animation)-.001))
  }
  private renderPowers() {
    if(!this.session || !this.towerAtlas || !this.towerArt)return
    const live=new Set<number>()
    for(const meteor of this.session.powers.meteors) {
      live.add(meteor.id)
      let pair=this.meteorSprites.get(meteor.id)
      if(!pair){pair={art:this.towerAtlas.create(),shadow:this.towerAtlas.create()};this.scene.add(pair.art.root,pair.shadow.root);this.meteorSprites.set(meteor.id,pair)}
      const animation=this.towerArt.animations.rain_of_fire_projectile_idle,elapsed=this.session.powers.deferRain?this.session.time:this.session.time-meteor.born
      const frame=nativeAnimationFrame(animation.to-animation.from+1,elapsed,true,30).frame
      pair.art.setFrame(`${animation.prefix}_${String(animation.from+frame).padStart(4,'0')}`,{x:.5,y:.5})
      pair.art.root.position.set(meteor.pos.x,meteor.pos.y,2);pair.art.root.rotation.z=meteor.rotation;pair.art.setOrder(...this.nativeOrder(this.templates.bullet_power_rain_of_fire.render.sprites[0],meteor.pos,this.session.entities?.entity(meteor)?.id??meteor.id))
      const shadowEntity=meteor.shadow&&this.session.entities?.entity(meteor.shadow);pair.shadow.root.visible=!this.session.powers.deferRain||!!shadowEntity&&!!this.session.entities!.registry.entities.get(shadowEntity.id)
      pair.shadow.setFrame('decal_flying_shadow_big',{x:.5,y:.5});pair.shadow.root.position.set(meteor.to.x,meteor.to.y,1);pair.shadow.root.scale.setScalar(meteor.shadowScale);pair.shadow.setOrder(...this.nativeOrder(this.templates.decal_rain_of_fire_shadow.render.sprites[0],meteor.to,shadowEntity?.id??0))
    }
    for(const [id,pair] of this.meteorSprites)if(!live.has(id)){pair.art.dispose();pair.shadow.dispose();this.meteorSprites.delete(id)}
  }
  private renderTutorialIndicator() {
    if(!this.session || !this.towerAtlas || !this.towerArt)return
    const tutorial=this.session.tutorial,site=this.session.towers.sites.find(s=>s.id==='6')
    const visible=!!tutorial && tutorial.lesson==='build-tower' && !tutorial.buildComplete && !tutorial.menuOpen && !!site && !site.building
    if(visible && !this.tutorialIndicatorVisible)this.tutorialIndicatorBorn=this.session.time
    this.tutorialIndicatorVisible=visible
    if(visible && !this.tutorialIndicator.length) {
      for(const config of this.templates.stage_01_tower_build_indicator.render.sprites) {
        const art=this.towerAtlas.create();this.scene.add(art.root);this.tutorialIndicator.push({art,config})
      }
    }
    for(const [index,{art,config}] of this.tutorialIndicator.entries()) {
      art.root.visible=visible
      if(!visible)continue
      const animation=this.towerArt.animations[config.name]
      const elapsed=this.session.time-this.tutorialIndicatorBorn
      if(animation)art.animate(animation,elapsed,30,config.anchor)
      else art.setFrame(config.name,config.anchor)
      art.setOpacity(Math.min(1,elapsed/(5/30)))
      art.root.position.set(site!.pos.x+config.offset.x,site!.pos.y+config.offset.y,1)
      art.root.scale.set(config.scale?.x??1,config.scale?.y??1,1)
      art.setOrder(index===0?1300:10000-site!.pos.y)
    }
  }
  private nativeOrder(config:NativeSpriteSort,pos:{x:number;y:number},entity:number,index=1){
    const order=nativeSpriteOrder(config,pos,entity,index),history=this.session?.paintOrder.rank(order[1].key!)
    if(history!==undefined)order[1].history=history
    return order
  }
  private renderProjectiles() {
    if(!this.session || !this.towerAtlas || !this.towerArt)return
    const live=new Set<number>()
    for(const projectile of [...this.session.combat.projectiles,...this.session.heroes.projectiles,...this.session.enemyRanged.projectiles,...this.session.combat.culverineRays.rays.filter(r=>!r.removed),...this.session.combat.archerPierceRays.rays,...this.session.combat.nativeCulverine.rays]) {
      if(projectile.born===undefined)continue
      live.add(projectile.id)
      let art=this.projectileSprites.get(projectile.id)
      const rawConfig=this.templates[projectile.name].render.sprites[0],config='nativeVisual'in projectile&&projectile.nativeVisual?{...rawConfig,...projectile.nativeVisual}:rawConfig
      if(!art) {art=config.exo?new ExoSprite(this.towerAtlas,this.towerArt.exos[config.prefix!]):this.towerAtlas.create();this.projectileSprites.set(projectile.id,art);this.scene.add(art.root)}
      const elapsed=projectile.name.startsWith('bullet_culverine_skill_a_')?this.session.time:this.session.time-projectile.born
      if(art instanceof ExoSprite)art.animate(config.name,elapsed)
      else if(config.prefix){const a=this.towerArt.animations[`${config.prefix}_${config.name}`];if(projectile.name.startsWith('bullet_culverine_')){const frame=nativeAnimationFrame(a.to-a.from+1,elapsed,config.loop??true,config.fps??30).frame;art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,config.anchor)}else if(projectile.name.startsWith('bullet_skill_c_wizard_')){const frame=nativeAnimationFrame(a.to-a.from+1,this.session.time-(config.ts??0),config.loop??true,config.fps??30).frame;art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,config.anchor)}else art.animate(a,elapsed,30,config.anchor)}
      else if(config.animated&&this.towerArt.animations[config.name]){const a=this.towerArt.animations[config.name],frame=nativeAnimationFrame(a.to-a.from+1,elapsed,config.loop??true,config.fps??30).frame;art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,config.anchor)}
      else art.setFrame(config.name,config.anchor)
      art.root.visible=!('hidden'in projectile&&projectile.hidden)&&!('bombMotion'in projectile&&projectile.bombMotion?.hidden)&&!('arrowMotion'in projectile&&projectile.arrowMotion?.hidden)
      art.root.position.set(projectile.pos.x,projectile.pos.y,2)
      const scale='scale'in projectile?projectile.scale:config.scale
      art.root.scale.set(scale?.x??1,scale?.y??1,1)
      art.root.rotation.z=projectile.rotation
      art.setOrder(...this.nativeOrder(config,projectile.pos,this.session.entities?.entity(projectile)?.id??projectile.id))
    }
    for(const [id,art] of this.projectileSprites)if(!live.has(id)){art.dispose();this.projectileSprites.delete(id)}
  }
  private clear() {
    this.catapultTrapsRenderer?.dispose();this.catapultTrapsRenderer=undefined
    this.catapultTarRenderer?.dispose();this.catapultTarRenderer=undefined
    this.bolinMinesRenderer?.dispose();this.bolinMinesRenderer=undefined;this.bolinMortarRenderer?.dispose();this.bolinMortarRenderer=undefined;this.bolinRenderer?.dispose();this.bolinRenderer=undefined
    this.catapultBombRenderer?.dispose();this.catapultBombRenderer=undefined
    this.culverineThrottleRenderer?.dispose();this.culverineThrottleRenderer=undefined
    this.culverineNativeRenderer?.dispose();this.culverineNativeRenderer=undefined
    this.reinforcementSpecialRenderer?.dispose();this.reinforcementSpecialRenderer=undefined
    this.knightArmorRenderer?.dispose();this.knightArmorRenderer=undefined
    this.wizardEmpowerRenderer?.dispose();this.wizardEmpowerRenderer=undefined
    this.archerRangeRenderer?.dispose();this.archerRangeRenderer=undefined
    this.zefiraSkillsRenderer?.dispose();this.zefiraSkillsRenderer=undefined
    this.archerMarkRenderer?.dispose();this.archerMarkRenderer=undefined
    this.copiesRenderer?.dispose();this.copiesRenderer=undefined
    this.firebookRenderer?.dispose();this.firebookRenderer=undefined
    this.staticEffectRenderer?.dispose();this.staticEffectRenderer=undefined;this.bloodRenderer?.dispose();this.bloodRenderer=undefined;this.dodgeRenderer?.dispose();this.dodgeRenderer=undefined
    this.healthBars.clear();this.geraldSkillsRenderer?.dispose();this.geraldSkillsRenderer=undefined;this.royalRenderer?.dispose();this.royalRenderer=undefined;this.rainRenderer?.dispose();this.rainRenderer=undefined
    this.smokeSprites.forEach(a=>a.dispose());this.smokeSprites.clear();this.smokeDodgeSprites.forEach(a=>a.dispose());this.smokeDodgeSprites.clear();this.enemyShadows.forEach(a=>a.dispose());this.enemyShadows.clear()
    this.cancelRally()
    this.tutorialIndicator.forEach(p=>p.art.dispose());this.tutorialIndicator=[]
    this.tutorialIndicatorVisible=false
    this.cameraRig=new WorldCamera(768*16/9);this.lastCameraRequest=undefined
    this.environment?.dispose();this.environment=undefined
    this.fishingRenderer?.dispose();this.fishingRenderer=undefined
    this.effects.forEach(e=>e.art.dispose());this.effects=[]
    this.heroLifeRenderer?.dispose();this.heroLifeRenderer=undefined
    this.soldierSprites.forEach(s=>s.dispose());this.soldierSprites.clear()
    this.reinforcementBuffSprites.forEach(s=>s.dispose());this.reinforcementBuffSprites.clear()
    this.heroIntroParts.forEach(p=>p.art.dispose());this.heroIntroParts=[];this.heroSelected=false
    this.meteorSprites.forEach(p=>{p.art.dispose();p.shadow.dispose()});this.meteorSprites.clear()
    this.projectileSprites.forEach(s=>s.dispose());this.projectileSprites.clear()
    this.towerVisuals.forEach(v=>{v.parts.forEach(p=>p.art.dispose());v.root.removeFromParent()});this.towerVisuals.clear()
    this.buyIndicators.forEach(art=>art.dispose());this.buyIndicators.clear()
    this.session=undefined;this.sprites.forEach(s=>s.dispose());this.sprites.clear()
    this.scene.clear(); this.resources.forEach(r => r.dispose()); this.resources = []
  }
  dispose() { this.disposed = true; this.renderer.setAnimationLoop(null);this.observer.disconnect(); this.clear(); this.healthBars.dispose(); this.renderer.dispose(); this.renderer.domElement.remove() }
}
