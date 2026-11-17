import {ArcherRangeRuntime} from './ArcherRangeRuntime.ts'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
import {resetSkillTimestamp} from './TowerSkillCooldown.ts'
interface Template {tower:{type:string;kind?:number;can_be_mod?:boolean;range_offset:Point};attacks?:{range:number};barrack?:{rally_range:number};vis?:{flags:number;bans:number};powers?:{skill_b?:{range_factor:number[]}};timed_attacks?:{list:{basic_attack?:boolean;static_cooldown?:boolean;base_range:number;cooldown:number;min_range:number;vis_flags:number;vis_bans:number;exclude_tower_kind:number[];sound:string}[]}}
interface State {site:TowerSite;instance:number;level:number;ts:number;lastEagle:number;maxRange:number;preview?:ArcherRangePreview[]}
export interface ArcherRangeBuff {source:TowerSite;target:TowerSite;sourceInstance:number;targetInstance:number;level:number;factor:number;at:number;spriteAt:number;tweenAt:number}
export interface ArcherRangePreview {id:number;source:TowerSite;target:TowerSite;queued:number;at?:number;remove?:boolean;offset:Point}
export interface ArcherRangeEagle {id:number;source:TowerSite;queued:number;sourceInstance:number;started?:number;remove?:boolean;draw:number}
/** Original archers skill_b branch with next-tick modifier insertion and source-owned cleanup. */
export class ArcherRangeSystem {
 native=false
 readonly runtime:ArcherRangeRuntime
 deferSources=false
 onQueueBuff:(buff:{source:TowerSite;target:TowerSite;level:number;factor:number;queued:number})=>void=()=>{}
 onQueueEagle:(eagle:ArcherRangeEagle)=>void=()=>{}
 readonly buffs=new Map<string,ArcherRangeBuff>()
 readonly previews:ArcherRangePreview[]=[]
 readonly eagles:ArcherRangeEagle[]=[]
 readonly states=new Map<string,State>()
 onSound:(name:string)=>void=()=>{}
 onCast:(site:TowerSite,time:number)=>void=()=>{}
 private pending:{source:TowerSite;target:TowerSite;sourceInstance:number;targetInstance:number;level:number;factor:number;queued:number}[]=[]
 private nextId=1
 private templates:Record<string,Template>
 constructor(templates:Record<string,Template>){this.templates=templates;this.runtime=new ArcherRangeRuntime(this)}
 resetSkillCooldowns(site:TowerSite,time:number){const state=this.states.get(site.id),template=site.tower?this.templates[site.tower]:undefined,a=template?.timed_attacks?.list[0];if(state&&template?.powers&&a){const ts=resetSkillTimestamp(a,time);if(ts!==undefined)state.ts=ts}}
 private rangeSource(site:TowerSite){return site.tower==='tower_archers_lvl4'}
 private eligible(site:TowerSite,source:TowerSite,radius:number,preview=false){
  if(site.building||site.towerBlocked)return false
  const t=this.templates[site.tower??site.holder],s=this.templates[source.tower!].timed_attacks!.list[0],o=this.templates[source.tower!].tower.range_offset
  const dx=site.pos.x-source.pos.x-o.x,dy=(site.pos.y-source.pos.y-o.y)/.7
  if(dx*dx+dy*dy>radius*radius)return false
  if(preview&&!site.tower)return true
  if(!site.tower||!(site.canBeMod??t.tower.can_be_mod)||!t.vis||t.vis.flags&s.vis_bans||t.vis.bans&s.vis_flags||s.exclude_tower_kind.includes(t.tower.kind??0))return false
  return !preview||(this.native?this.runtime.candidates(site).length===0:!this.buffs.has(site.id))
 }
 private removeBuff(id:string){const old=this.buffs.get(id);if(!old)return;old.target.rangeFactor=(old.target.rangeFactor??1)/old.factor;this.buffs.delete(id)}
 offset(site:TowerSite){const kind=this.templates[site.tower??site.holder].tower.type;return kind==='archers'||kind==='wizard'?{x:2,y:2}:{x:0,y:0}}
 advance(time:number,sites:TowerSite[]){
  if(this.native)return
  // Original simulation drains pending inserts before removals and then executes main scripts.
  for(const p of this.pending){
   const old=this.buffs.get(p.target.id)
   if(old&&old.level>=p.level)continue
   const spriteAt=old?.spriteAt??time
   if(old)this.removeBuff(p.target.id)
   const buff={...p,at:time,spriteAt,tweenAt:time}
   p.target.rangeFactor=(p.target.rangeFactor??1)*p.factor;this.buffs.set(p.target.id,buff)
  }
  this.pending=[]
  for(const [id,b]of this.buffs)if(!sites.includes(b.source)||!this.rangeSource(b.source)||(b.source.instance??0)!==b.sourceInstance||!b.target.tower||(b.target.instance??0)!==b.targetInstance)this.removeBuff(id)
  for(let i=this.previews.length-1;i>=0;i--){const p=this.previews[i];if(p.remove)this.previews.splice(i,1);else if(p.at===undefined)p.at=p.queued}
  for(let i=this.eagles.length-1;i>=0;i--){const e=this.eagles[i];if(e.remove||!this.rangeSource(e.source)||(e.source.instance??0)!==e.sourceInstance)this.eagles.splice(i,1);else if(e.started===undefined)e.started=time}
  for(const [id,state]of this.states)if(!sites.includes(state.site)||!this.rangeSource(state.site)||(state.site.instance??0)!==state.instance){if(state.preview)for(const p of state.preview)p.remove=true;this.states.delete(id)}
  if(!this.deferSources)for(const site of sites)this.advanceSource(site,time,sites)
  for(const eagle of this.eagles){if(eagle.started===undefined)continue;const age=time-eagle.started;eagle.draw=age>130/30?-1:age>90/30?10:age>60/30?-1:age>12/30?10:-1;if(time-eagle.queued>=167/30)eagle.remove=true}
 }
 private state(site:TowerSite,time:number){
  let state=this.states.get(site.id)
  if(!state||state.instance!==(site.instance??0)){const attack=this.templates[site.tower!].timed_attacks!.list[0];state={site,instance:site.instance??0,level:0,ts:0,lastEagle:time-20,maxRange:attack.base_range};this.states.set(site.id,state)}
  return state
 }
 syncUpgrades(site:TowerSite,time:number){
  if(!this.rangeSource(site))return
  const state=this.state(site,time),template=this.templates[site.tower!],attack=template.timed_attacks!.list[0],level=site.powerLevels?.skill_b??0
  if(level!==state.level){state.level=level;if(level>0){state.maxRange=attack.base_range*template.powers!.skill_b!.range_factor[level-1];if(level===1)state.ts=time-attack.cooldown}}
 }
 /** Called from the tower's own main after A and before C. Global maintenance
  * never starts a B cast while that same coroutine is yielded in A/C. */
 advanceSource(site:TowerSite,time:number,sites:TowerSite[]){
  if(!this.rangeSource(site))return false
  const template=this.templates[site.tower!],attack=template.timed_attacks!.list[0]
  const state=this.state(site,time)
  if(site.towerBlocked)return true
  this.syncUpgrades(site,time)
  const level=state.level
  if(site.powerPreview==='skill_b'&&!state.preview&&level===0){state.preview=sites.filter(target=>this.eligible(target,site,state.maxRange,true)).map(target=>({id:this.nextId++,source:site,target,queued:time,offset:this.offset(target)}));this.previews.push(...state.preview);if(this.native)for(const p of state.preview)this.runtime.queuePreview(p)}
  else if(state.preview&&site.powerPreview!=='skill_b'){for(const p of state.preview){if(this.native)this.runtime.removeLater(p as import('./ArcherRangeRuntime').NativeRangePreview);else p.remove=true}state.preview=undefined}
  if(!level||time-state.ts<=attack.cooldown)return false
  if(time-state.lastEagle>20){const eagle={id:this.nextId++,source:site,sourceInstance:site.instance??0,queued:time,draw:-1};this.eagles.push(eagle);this.onQueueEagle(eagle);if(this.native)this.runtime.queueEagle(eagle);state.lastEagle=time}
  const factor=template.powers!.skill_b!.range_factor[level-1],targets=sites.filter(target=>this.eligible(target,site,state.maxRange)&&(this.native?Math.max(1,...this.runtime.candidates(target).map(m=>m.factor)):(this.buffs.get(target.id)?.factor??1))<factor)
  state.ts=time
  if(!targets.length){state.ts=time-attack.cooldown+attack.cooldown-1e-6;return false}
  this.onSound(attack.sound);this.onCast(site,time)
  for(const target of targets){const pending={source:site,target,sourceInstance:site.instance??0,targetInstance:target.instance??0,level,factor,queued:time};if(this.native)this.runtime.queueBuff(pending);else this.pending.push(pending);this.onQueueBuff(pending)}
  return false
 }

}
