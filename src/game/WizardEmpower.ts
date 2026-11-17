import {WizardEmpowerRuntime} from './WizardEmpowerRuntime.ts'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
interface Template {tower?:{kind?:number;can_be_mod?:boolean;range_offset:Point};vis?:{flags:number;bans:number};attacks?:{range:number;list:{extra_range?:number;enemy_check_range?:number;excluded_templates?:string[];vis_flags?:number;vis_bans?:number;exclude_tower_kind?:number[];duration?:number[];damage_factor?:number[]}[]}}
export interface EmpowerTarget {site:TowerSite;key:string;instance:number;entityId?:number}
export interface EmpowerBuff {target:TowerSite;source:TowerSite;targetInstance:number;level:number;factor:number;at:number;duration:number;remove?:boolean}
export interface EmpowerVisual {id:number;kind:'fx'|'decal'|'preview';source:TowerSite;target:TowerSite;targetInstance:number;level:number;queued:number;started?:number;at:number;spriteAt:number;duration:number;pos:Point;reverseAt?:number;remove?:boolean;fadeComplete?:boolean;validTarget?:boolean;targetKey?:string}
interface Enemy {hp:number;escapedAt?:number;path:{position:Point;finished:boolean}}
/** Original wizard B modifiers, independent decal clocks and queued reverse-fade removal. */
export class WizardEmpowerSystem {
 native=false
 readonly runtime:WizardEmpowerRuntime
 sitesInOrder:()=>TowerSite[]=()=>this.sites
 readonly buffs=new Map<string,EmpowerBuff>()
 readonly visuals:EmpowerVisual[]=[]
 private previews=new Map<TowerSite,EmpowerVisual[]>()
 private pending:{source:TowerSite;target:EmpowerTarget;level:number;factor:number;duration:number;queued:number}[]=[]
 private sites:TowerSite[]=[]
 private enemies:Enemy[]=[]
 private nextId=1
 private templates:Record<string,Template>
 constructor(templates:Record<string,Template>){this.templates=templates;this.runtime=new WizardEmpowerRuntime(this)}
 private valid(target:EmpowerTarget){return this.sites.includes(target.site)&&target.site.tower===target.key&&(target.site.instance??0)===target.instance}
 private within(source:TowerSite,pos:Point,radius:number){const o=this.templates[source.tower!].tower!.range_offset;return (pos.x-source.pos.x-o.x)**2+((pos.y-source.pos.y-o.y)/.7)**2<=radius*radius}
 findTargets(source:TowerSite,preview=false){const t=this.templates[source.tower!],a=t.attacks!.list[2],radius=t.attacks!.range*(source.rangeFactor??1)+a.extra_range!;return (this.native?this.sitesInOrder():this.sites).filter(s=>{
  if(s.building||s.towerBlocked||!this.within(source,s.pos,radius))return false
  if(preview&&!s.tower)return true
  if(s===source||!s.tower||a.excluded_templates?.includes(s.tower))return false
  const target=this.templates[s.tower];if(!(s.canBeMod??target.tower?.can_be_mod))return false
  if(preview){const v=s.vis??target.vis;return (!v||!(v.flags&a.vis_bans!)&&!(v.bans&a.vis_flags!)&&!a.exclude_tower_kind?.includes(target.tower?.kind??0)&&(this.native?this.runtime.candidates(this.runtime.id(s),'buff').length===0:!this.buffs.has(s.id)))}
  return true
 }).map(site=>({site,key:site.tower!,instance:site.instance??0,...(this.native?{entityId:this.runtime.id(site)}:{})}))}
 hasEnemy(source:TowerSite){const radius=this.templates[source.tower!].attacks!.list[2].enemy_check_range!;return this.enemies.some(e=>e.hp>0&&e.escapedAt===undefined&&!e.path.finished&&this.within(source,e.path.position,radius))}
 syncPreview(source:TowerSite,level:number,time:number){const old=this.previews.get(source),show=source.powerPreview==='skill_b';if(show&&!old&&level===0){const items=this.findTargets(source,true).map(({site})=>this.native?this.runtime.preview(source,site,time):this.visual('preview',source,site,0,time,-1,{x:site.pos.x,y:site.pos.y-.1}));this.previews.set(source,items)}else if(old&&!show){for(const v of old){if(this.native)this.runtime.removeLater(v as import('./WizardEmpowerRuntime').NativeEmpowerVisual);else v.remove=true;}this.previews.delete(source)}}
 cast(source:TowerSite,targets:EmpowerTarget[],level:number,time:number){const a=this.templates[source.tower!].attacks!.list[2];if(this.native){this.runtime.cast(source,targets,level,a.damage_factor![level-1],a.duration![level-1],time);return}for(const target of targets)this.pending.push({source,target,level,factor:a.damage_factor![level-1],duration:a.duration![level-1],queued:time})}
 private visual(kind:EmpowerVisual['kind'],source:TowerSite,target:TowerSite,level:number,queued:number,duration:number,pos:Point){const v:EmpowerVisual={id:this.nextId++,kind,source,target,targetInstance:target.instance??0,level,queued,at:queued,spriteAt:queued,duration,pos};this.visuals.push(v);return v}
 private removeBuff(buff:EmpowerBuff){if((buff.target.instance??0)===buff.targetInstance)buff.target.damageFactor=(buff.target.damageFactor??1)/buff.factor;if(this.buffs.get(buff.target.id)===buff)this.buffs.delete(buff.target.id)}
 alpha(v:EmpowerVisual,time:number){const duration=v.kind==='preview'?.1:.5,age=v.reverseAt!==undefined?time-v.reverseAt:time-v.spriteAt;return Math.round(255*Math.max(0,Math.min(1,v.reverseAt!==undefined?1-age/duration:age/duration)))}
 advance(time:number,sites:TowerSite[],enemies:Enemy[]){
  this.sites=sites;this.enemies=enemies
  if(this.native)return
  const removingBuffs=[...this.buffs.values()].filter(b=>b.remove),removingVisuals=this.visuals.filter(v=>v.remove)
  for(const p of this.pending){
   const target=p.target.site,valid=this.valid(p.target),old=this.buffs.get(target.id)
   if(valid){if(old?.level===p.level)old.at=time;else if(!old||old.level<p.level){if(old)this.removeBuff(old);target.damageFactor=(target.damageFactor??1)*p.factor;this.buffs.set(target.id,{source:p.source,target,targetInstance:p.target.instance,level:p.level,factor:p.factor,at:time,duration:p.duration})}}
   // Upgrading replaces the native entity ID: a stale cast must not refresh its retargeted FX.
   const fxMatches=this.visuals.filter(v=>v.kind==='fx'&&v.target===target&&v.targetInstance===p.target.instance&&(valid?v.validTarget:!v.validTarget&&v.targetKey===p.target.key))
   let rejected=false,spriteAt=time
   for(const old of fxMatches){if(old.level<p.level){old.remove=true;removingVisuals.push(old);spriteAt=old.spriteAt}else if(old.level===p.level){old.at=time;rejected=true;break}else{rejected=true;break}}
   if(!rejected){const fx=this.visual('fx',p.source,target,p.level,p.queued,p.duration,{x:target.pos.x,y:target.pos.y-1});fx.started=time;fx.at=time;fx.spriteAt=spriteAt;fx.validTarget=valid;fx.targetInstance=p.target.instance;fx.targetKey=p.target.key}
   const decal=this.visual('decal',p.source,target,p.level,p.queued,p.duration,{x:target.pos.x,y:target.pos.y-1.01});decal.started=time
  }
  this.pending=[]
  for(const b of removingBuffs)if(this.buffs.get(b.target.id)===b)this.removeBuff(b)
  for(const v of [...new Set(removingVisuals)]){
   if(!this.visuals.includes(v))continue
   if(v.kind==='preview'||!v.fadeComplete||v.reverseAt!==undefined)this.visuals.splice(this.visuals.indexOf(v),1)
   else{v.remove=false;v.reverseAt=time}
  }
  for(const b of this.buffs.values()){
   if(!sites.includes(b.target)||!b.target.tower||(b.target.instance??0)!==b.targetInstance){this.removeBuff(b);continue}
   if(time-b.at>=b.duration)b.remove=true
  }
  for(const [source,items]of this.previews)if(!sites.includes(source)||source.tower!=='tower_wizard_lvl4'){for(const v of items)v.remove=true;this.previews.delete(source)}
  for(const v of this.visuals){
   if(v.started===undefined)v.started=time
   if(v.reverseAt!==undefined){if(time-v.reverseAt>=.5)v.remove=true;continue}
   if(v.kind==='fx'&&(!v.validTarget||!sites.includes(v.target)||!v.target.tower||(v.target.instance??0)!==v.targetInstance||time-v.at>v.duration))v.remove=true
   if(v.kind==='decal'&&time-v.spriteAt>v.duration)v.remove=true
   if(time-v.spriteAt>=(v.kind==='preview'?.1:.5))v.fadeComplete=true
  }
 }
}
