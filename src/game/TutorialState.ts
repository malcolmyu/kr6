import type {GameSession} from './GameSession'
import type {Point} from './types'
import type {TowerKind,TowerSite} from './TowerSystem'
export interface TutorialBalloon {id:string;pos?:Point}
export interface CameraRequest {pos:Point;duration:number;zoom:number;at:number;screenOffsetX?:number}
/** State driven by the original level01 manual TSV, not a replacement timeline. */
export class TutorialState {
  inputLocked=false
  movementLocked=false
  waveVisible=true
  allHolders=true
  enabledHolders=new Set<string>()
  balloon?:TutorialBalloon
  focus?:Point
  camera?:CameraRequest
  lesson=''
  lessonStartedAt=0
  menuOpen=false
  buildComplete=false
  unlockedPowers=new Set<string>()
  pendingHero?:{name:string;pos:Point;at:number}
  private session:GameSession
  constructor(session:GameSession){this.session=session}
  canSelect(site:TowerSite):boolean {return !this.inputLocked && (this.allHolders || this.enabledHolders.has(site.id))}
  canBuild(site:TowerSite,kind:TowerKind):boolean {return this.canSelect(site) && (this.lesson!=='build-tower' || this.buildComplete || site.id==='6' && kind==='archers')}
  canCallWave():boolean{return !this.inputLocked && this.waveVisible}
  openMenu(site:TowerSite) {
    this.menuOpen=true
    if(this.lesson==='build-tower' && !this.buildComplete && site.id==='6')this.balloon={id:'TB_BUILD',pos:{x:779,y:396}}
  }
  closeMenu(){this.menuOpen=false;if(this.lesson==='build-tower' && !this.buildComplete)this.balloon=undefined}
  onBuilt(site:TowerSite) {
    if(this.lesson!=='build-tower' || site.id!=='6')return
    this.buildComplete=true;site.attackBansOverride=4096
    const hp=this.session.enemies.find(e=>e.name==='enemy_bandit_tut')?.template.health.hp_max??24
    this.session.combat.damageOverrides.set('bullet_archers_lvl1',Math.ceil((Array.isArray(hp)?hp[1]:hp)/4))
  }
  handle(name:string,p:string[]=[],at=this.session.time) {
    switch(name) {
      case 'tutorial-stop-input':this.inputLocked=true;break
      case 'tutorial-resume-input':this.inputLocked=false;break
      case 'tutorial-stop-movement':this.movementLocked=true;break
      case 'tutorial-resume-movement':this.movementLocked=false;break
      case 'tutorial-hide-wave':this.waveVisible=false;break
      case 'tutorial-show-wave':this.waveVisible=true;break
      case 'disable-all-holders':this.allHolders=false;this.enabledHolders.clear();break
      case 'enable-all-holders':this.allHolders=true;break
      case 'enable-holder':this.enabledHolders.add(p[0]);break
      case 'tutorial-freeze-enemies':for(const enemy of this.session.enemies)if(enemy.hp>0 && enemy.escapedAt===undefined)enemy.frozen=true;break
      case 'tutorial-unfreeze-enemies':for(const enemy of this.session.enemies)enemy.frozen=false;break
      case 'kr6-tutorial-sequence':
        this.lesson=p[0];this.lessonStartedAt=at
        if(p[0]==='build-tower')this.balloon=undefined
        if(p[0]==='power-reinforcement'){this.unlockedPowers.add('reinforcements');this.session.combat.damageOverrides.delete('bullet_archers_lvl1');this.balloon={id:'TB_POWER1'}}
        if(p[0]==='power-rain-of-fire'){this.unlockedPowers.add('rain_of_fire');this.balloon={id:'TB_POWER2'}}
        break
      case 'kr6-tutorial-disable-archer-shoot': {
        const site=this.session.towers.sites.find(s=>s.tower==='tower_archers_lvl1')
        if(site){site.attackDisabled=true;const state=this.session.combat.shooters.get(site.id);if(state)state.firesAt=undefined}
        break
      }
      case 'kr6-tutorial-reenable-archer-shoot':for(const site of this.session.towers.sites)site.attackDisabled=false;break
      case 'show-balloon_tutorial-xy':this.balloon={id:p[0],pos:{x:Number(p[1]),y:Number(p[2])}};break
      case 'tutorial-show-balloon-find': {
        const found=this.find(p)
        if(found)this.balloon={id:p[found.consumed],pos:{x:found.pos.x+Number(p[found.consumed+1]||0),y:found.pos.y+Number(p[found.consumed+2]||0)}}
        break
      }
      case 'tutorial-hide-balloon':case 'hide-balloon-tutorial':this.balloon=undefined;break
      case 'tutorial-show-focus-circle-find': {
        const found=this.find(p)
        if(found)this.focus={x:found.pos.x+Number(p[found.consumed]||0),y:found.pos.y+Number(p[found.consumed+1]||0)}
        break
      }
      case 'hide-focus-circle':this.focus=undefined;break
      case 'tutorial-pan-zoom-center-find': {
        const found=this.find(p)
        if(found)this.camera={pos:{x:found.pos.x,y:found.pos.y+Number(p[found.consumed+2]||0)},screenOffsetX:Number(p[found.consumed+1]||0),duration:Number(p[found.consumed]||0),zoom:Number(p[found.consumed+3]||1.75),at}
        break
      }
      case 'kr6-tutorial-insert-hero':this.pendingHero={name:p[0],pos:{x:Number(p[1]),y:Number(p[2])},at};this.session.heroes.startIntro(this.pendingHero.pos,at);break
    }
  }
  private find(p:string[]):{pos:Point;consumed:number}|undefined {
    if(p[0]==='holder_with_id'){const site=this.session.towers.sites.find(s=>s.id===p[1]);if(site)return {pos:site.pos,consumed:2}}
    if(p[0]==='first_dead_enemy'){const enemy=this.session.enemies.find(e=>e.diedAt!==undefined);if(enemy)return {pos:enemy.path.position,consumed:1}}
    if(p[0]==='flags_with_id') {
      const index=Number(p[1])-1,level=this.session.levelData,ni=level.navigation!.ends[index]
      return {pos:level.paths.paths[index][0][ni-1],consumed:2}
    }
    if(p[0]==='next_wave_with_id') {
      const flag=this.session.levelData.data.entities_list.find(e=>e.template==='editor_wave_flag' && Number(e['editor.path_id'])===Number(p[1]))
      if(flag?.pos)return {pos:flag.pos,consumed:2}
    }
    if(p[0]==='entity_with_name' && this.pendingHero)return {pos:this.pendingHero.pos,consumed:2}
  }
}
