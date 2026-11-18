import {enemyIsDead} from './EnemyDeath.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {duration?:number;aura?:{duration:number;duration_inc?:number;cycle_time:number;radius:number;vis_flags:number;vis_bans:number;mod:string};modifier?:{duration:number;vis_flags:number;vis_bans:number};magic_armor_red_factor?:number}
export interface SulfurArea {kind:'area';name:string;pos:Point;level:number;at:number;duration:number;last?:number;queued:boolean}
export interface SulfurModifier {kind:'modifier';name:string;pos:Point;enemy:EnemyInstance;targetId?:number;sourceId?:number;level:number;at:number;lost?:number;inserted:boolean;queued:boolean}
export interface SulfurDecal {kind:'decal';name:string;pos:Point;born:number;at?:number;alpha:number;fading:boolean;tweenAt:number;queued:boolean}
export type SulfurModel=SulfurArea|SulfurModifier|SulfurDecal
/** Original aura_apply_mod and temporary magic-armor insert/remove callbacks. */
export class CulverineSulfurRuntime {
 readonly decals=new Set<SulfurDecal>()
 readonly areas=new Set<SulfurArea>()
 readonly modifiers=new Set<SulfurModifier>()
 private templates:Record<string,Config>
 constructor(templates:Record<string,Config>){this.templates=templates}
 id:(model:object)=>number|undefined=()=>undefined
 present:(enemy:EnemyInstance)=>boolean=()=>true
 enemies:()=>EnemyInstance[]=()=>[]
 candidates:(enemy:EnemyInstance)=>SulfurModifier[]=enemy=>[...this.modifiers].filter(m=>m.enemy===enemy)
 onQueue:(model:SulfurModel)=>void=()=>{}
 onRemove:(model:SulfurModel)=>void=()=>{}
 queueDecal(name:string,pos:Point,time:number){const m:SulfurDecal={kind:'decal',name,pos:{...pos},born:time,alpha:255,fading:false,tweenAt:0,queued:false};this.onQueue(m);return m}
 queueArea(name:string,pos:Point,level:number){const m:SulfurArea={kind:'area',name,pos:{...pos},level,at:0,duration:0,queued:false};this.onQueue(m);return m}
 queueModifier(name:string,enemy:EnemyInstance,level:number,sourceId?:number){const m:SulfurModifier={kind:'modifier',name,pos:{x:0,y:0},enemy,targetId:this.id(enemy),sourceId,level,at:0,inserted:false,queued:false};this.onQueue(m);return m}
 insert(m:SulfurModel,time:number){
  if(m.kind==='decal'){this.decals.add(m);return true}
  m.at=time
  if(m.kind==='area'){const a=this.templates[m.name].aura!;m.duration=a.duration+m.level*(a.duration_inc??0);this.areas.add(m);return true}
  // Original mod_lifecycle compares the exact template, before own insert.
  for(const old of this.candidates(m.enemy)){if(old.name!==m.name)continue;if(old.level<m.level){this.removeLater(old);continue}if(old.level===m.level)old.at=time;return false}
  const e=m.enemy,c=this.templates[m.name].modifier!
  if(!this.present(e)||enemyIsDead(e)||e.template.enemy.can_accept_magic===false||e.template.vis.bans&c.vis_flags||e.template.vis.flags&c.vis_bans)return false
  m.lost=e.template.health.magic_armor*this.templates[m.name].magic_armor_red_factor!
  this.adjust(e,-m.lost);m.inserted=true;this.modifiers.add(m);return true
 }
 private adjust(e:EnemyInstance,delta:number){const h=e.template.health;h.raw_magic_armor=(h.raw_magic_armor??h.magic_armor)+delta;h.magic_armor=Math.max(0,Math.min(1,h.raw_magic_armor))}
 advance(m:SulfurModel,time:number){
  if(m.queued)return
  if(m.kind==='decal'){if(m.fading)return;m.at??=time;if(time-m.at>=this.templates[m.name].duration!)this.removeLater(m);return}
  if(m.kind==='area'){
   const a=this.templates[m.name].aura!
   m.last??=time-a.cycle_time
   if(a.duration>=0&&m.duration<time-m.at){this.removeLater(m);return}
   if(a.cycle_time>time-m.last)return
   m.last=time
   for(const e of this.enemies())if(!enemyIsDead(e)&&!(e.template.vis.flags&a.vis_bans)&&!(e.template.vis.bans&a.vis_flags)&&(e.path.position.x-m.pos.x)**2+(e.path.position.y-m.pos.y)**2/(.7*.7)<=a.radius*a.radius)this.queueModifier(a.mod,e,m.level,this.id(m))
  }else{
   const e=m.enemy
   if(!this.present(e)||enemyIsDead(e)||this.templates[m.name].modifier!.duration<=time-m.at){this.removeLater(m);return}
   m.pos=e.path.position
  }
 }
 private removeLater(m:SulfurModel){if(m.queued)return;m.queued=true;this.onRemove(m)}
 tween(m:SulfurModel,time:number){if(m.kind!=='decal'||!m.fading||m.queued)return;const age=time-m.tweenAt;m.alpha=255*Math.max(0,Math.min(1,(2-age)/2));if(age>=2)this.removeLater(m)}
 remove(m:SulfurModel,time:number=0){
  if(m.kind==='decal'){if(!m.fading){m.fading=true;m.queued=false;m.tweenAt=time;return false}this.decals.delete(m);return true}
  if(m.kind==='area')this.areas.delete(m)
  else{if(m.inserted&&this.present(m.enemy)){this.adjust(m.enemy,m.lost!);m.lost=0}m.inserted=false;this.modifiers.delete(m)}
  return true
 }
}
