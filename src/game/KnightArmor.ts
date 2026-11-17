import data from '../../public/data/knight-armor.json' with {type:'json'}
import {adjustSoldierPhysicalArmor,soldierIsDead} from './SoldierHealth.ts'
import type {SoldierInstance} from './BarracksCombat'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
export interface KnightArmorAura {source:SoldierInstance;sourceId?:number;pos:Point;started:boolean;inserted:boolean;lastCycle:number;applied:number;alpha:number;tweenAt?:number;reverse:boolean;disabled:boolean;queued:boolean}
/** Shipped knight A: permanent power armour + a source-owned hero-proximity aura. */
export class KnightArmorSystem {
 readonly models=new Set<KnightArmorAura>()
 id:(s:SoldierInstance)=>number|undefined=()=>undefined
 present:(id:number|undefined)=>boolean=()=>true
 heroes:()=>{pos:Point;hp:number}[]=()=>[]
 onQueue:(m:KnightArmorAura)=>void=()=>{}
 onRemove:(m:KnightArmorAura)=>void=()=>{}
 private initialized=new WeakSet<SoldierInstance>()
 insertSoldier(s:SoldierInstance){if(s.name==='soldier_knights_lvl4')for(let i=0;i<(s.powerLevels?.skill_a??0);i++)adjustSoldierPhysicalArmor(s,data.armorPerRank)}
 towerLoop(site:TowerSite,soldiers:SoldierInstance[]){
  if(site.tower!=='tower_knights_lvl4'||!site.powerChanges?.has('skill_a'))return
  for(const s of soldiers)if(s.siteId===site.id){s.powerLevels={...s.powerLevels,skill_a:site.powerLevels?.skill_a??0};(s.powerChanges??=new Set()).add('skill_a')}
  site.powerChanges.delete('skill_a')
 }
 private queue(s:SoldierInstance){this.onQueue({source:s,sourceId:this.id(s),pos:{x:0,y:0},started:false,inserted:false,lastCycle:0,applied:0,alpha:0,reverse:false,disabled:true,queued:false})}
 soldierMain(s:SoldierInstance,outer:boolean){
  if(s.name!=='soldier_knights_lvl4')return
  if(!this.initialized.has(s)){this.initialized.add(s);if((s.powerLevels?.skill_a??0)>0)this.queue(s)}
  if(outer&&s.diedAt===undefined&&s.powerChanges?.has('skill_a')){s.powerChanges.delete('skill_a');adjustSoldierPhysicalArmor(s,data.armorPerRank);if(s.powerLevels?.skill_a===1)this.queue(s)}
 }
 insert(m:KnightArmorAura){m.inserted=true;this.models.add(m);return true}
 advance(m:KnightArmorAura,time:number){
  if(m.queued)return
  if(!m.started){m.started=true;if(this.present(m.sourceId))m.pos=m.source.pos}
  if(!this.present(m.sourceId)||soldierIsDead(m.source)){m.queued=true;this.onRemove(m);return}
  const a=data.armorAura.aura
  if(time-m.lastCycle<a.cycle_time)return
  m.lastCycle=time
  const active=this.heroes().some(h=>{const dx=h.pos.x-m.source.pos.x,dy=h.pos.y-m.source.pos.y;return h.hp>0&&(.7*.7)*(dx*dx)+dy*dy<=a.radius*a.radius*(.7*.7)})
  const inc=active?data.heroArmor[(m.source.powerLevels?.skill_a??1)-1]:0
  if(inc!==m.applied){
   if((inc===0)!==(m.applied===0)){m.disabled=false;m.reverse=inc===0;m.tweenAt=time}
   adjustSoldierPhysicalArmor(m.source,inc-m.applied);m.applied=inc
  }
 }
 tween(m:KnightArmorAura,time:number){if(!m.disabled){const age=(time-m.tweenAt!)/.5;m.alpha=255*Math.max(0,Math.min(1,m.reverse?1-age:age))}}
 remove(m:KnightArmorAura){m.inserted=false;this.models.delete(m);return true}
}
