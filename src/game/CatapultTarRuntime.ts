import {enemyIsDead} from './EnemyDeath.ts'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
interface Config {aura?:{duration_conf:number[];cycle_time:number;radius:number;vis_flags:number;vis_bans:number;mod:string};modifier?:{duration:number;vis_flags:number;vis_bans:number};slow_factor_config?:number[]}
export interface NativeTarArea {kind:'area';name:string;id:number;pos:Point;level:number;at:number;spriteAt:number;last?:number;duration:number;alpha:number;fadeAt?:number;pending:boolean}
export interface NativeTarSlow {kind:'modifier';name:string;pos:Point;enemy:EnemyInstance;targetId?:number;sourceId?:number;level:number;factor:number;at:number;started:boolean;inserted:boolean;pending:boolean}
export type NativeTarModel=NativeTarArea|NativeTarSlow
/** Original aura_apply_mod, mod_lifecycle, mod_slow and the area's remove tween. */
export class CatapultTarRuntime {
 readonly areas=new Set<NativeTarArea>()
 readonly slows=new Set<NativeTarSlow>()
 private templates:Record<string,Config>
 constructor(templates:Record<string,object>){this.templates=templates as Record<string,Config>}
 id:(m:object)=>number|undefined=()=>undefined
 present:(e:EnemyInstance)=>boolean=()=>true
 enemies:()=>EnemyInstance[]=()=>[]
 candidates:(e:EnemyInstance)=>NativeTarSlow[]=e=>[...this.slows].filter(s=>s.enemy===e)
 onQueue:(m:NativeTarModel)=>void=()=>{}
 onRemove:(m:NativeTarModel)=>void=()=>{}
 queue(pos:Point,level:number){const a:NativeTarArea={kind:'area',name:'aura_catapult_skill_a',id:0,pos:{...pos},level,at:0,spriteAt:0,duration:0,alpha:255,pending:false};this.onQueue(a);a.id=this.id(a)!;return a}
 insert(m:NativeTarModel,time:number){
  m.at=time
  if(m.kind==='area'){m.spriteAt=time;m.duration=this.templates[m.name].aura!.duration_conf[m.level-1];this.areas.add(m);return true}
  for(const old of this.candidates(m.enemy)){if(old.name!==m.name)continue;if(old.level<m.level){this.removeLater(old);continue}if(old.level===m.level)old.at=time;return false}
  const e=m.enemy
  if(!this.present(e)||enemyIsDead(e)||e.template.motion.invulnerable)return false
  m.factor=this.templates[m.name].slow_factor_config![m.level-1];e.template.motion.max_speed*=m.factor;m.inserted=true;this.slows.add(m);return true
 }
 advance(m:NativeTarModel,time:number){
  if(m.pending)return
  if(m.kind==='area'){
   if(m.fadeAt!==undefined)return
   const c=this.templates[m.name].aura!;m.last??=time-c.cycle_time
   if(m.duration<time-m.at){this.removeLater(m);return}
   if(c.cycle_time>time-m.last)return;m.last=time
   for(const e of this.enemies())if(!enemyIsDead(e)&&!(e.template.vis.flags&c.vis_bans)&&!(e.template.vis.bans&c.vis_flags)&&(e.path.position.x-m.pos.x)**2+(e.path.position.y-m.pos.y)**2/(.7*.7)<=c.radius*c.radius){const s:NativeTarSlow={kind:'modifier',name:c.mod,pos:{x:0,y:0},enemy:e,targetId:this.id(e),sourceId:this.id(m),level:m.level,factor:0,at:0,started:false,inserted:false,pending:false};this.onQueue(s)}
  }else{
   if(!m.started){m.started=true;m.at=time;m.pos=m.enemy.path.position}
   if(!this.present(m.enemy)||enemyIsDead(m.enemy)||this.templates[m.name].modifier!.duration<time-m.at)this.removeLater(m)
  }
 }
 private removeLater(m:NativeTarModel){if(m.pending)return;m.pending=true;this.onRemove(m)}
 tween(m:NativeTarModel,time:number){if(m.kind!=='area'||m.fadeAt===undefined||m.pending)return;const age=time-m.fadeAt;m.alpha=255*Math.max(0,Math.min(1,1-age));if(age>=1)this.removeLater(m)}
 remove(m:NativeTarModel,time:number){
  if(m.kind==='area'){if(m.fadeAt===undefined){m.fadeAt=time;m.pending=false;return false}this.areas.delete(m)}
  else{if(m.inserted&&this.present(m.enemy))m.enemy.template.motion.max_speed/=m.factor;m.inserted=false;this.slows.delete(m)}
  return true
 }
}
