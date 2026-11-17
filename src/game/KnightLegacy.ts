import data from '../../public/data/knight-legacy.json' with {type:'json'}
import {ArcherPierceStunSystem} from './ArcherPierceStun.ts'
import {soldierIsDead} from './SoldierHealth.ts'
import type {SoldierInstance} from './BarracksCombat'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
export interface KnightLegacyAura {source:SoldierInstance;sourceId?:number;pos:Point;started:boolean;inserted:boolean;lastCycle:number;waitAt?:number;queued:boolean}
/** Source-owned native C coroutine. Its eight-second wait outlives source removal. */
export class KnightLegacySystem {
 readonly models=new Set<KnightLegacyAura>()
 readonly stuns:ArcherPierceStunSystem
 private initialized=new WeakSet<SoldierInstance>()
 id:(s:SoldierInstance)=>number|undefined=()=>undefined
 present:(id:number|undefined)=>boolean=()=>true
 soldiers:()=>SoldierInstance[]=()=>[]
 onQueue:(m:KnightLegacyAura)=>void=()=>{}
 onRemove:(m:KnightLegacyAura)=>void=()=>{}
 constructor(random:()=>number){this.stuns=new ArcherPierceStunSystem(data.stuns,random)}
 private configure(s:SoldierInstance){const rank=s.powerLevels!.skill_c,a=s.template.melee.attacks;a[1].cooldown=a[0].cooldown*data.power.cd_mult[rank-1];a[1].mod=data.power.stun_mods[rank-1]}
 insertSoldier(s:SoldierInstance){if(s.name==='soldier_knights_lvl4'&&(s.powerLevels?.skill_c??0)>0)this.configure(s)}
 towerLoop(site:TowerSite,soldiers:SoldierInstance[]){
  if(site.tower!=='tower_knights_lvl4'||!site.powerChanges?.has('skill_c'))return
  for(const s of soldiers)if(s.siteId===site.id){s.powerLevels={...s.powerLevels,skill_c:site.powerLevels?.skill_c??0};(s.powerChanges??=new Set()).add('skill_c')}
  site.powerChanges.delete('skill_c')
 }
 private queue(s:SoldierInstance){this.onQueue({source:s,sourceId:this.id(s),pos:{x:0,y:0},started:false,inserted:false,lastCycle:0,queued:false})}
 soldierMain(s:SoldierInstance,outer:boolean){
  if(s.name!=='soldier_knights_lvl4')return
  if(!this.initialized.has(s)){this.initialized.add(s);if((s.powerLevels?.skill_c??0)>0)this.queue(s)}
  if(outer&&s.diedAt===undefined&&s.powerChanges?.has('skill_c')){s.powerChanges.delete('skill_c');this.configure(s);if(s.powerLevels?.skill_c===1)this.queue(s)}
 }
 insert(m:KnightLegacyAura){m.inserted=true;this.models.add(m);return true}
 advance(m:KnightLegacyAura,time:number){
  if(m.queued)return
  if(!m.started){m.started=true;if(this.present(m.sourceId))m.pos=m.source.pos}
  const attacks=m.source.template.melee.attacks
  if(m.waitAt!==undefined){if(time-m.waitAt<data.aura.attack_duration)return;attacks[1].disabled=true;attacks[0].disabled=false;m.waitAt=undefined;return}
  if(!this.present(m.sourceId)||soldierIsDead(m.source)){m.queued=true;this.onRemove(m);return}
  if(time-m.lastCycle<data.aura.aura.cycle_time)return
  m.lastCycle=time
  const radius=data.aura.aura.radius,found=this.soldiers().some(s=>{const dx=s.pos.x-m.pos.x,dy=s.pos.y-m.pos.y;return s!==m.source&&soldierIsDead(s)&&s.deathFinishedAt===undefined&&s.hpBeforeTimeout===undefined&&!s.reinforcementFadeTo&&(.7*.7)*(dx*dx)+dy*dy<=radius*radius*(.7*.7)})
  if(found){attacks[1].disabled=false;attacks[0].disabled=true;m.waitAt=time}
 }
 remove(m:KnightLegacyAura){m.inserted=false;this.models.delete(m);return true}
}
