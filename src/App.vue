<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount,nextTick } from 'vue'
import Opening from './Opening.vue'
import heroTeamData from '../public/data/hero-team.json' with {type:'json'}
const heroDisplay:Record<string,{name:string;portrait:number}>=heroTeamData.heroes
import PauseOptions from './PauseOptions.vue'
import type {PauseArt} from './game/PauseOptions'
import {AudioSettings} from './game/AudioSettings'
import type {VolumeKey} from './game/AudioSettings'
import {preloadNativeImages} from './game/NativeImageCache'
import SceneTransition from './SceneTransition.vue'
import Comic from './Comic.vue'
import OutcomeView from './OutcomeView.vue'
import {OutcomePresentation} from './game/OutcomePresentation'
import MapView from './MapView.vue'
import HeroRoom from './HeroRoom.vue'
import PowerRoom from './PowerRoom.vue'
import GlobalRoom from './GlobalRoom.vue'
import {globalUpgradePoints,validateGlobalUpgrades} from './game/GlobalUpgrades'
import type {GlobalUpgradeSelection} from './game/GlobalUpgrades'
import TutorialOverlay from './TutorialOverlay.vue'
import type {BalloonConfig} from './TutorialOverlay.vue'
import type {TutorialBalloon} from './game/TutorialState'
import type {Point} from './game/types'
import type {PowerKind} from './game/PowerSystem'
import TowerMenu from './TowerMenu.vue'
import type {TowerMenuData} from './TowerMenu.vue'
import GameHud from './GameHud.vue'
import HeroBar from './HeroBar.vue'
import type {HeroPortrait,PowerPortrait} from './HeroBar.vue'
import type {HudData} from './GameHud.vue'
import WaveFlags from './WaveFlags.vue'
import type {WaveEntrance} from './WaveFlags.vue'
import type {IncomingWave} from './game/WaveRunner'
import { WorldRenderer } from './game/WorldRenderer'
import type { GameMode } from './game/types'
import type { TowerKind, TowerSite } from './game/TowerSystem'
import {AudioManager} from './game/AudioManager'
import type {Outcome} from './game/Outcome'
import {equippedTowers} from './game/TowerProgression'
import {equippedPowers,equipPower} from './game/NativeProgression'
import {validatePowerUpgrades} from './game/PowerUpgrades'
import {heroXpFraction} from './game/HeroProgression'
import {powerXpFraction} from './game/PowerProgression'
import {recordVictory,recordHeroXp,recordPowerXp,playerLevel,hasSeenIntroduction,recordIntroduction} from './game/ProgressStore'
import {SaveSlots} from './game/SaveSlots'
const saveSlots=new SaveSlots(localStorage),slotEntries=ref(saveSlots.list())
const debug=import.meta.env.DEV&&new URLSearchParams(location.search).get('debug')==='1'
let progress=saveSlots.loadActive()??{levels:{}}
function persistProgress(){saveSlots.saveActive(progress);slotEntries.value=saveSlots.list()}
const heroRoomVisible=ref(false),heroRoomProgress=ref(progress)
const powerRoomVisible=ref(false),globalRoomVisible=ref(false)
function openGlobalRoom(){saveSessionProgress();heroRoomProgress.value=progress;globalRoomVisible.value=true}
function saveGlobalUpgrades(selected:GlobalUpgradeSelection){progress={...progress,globalUpgrades:validateGlobalUpgrades(globalUpgradePoints(progress),selected)};heroRoomProgress.value=progress;persistProgress()}
function openPowerRoom(){saveSessionProgress();heroRoomProgress.value=progress;powerRoomVisible.value=true}
function savePowerUpgrades(kind:PowerKind,nodes:string[]){progress={...progress,powerUpgrades:{...progress.powerUpgrades,[kind]:validatePowerUpgrades(kind,progress.powerXp?.[kind]??0,nodes)}};heroRoomProgress.value=progress;persistProgress()}
function savePowerEquipment(kind:PowerKind,slot:number){progress=equipPower(progress,kind,slot);heroRoomProgress.value=progress;persistProgress()}
function openHeroRoom(){if(world?.session)progress=recordPowerXp(recordHeroXp(progress,world.session.heroes.team),world.session.powers.progression.snapshot());heroRoomProgress.value=progress;heroRoomVisible.value=true}
function saveHeroUpgrades(hero:string,nodes:string[]){progress={...progress,heroUpgrades:{...progress.heroUpgrades,[hero]:nodes}};heroRoomProgress.value=progress;persistProgress()}
const outcomePresentation=new OutcomePresentation(),outcomeVisible=ref(false),outcomeHudHidden=ref(false)
function clearOutcomePresentation(){outcomePresentation.clear();outcomeVisible.value=false;outcomeHudHidden.value=false}
let savedOutcome:Outcome|undefined
let lastXpSaveAt=0
function saveSessionProgress(){
 const s=world?.session;if(!s)return
 const powerXp=s.powers.progression.snapshot()
 const changed=s.heroes.team.some(h=>h.xp>(progress.heroes?.[h.name]??0))||s.powers.equipped.some(kind=>powerXp[kind]>(progress.powerXp?.[kind]??0))
 if(changed){progress=recordPowerXp(recordHeroXp(progress,s.heroes.team),powerXp);persistProgress()}
 lastXpSaveAt=s.time
}
function saveWhenHidden(){if(document.visibilityState==='hidden')saveSessionProgress()}
const audio=new AudioManager(),audioSettings=new AudioSettings(localStorage)
const audioVolumes=ref({...audioSettings.values}),optionsArt=ref<PauseArt>(),pauseVisible=ref(false),pauseOptions=ref<InstanceType<typeof PauseOptions>>()
audio.setVolumes(audioSettings.values)
function changeVolume(key:VolumeKey,value?:number){if(value===undefined)audioSettings.toggle(key);else audioSettings.set(key,value);audioVolumes.value={...audioSettings.values};audio.setVolumes(audioSettings.values);audioSettings.save()}
function resumePause(){audioSettings.save();audio.resume();if(world?.session)world.session.paused=false;world?.onChange()}
async function pauseRestart(){audioSettings.save();audio.stopAll();audio.resume();await load(true)}
async function pauseQuit(){audioSettings.save();if(world?.session){progress=recordPowerXp(recordHeroXp(progress,world.session.heroes.team),world.session.powers.progression.snapshot());persistProgress()}audio.stopAll();audio.resume();await showMap()}
const muted=ref(false)
const sceneTransition=ref<InstanceType<typeof SceneTransition>>(),transitionBusy=ref(false)
async function changeScene(prepare:(report:(images:number,audio?:number)=>void)=>Promise<void>){
  if(transitionBusy.value||!sceneTransition.value)return false
  const previous=world?.session,previousPaused=previous?.paused
  if(previous)previous.paused=true
  let incoming:typeof previous,desiredPaused=true,didPrepare=false
  try{return await sceneTransition.value.run(async(report,current)=>{
    await prepare(report);if(!current())return
    incoming=world?.session;didPrepare=true
    if(incoming){desiredPaused=incoming.paused;if(incoming!==previous&&!desiredPaused)incoming.advance(2/30);incoming.paused=true}
  })}catch(e){error.value=e instanceof Error?e.message:String(e);return false}
  finally{if(incoming&&incoming===world?.session&&!mapVisible.value)incoming.paused=desiredPaused;else if(!didPrepare&&previous&&previous===world?.session&&!mapVisible.value)previous.paused=previousPaused!;world?.onChange()}
}
const screen=ref<'opening'|'game'>('opening')
const comicVisible=ref(false)
const comicIndex=ref(1)
const mapVisible=ref(false)
const mapFocus=ref(1)
let resolveMapReady:(()=>void)|undefined,rejectMapReady:((error:Error)=>void)|undefined,mapLoadProgress:((value:number)=>void)|undefined
function mapReady(error?:string){if(error)rejectMapReady?.(new Error(error));else resolveMapReady?.();resolveMapReady=undefined;rejectMapReady=undefined}
async function prepareMap(report:(images:number,audio?:number)=>void,focus:number){report(0,1);clearOutcomePresentation();pauseVisible.value=false;comicVisible.value=false;mapFocus.value=focus;const alreadyVisible=mapVisible.value,ready=alreadyVisible?Promise.resolve():new Promise<void>((resolve,reject)=>{resolveMapReady=resolve;rejectMapReady=reject});mapLoadProgress=value=>report(value,1);mapVisible.value=true;audio.stopAll(['GUITransitionClose']);audio.trigger('MusicMap');musicStarted=true;await ready;mapLoadProgress=undefined}
async function showMap(focus=level.value){return changeScene(report=>prepareMap(report,focus))}
async function enterFromMap(stage:number,nextMode:GameMode){level.value=stage;mode.value=nextMode;await load()}
function continueOutcome(){if(level.value===1&&mode.value==='campaign'&&status.value.outcome?.kind==='victory'&&!progress.onboarding?.comic2){progress=recordIntroduction(progress,'comic2');persistProgress();comicIndex.value=2;comicVisible.value=true;audio.stopAll();music()}else showMap()}
function finishComic(){if(comicIndex.value===2)void showMap(2);else{comicVisible.value=false;if(world?.session)world.session.paused=false}}
function outcomeReady(){audio.stopAll();audio.trigger(status.value.outcome?.kind==='victory'?'GUIStageVictory':'GUIStageDefeat')}
let musicStarted=false
function music(battle=false){audio.stopGroup('MUSIC');audio.trigger(`MusicBattle${battle?'':'Prep'}_0${level.value}`);musicStarted=true}
async function unlockAudio(){await audio.unlock();if(screen.value==='game'&&!musicStarted)music((world?.session?.waves.wave??0)>0)}
async function startOpening(){
  await audio.unlock();await Promise.all(['GUISplash','GUITransitionClose','GUITransitionOpen'].map(name=>audio.preload(name)));audio.stopAll()
  void audio.preload('MusicMainMenu').catch(e=>{error.value=String(e)})
  await audio.play('GUISplash')
}
function startMenu(){audio.trigger('MusicMainMenu')}
function toggleAudio(){muted.value=!muted.value;audio.setMuted(muted.value)}
const selected=ref<TowerSite>()
const tutorial=ref<{inputLocked:boolean;waveVisible:boolean;balloon?:TutorialBalloon;focus?:Point;lesson:string;buildComplete:boolean}>()
const heroBalloon=ref<TutorialBalloon>()
const balloons=ref<Record<string,BalloonConfig>>({})
const towerMenuData=ref<TowerMenuData>()
const hudData=ref<HudData>()
const focusSettings=ref({radius:.3,inner:.7,maxAlpha:.7})
const waveConfirm=ref(false)
const incomingWave=ref<IncomingWave>()
const waveEntrances=ref<WaveEntrance[]>([])
const powers=ref<PowerPortrait[]>([])
const heroes=ref<HeroPortrait[]>([])
function selectRally(){const id=selected.value?.id;if(id){cancelBuild();world?.selectRally(id)}}
function selectHero(id:number){cancelBuild();world?.selectHero(id)}
function selectPower(kind:PowerKind){const s=world?.session;if(!s || s.paused || s.outcome || s.tutorial?.inputLocked)return;world!.cancelRally();world!.heroSelected=false;s.powers.select(kind,s.time);cancelBuild()}
const project=(p:Point)=>world?.projectPoint(p)??{x:0,y:0}
const buildError=ref('')
function cancelBuild(){if(selected.value)selected.value.powerPreview=undefined;selected.value=undefined;world?.session?.tutorial?.closeMenu()}
function build(kind:TowerKind){try{world?.session?.build(selected.value!.id,kind);cancelBuild();buildError.value=''}catch(e){buildError.value=String(e)}}
function upgradeTower(){try{world?.session?.upgradeTower(selected.value!.id);cancelBuild();buildError.value=''}catch(e){buildError.value=String(e)}}
function upgradeTowerPower(key:string,sounds:string[]){try{world?.session?.upgradeTowerPower(selected.value!.id,key);for(const sound of sounds)audio.trigger(sound);buildError.value='';world?.onChange()}catch(e){buildError.value=String(e)}}
function sellTower(){try{world?.session?.sellTower(selected.value!.id);cancelBuild();buildError.value=''}catch(e){buildError.value=String(e)}}
const viewport = ref<HTMLElement>()
const level = ref(1)
const mode = ref<GameMode>('campaign')
const loading = ref(true)
const error = ref('')
const status = ref<{gold:number;lives:number;wave:number;paused:boolean;cinematic?:boolean;guiHidden?:boolean;curtains?:boolean;outcome?:Outcome}>({gold:0,lives:20,wave:0,paused:false})
const names = ['利尼维亚城堡', '奥术魔法学院', '遭受入侵的农田']
let world: WorldRenderer | undefined
async function load(restarted=false){return changeScene(report=>loadScene(restarted,report))}
async function loadScene(restarted=false,report:(images:number,audio?:number)=>void=()=>{}) {
  report(0,1)
  const seenFirstGuide=hasSeenIntroduction(progress,'stage1')
  const showOpeningComic=level.value===1&&mode.value==='campaign'&&!restarted&&!seenFirstGuide
  pauseVisible.value=false;audioSettings.beginWindow()
  if(world?.session){progress=recordPowerXp(recordHeroXp(progress,world.session.heroes.team),world.session.powers.progression.snapshot());persistProgress()}
  loading.value = true; error.value = '';comicVisible.value=false;comicIndex.value=1;mapVisible.value=false
  selected.value=undefined
  status.value={...status.value,outcome:undefined,paused:false}
  waveConfirm.value=false;tutorial.value=undefined
  incomingWave.value=undefined;waveEntrances.value=[]
  clearOutcomePresentation();savedOutcome=undefined
  audio.stopAll(['GUITransitionClose']);audio.resume();musicStarted=false
  if(world)world.onLoadProgress=value=>report(value,1)
  try {const data=await world?.load(level.value,mode.value,!!progress.levels[1]?.campaign,!!progress.levels[level.value]?.campaign,restarted,progress.heroes,playerLevel(progress),equippedPowers(progress),progress.heroUpgrades,equippedTowers(progress),progress.onboarding,progress.powerXp,progress.powerUpgrades,progress.globalUpgrades);waveEntrances.value=data?.data.entities_list.filter(e=>e.template==='editor_wave_flag'&&e.pos).map(e=>({path:Number(e['editor.path_id']),pos:e.pos!,r:Number(e['editor.r']??0)}))??[]}
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally {if(!error.value&&world?.session){if(mode.value==='campaign'&&(level.value===1||level.value===2))progress=recordIntroduction(progress,level.value===1?'stage1':'stage2');progress={...progress,lastPlayed:{stage:level.value,mode:mode.value}};persistProgress();lastXpSaveAt=0;comicVisible.value=showOpeningComic;world.session.paused=comicVisible.value;world.onChange();music()}loading.value = false }
}
onMounted(() => {
  window.addEventListener('pagehide',saveSessionProgress);document.addEventListener('visibilitychange',saveWhenHidden)
  void fetch('data/options.json').then(r=>{if(!r.ok)throw new Error('暂停窗口载入失败');return r.json()}).then(async(data:PauseArt)=>{await preloadNativeImages(Object.keys(data.images).map(name=>'assets/'+name+'.png'));optionsArt.value=data}).catch(e=>{error.value=String(e)})
  audio.onError=message=>{error.value=message}
  void audio.init().catch(e=>{error.value=String(e)})
  void fetch('data/hud.json').then(r=>{if(!r.ok)throw new Error('无法读取战斗界面');return r.json()}).then(data=>{hudData.value=data}).catch(e=>{error.value=String(e)})
  void fetch('data/tower-menu.json').then(r=>{if(!r.ok)throw new Error('无法读取防御塔菜单');return r.json()}).then(async data=>{await preloadNativeImages(Object.keys(data.sizes).map(name=>'assets/'+name+'.png'));towerMenuData.value=data}).catch(e=>{error.value=String(e)})
  void fetch('data/tutorial.json').then(r=>{if(!r.ok)throw new Error('无法读取教学提示');return r.json()}).then(data=>{balloons.value=data.balloons;focusSettings.value=data.focus}).catch(e=>{error.value=String(e)})
})
function createWorld(){
  world = new WorldRenderer(viewport.value!)
  world.onSiteSelect=site=>{if(site)world?.cancelRally();if(site&&selected.value?.id===site.id){cancelBuild();return}if(selected.value)selected.value.powerPreview=undefined;selected.value=site;buildError.value='';if(site)audio.trigger('GUIQuickMenuOpen')}
  world.onSound=(name,options)=>{if(name!=='GUIStageVictory'&&name!=='GUIStageDefeat')audio.trigger(name,options)}
  world.onStopSound=name=>audio.stopEvent(name)
  world.onChange=()=>{const s=world?.session;if(s){if(s.time-lastXpSaveAt>=5)saveSessionProgress();heroBalloon.value=s.heroes.balloon;heroes.value=s.heroes.team.filter(h=>h.portraitVisible).map(h=>({id:h.id,name:heroDisplay[h.name].name,image:heroDisplay[h.name].portrait,hp:h.hp,maxHp:h.template.health.hp_max,level:h.level,xpFraction:heroXpFraction(h.level,h.xp),selected:!!world?.heroSelected&&s.heroes.selectedId===h.id}));incomingWave.value=s.incomingWave;powers.value=s.powers.equipped.map(kind=>[kind,({reinforcements:'援军',rain_of_fire:'火雨',royal_edict:'皇家敕令'} as Record<PowerKind,string>)[kind]] as [PowerKind,string]).filter(([kind])=>!s.tutorial || s.tutorial.unlockedPowers.has(kind)).map(([kind,name])=>({kind,name,remaining:s.powers.remaining(kind,s.time),cooldown:s.powers.cooldowns[kind],level:s.powers.progression.status[kind].level,xpFraction:powerXpFraction(s.powers.progression.xp(kind)),selected:s.powers.selected===kind,locked:!s.powers.canUse(kind)}));status.value={gold:s.gold,lives:s.lives,wave:s.waves.wave,paused:s.paused,cinematic:s.cinematic,guiHidden:s.heroes.guiHidden,curtains:s.heroes.curtains,outcome:s.outcome};const t=s.tutorial;tutorial.value=t?{inputLocked:t.inputLocked,waveVisible:t.waveVisible,balloon:t.balloon,focus:t.focus,lesson:t.lesson,buildComplete:t.buildComplete}:undefined;if(s.outcome && savedOutcome!==s.outcome){savedOutcome=s.outcome;outcomePresentation.begin(s.outcome.kind,()=>{if(world?.session===s)outcomeHudHidden.value=true},()=>{if(world?.session===s){s.paused=true;outcomeVisible.value=true;world.onChange()}});progress=recordPowerXp(recordHeroXp(recordVictory(progress,level.value,mode.value,s.outcome),s.heroes.team),s.powers.progression.snapshot());persistProgress()}}}
}
async function selectSlot(index:number){
 if(transitionBusy.value)return
 const slot=saveSlots.select(index);progress=slot.progress;heroRoomProgress.value=progress;slotEntries.value=saveSlots.list();level.value=1;mode.value='campaign'
 return changeScene(async report=>{screen.value='game';await nextTick();createWorld();if(slot.next==='game')await loadScene(false,report);else{loading.value=false;await prepareMap(report,progress.lastPlayed?.stage??Math.min(3,playerLevel(progress)))}})
}
function deleteSlot(index:number){saveSlots.delete(index);slotEntries.value=saveSlots.list();if(index===saveSlots.active){progress={levels:{}};heroRoomProgress.value=progress}}
function nextWave(){
  const s=world?.session
  cancelBuild();world?.cancelRally();if(s)s.powers.selected=undefined;if(world)world.heroSelected=false
  if(s?.tutorial && s.waves.wave===0 && !waveConfirm.value){waveConfirm.value=true;s.tutorial.balloon=undefined;return}
  if(s?.waves.wave===0)music(true)
  s?.callNextWave();waveConfirm.value=false
}
function pause(){const session=world?.session;if(!session||session.outcome||session.cinematic)return;if(pauseVisible.value){pauseOptions.value?.resume();return}if(session.paused)return
 saveSessionProgress();audio.trigger('GUIButtonCommon');cancelBuild();world!.cancelRally();session.powers.selected=undefined;world!.heroSelected=false;waveConfirm.value=false;session.paused=true;pauseVisible.value=true;audio.pause();world?.onChange()
}
onBeforeUnmount(() => {outcomePresentation.clear();saveSessionProgress();window.removeEventListener('pagehide',saveSessionProgress);document.removeEventListener('visibilitychange',saveWhenHidden);world?.dispose();audio.dispose()})
</script>
<template>
  <SceneTransition ref="sceneTransition" @busy="transitionBusy=$event" @sound="audio.trigger($event)"/>
  <div :inert="transitionBusy" @pointerdown.capture="unlockAudio">
  <HeroRoom v-if="heroRoomVisible" :progress="heroRoomProgress" @close="heroRoomVisible=false" @purchase="saveHeroUpgrades" @sound="audio.trigger($event)"/>
  <GlobalRoom v-if="globalRoomVisible" :progress="heroRoomProgress" @close="globalRoomVisible=false" @purchase="saveGlobalUpgrades" @sound="audio.trigger($event)"/>
  <PowerRoom v-if="powerRoomVisible" :progress="heroRoomProgress" @close="powerRoomVisible=false" @purchase="savePowerUpgrades" @equip="savePowerEquipment" @sound="audio.trigger($event)"/>
  <MapView v-if="mapVisible" :progress="progress" :focus="mapFocus" @enter="enterFromMap" @heroes="openHeroRoom" @powers="openPowerRoom" @upgrades="openGlobalRoom" @ready="mapReady" @loading="mapLoadProgress?.($event)" @sound="audio.trigger($event)"/>
  <Comic v-if="comicVisible" :index="comicIndex" @done="finishComic" @sound="audio.trigger($event)"/>
  <Opening v-if="screen==='opening'" :begin="startOpening" :slots="slotEntries" @menu="startMenu" @select="selectSlot" @delete="deleteSlot" @sound="audio.trigger($event)"/>
  <main v-else class="game-shell" :class="{'debug-shell':debug}">
    <header v-if="debug"><h1>王国保卫战 <strong>6</strong></h1><nav aria-label="关卡选择">
      <button v-for="(name,i) in names" :key="name" :aria-pressed="level===i+1" @click="level=i+1; load()">{{ i+1 }}. {{ name }}</button>
    </nav></header>
    <section class="game-frame" aria-label="关卡画面" :aria-busy="loading||transitionBusy" :data-tutorial-step="tutorial?.lesson" :data-cinematic="!!status.cinematic"><div ref="viewport" class="viewport"/>
      <PauseOptions v-if="pauseVisible&&optionsArt" ref="pauseOptions" :data="optionsArt" :volumes="audioVolumes" @resume="resumePause" @closed="pauseVisible=false" @restart="pauseRestart" @quit="pauseQuit" @volume="changeVolume" @sound="audio.trigger($event)"/>
      <GameHud v-if="hudData" v-show="!pauseVisible&&!status.guiHidden&&!outcomeHudHidden&&status.outcome?.kind!=='defeat'" :data="hudData" :lives="status.lives" :gold="status.gold" :wave="status.wave" :total-waves="world?.session?.waves.totalWaves??0" :paused="status.paused" :disabled="loading||!!status.outcome||!optionsArt" @pause="pause"/>
      <WaveFlags v-if="incomingWave&&!status.outcome&&!status.cinematic&&(!tutorial||tutorial.waveVisible)" :incoming="incomingWave" :entrances="waveEntrances" :project="project" :time="world?.session?.time??0" :scale="(world?.viewportHeight??768)/768" :zoom="world?.cameraZoom??1" :confirm="waveConfirm" :muted="!!selected||!!world?.session?.powers.selected||!!world?.heroSelected||!!world?.rallySelected" :disabled="loading||status.paused||!!status.outcome||!!tutorial?.inputLocked||!!selected||!!world?.session?.powers.selected||!!world?.heroSelected||!!world?.rallySelected" @call="nextWave"/>
      <div v-if="status.curtains" class="curtains" aria-label="剧情动画"/>
      <HeroBar v-if="hudData" v-show="!pauseVisible&&!status.guiHidden&&!outcomeHudHidden&&status.outcome?.kind!=='defeat'" :data="hudData" :heroes="heroes" :powers="powers" :time="world?.session?.time??0" :disabled="loading||status.paused||!!status.outcome||!!status.cinematic||!!tutorial?.inputLocked" @hero="selectHero" @power="selectPower"/>
      <TutorialOverlay v-if="tutorial&&!pauseVisible" :balloon="tutorial.balloon" :focus="tutorial.focus" :balloons="balloons" :project="project" :viewport-height="world?.viewportHeight??0" :focus-settings="focusSettings"/>
      <TutorialOverlay v-else-if="heroBalloon&&!pauseVisible" :balloon="heroBalloon" :balloons="balloons" :project="project" :viewport-height="world?.viewportHeight??0" :focus-settings="focusSettings"/>
      <OutcomeView v-if="status.outcome&&outcomeVisible&&!comicVisible&&!mapVisible" :outcome="status.outcome" :iron="mode==='iron'" @restart="load(true)" @continue="continueOutcome" @ready="outcomeReady" @sound="audio.trigger($event)"/>
      <TowerMenu v-if="selected&&!selected.building&&world?.session&&towerMenuData" :site="selected" :session="world.session" :data="towerMenuData" :center="project(world.session.towers.menuPosition(selected))" :scale="world.viewportHeight/768" :gold="status.gold" :time="world.session.time" @build="build" @upgrade="upgradeTower" @sell="sellTower" @power="upgradeTowerPower" @rally="selectRally" @cancel="cancelBuild"/>
      <p v-if="selected&&buildError" role="alert" class="message">{{buildError}}</p>
      <p v-if="loading" class="message">正在载入…</p><p v-if="error" role="alert" class="message">{{ error }} <button @click="load()">重试</button></p>
    </section>
    <footer v-if="debug"><label>模式 <select v-model="mode" aria-label="模式" @change="load()"><option value="campaign">战役</option><option value="iron">钢铁挑战</option></select></label><button @click="toggleAudio" :aria-pressed="muted">{{muted?'开启声音':'静音'}}</button><span>{{ level }}-{{ mode==='campaign'?1:2 }} · {{ names[level-1] }}</span></footer>
  </main>
  </div>
</template>
<style scoped>
.game-shell:not(.debug-shell){position:fixed;left:50%;top:50%;width:min(100vw,177.777777778dvh);height:min(56.25vw,100dvh);max-width:none;padding:0;margin:0;transform:translate(-50%,-50%)}
.game-shell:not(.debug-shell) .game-frame{width:100%;height:100%;border:0;border-radius:0}
.game-shell:not(.debug-shell) .viewport{height:100%;aspect-ratio:auto}
.curtains{position:absolute;inset:0;pointer-events:none;z-index:15;border-block:6vh solid #000}

</style>
