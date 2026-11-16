import data from '../../public/data/royal-edict.json' with {type:'json'}
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {RoyalEdictSystem,RoyalBuff,RoyalCast} from './RoyalEdictSystem'
import type {TowerSite} from './TowerSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Control {kind:'control';cast:RoyalCast;started?:number;poll?:number;removed?:boolean}
export interface NativeRoyalBuff extends RoyalBuff {kind:'buff';pos:Point;inserted:boolean;name:string;ts:number;loop:boolean;alpha:number;phase:'start'|'loop'|'fade';modifierTs:number;fadeAt?:number;pendingRemove:boolean;appliedId?:number}
export interface NativeRoyalActor {kind:'actor';template:string;pos:Point;created:number;inserted:boolean;at?:number;name:string;ts:number;loop:boolean;alpha:number;phase:'new'|'start'|'idle'|'end'|'wait'|'fade'|'done';idleAt?:number;fadeAt?:number;queued?:boolean}
interface Gold {kind:'gold';enemy:EnemyInstance;duration:number;at?:number;queued?:boolean}
export type RoyalModel=Control|NativeRoyalBuff|NativeRoyalActor|Gold
/** Original control31714/31746, buff31816/31890/31975 and actor1592/535/494. */
export class RoyalRuntime {
 readonly actors:NativeRoyalActor[]=[]
 onQueue:(name:string,model:RoyalModel)=>void=()=>{}
 onRemove:(model:RoyalModel)=>void=()=>{}
 findSites:(global:boolean)=>TowerSite[]=()=>[]
 findEnemies:(pos:Point,range:number,global:boolean)=>EnemyInstance[]=()=>[]
 siteId:(site:TowerSite)=>number|undefined=()=>undefined
 present:(enemy:EnemyInstance)=>boolean=()=>true
 private owner:RoyalEdictSystem
 private random:()=>number
 constructor(owner:RoyalEdictSystem,random:()=>number){this.owner=owner;this.random=random}
 queue(cast:RoyalCast){this.onQueue('power_royal_edict_control',{kind:'control',cast})}
 insert(model:RoyalModel,time:number):boolean{
  const o=this.owner
  if(model.kind==='control'){
   for(const site of this.findSites(model.cast.global)){
    const dx=site.pos.x-model.cast.pos.x,dy=site.pos.y-model.cast.pos.y
    if(!model.cast.global&&dx*dx+dy*dy/(.7*.7)>o.control.range**2)continue
    const b:NativeRoyalBuff={kind:'buff',site,pos:{x:site.pos.x,y:site.pos.y-.1},born:time,loopAt:time,expiresAt:time+o.modifier.modifier.duration,damageFactor:o.modifier.damage_factor,rangeFactor:o.modifier.range_factor,lastConfetti:time,inserted:false,name:'start',ts:time,loop:false,alpha:255,phase:'start',modifierTs:time,pendingRemove:false}
    this.onQueue('mod_power_royal_edict_towerbuff',b)
   }
  }else if(model.kind==='buff'){
   const current=o.buffs.get(model.site.id) as NativeRoyalBuff|undefined
   if(current?.kind==='buff'){current.modifierTs=time;return false}
   if(this.siteId(model.site)===undefined)return false
   model.inserted=true;model.appliedId=this.siteId(model.site);model.site.damageFactor=(model.site.damageFactor??1)*model.damageFactor;model.site.rangeFactor=(model.site.rangeFactor??1)*model.rangeFactor;o.buffs.set(model.site.id,model)
   if(o.modifier.respawn_barracks)o.onRespawn(model.site)
   if(o.modifier.reset_skills_cd)o.onResetSkills(model.site)
  }else if(model.kind==='actor'){model.inserted=true;model.at=time}
  else if(!this.present(model.enemy))return false
  else model.at=time
  return true
 }
 private actor(template:string,pos:Point,time:number){
  const a:NativeRoyalActor={kind:'actor',template,pos:{...pos},created:time,inserted:false,name:template==='decal_power_royal_edict_area'?'loop':'idle',ts:template==='decal_power_royal_edict_area'?time:0,loop:true,alpha:255,phase:'new'}
  this.actors.push(a);this.onQueue(template,a)
 }
 private duration(template:string,name:string){const prefix=(data.templates as unknown as Record<string,{render:{sprites:{prefix:string}[]}}>)[template].render.sprites[0].prefix;return Math.round((data.exos as unknown as Record<string,Record<string,number>>)[prefix][name]*30)}
 private finished(template:string,name:string,time:number,ts:number){return nativeLogicAnimationFrame(this.duration(template,name),time,ts,false,30).runs>0}
 advance(model:RoyalModel,time:number){
  const o=this.owner
  if(model.kind==='control'){
   if(model.removed)return
   if(model.started===undefined){
    model.started=time;this.actor('decal_power_royal_edict_king',model.cast.pos,time);this.actor('decal_power_royal_edict_rug',model.cast.pos,time);this.actor('decal_power_royal_edict_area',model.cast.pos,time)
    o.onSound(model.cast.global?o.control.sound_cast_upgraded:o.control.sound_cast)
   }
   if(model.poll!==undefined&&time-model.poll<10/30)return
   if(!model.cast.goldEnabled||time-model.started>=model.cast.goldDuration){model.removed=true;this.onRemove(model);return}
   for(const e of this.findEnemies(model.cast.pos,o.control.range,model.cast.global))if(!model.cast.goldTargets.has(e.id)){
    model.cast.goldTargets.add(e.id);this.onQueue('mod_power_royal_edict_golddebuff',{kind:'gold',enemy:e,duration:model.cast.goldDuration-(time-model.started)})
   }
   model.poll=time
  }else if(model.kind==='buff'){
   if(model.pendingRemove)return
   if(!model.site.tower){model.pendingRemove=true;this.onRemove(model);return}
   if(model.phase!=='start')model.appliedId=this.siteId(model.site)
   if(model.phase==='start'){
    if(!this.finished('mod_power_royal_edict_towerbuff','start',time,model.ts))return
    model.name='loop';model.loop=true;model.modifierTs=time;model.loopAt=time;model.lastConfetti=time;model.expiresAt=time+o.modifier.modifier.duration;model.phase='loop'
   }
   if(model.phase==='loop'){
    if(time-model.modifierTs>=o.modifier.modifier.duration-1){model.phase='fade';model.fadeAt=time}
    else if(o.modifier.confetti&&time-model.lastConfetti>o.modifier.confetti_cycle_time){const r=o.modifier.confetti_range;this.actor(o.modifier.confetti,{x:model.pos.x+(this.random()*2-1)*r,y:model.pos.y+11+(this.random()*2-1)*r},time);model.lastConfetti=time}
   }
   if(model.phase==='fade'){
    if(time-model.modifierTs<o.modifier.modifier.duration-1){model.phase='start';model.name='start';model.ts=time;model.loop=false;model.fadeAt=undefined;return}
    if(time-model.fadeAt!>=1){model.pendingRemove=true;this.onRemove(model)}
   }
  }else if(model.kind==='actor'){
   if(model.phase==='done'||model.phase==='fade')return
   if(model.template==='decal_power_royal_edict_area'){
    if(model.phase==='new')model.phase='wait'
    if(time-model.at!>=1.5){model.phase='done';this.onRemove(model)}
    return
   }
   if(model.template==='decal_power_royal_edict_confetti'){
    if(model.phase==='new'){model.name='run';model.ts=time;model.loop=true;model.phase='start'}
    if(this.finished(model.template,model.name,time,model.ts)){model.phase='done';this.onRemove(model)}
    return
   }
   if(model.phase==='new'){model.name='lvl1run';model.ts=time;model.loop=false;model.phase='start'}
   if(model.phase==='start'&&this.finished(model.template,model.name,time,model.ts)){model.name='lvl1loop';model.loop=true;model.idleAt=time;model.phase='idle'}
   if(model.phase==='idle'&&time-model.idleAt!>=.5){model.name='lvl1loopend';model.ts=time;model.loop=false;model.phase='end'}
   if(model.phase==='end'&&this.finished(model.template,model.name,time,model.ts)){model.phase='done';this.onRemove(model)}
  }else{
   if(model.queued)return
   if(!this.present(model.enemy)||time-model.at!>=model.duration){model.queued=true;this.onRemove(model);return}
   if(model.enemy.hp<=0){o.onGold((data.templates.mod_power_royal_edict_golddebuff as {extra_gold:number}).extra_gold,model.enemy.path.position);model.queued=true;this.onRemove(model)}
  }
 }
 tween(model:RoyalModel,time:number){
  if(model.kind==='buff')model.alpha=model.fadeAt===undefined?255:255*Math.max(0,1-(time-model.fadeAt))
  if(model.kind==='actor'&&model.template==='decal_power_royal_edict_area'){
   model.alpha=model.fadeAt===undefined?255*Math.max(0,Math.min(1,time-model.created)):255*Math.max(0,1-(time-model.fadeAt))
   if(model.phase==='fade'&&time-model.fadeAt!>=1&&!model.queued){model.queued=true;this.onRemove(model)}
  }
 }
 remove(model:RoyalModel,time:number):boolean{
  if(model.kind==='actor'){
   if(model.template==='decal_power_royal_edict_area'&&model.fadeAt===undefined){model.fadeAt=time;model.phase='fade';return false}
   this.actors.splice(this.actors.indexOf(model),1)
  }else if(model.kind==='buff'){
   if(this.siteId(model.site)===model.appliedId){model.site.damageFactor=(model.site.damageFactor??1)/model.damageFactor;model.site.rangeFactor=(model.site.rangeFactor??1)/model.rangeFactor}
   if(this.owner.buffs.get(model.site.id)===model)this.owner.buffs.delete(model.site.id)
  }
  return true
 }
}
