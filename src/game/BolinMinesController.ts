import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {luaSort} from './LuaSort.ts'
import {bolinMineOrigin,bolinMinePositions} from './BolinMinePlacement.ts'
import type {LevelData,Point} from './types'
import type {HeroUnit} from './HeroSystem'
export interface MineAttack {disabled:boolean;cooldown:number;ts:number;min_range:number;max_range:number;range_offset:number;max_trigger_range:number;max_mines:number;min_dist_between_mines:number;throw_time:number;animations:string[];bullet:string;bullet_start_offset:Point;vis_flags:number;vis_bans:number}
export interface ActiveBolinMine {pos:Point;trigger:boolean}
interface Cast {phase:'start'|'throw'|'tail'|'end';at:number;animationAt:number;point:Point;origin:Point}
export class BolinMinesController {
 readonly casts=new WeakMap<HeroUnit,Cast>()
 readonly timestamps=new WeakMap<HeroUnit,number>()
 readonly maxNear=new WeakMap<HeroUnit,boolean>()
 level?:LevelData
 random:()=>number=Math.random
 wave:()=>number=()=>0
 nearbyEnemy:(h:HeroUnit,a:MineAttack)=>boolean=()=>false
 mines:()=>ActiveBolinMine[]=()=>[]
 onThrow:(h:HeroUnit,a:MineAttack,to:Point,time:number)=>void=()=>{}
 attack(h:HeroUnit){return (h.template as unknown as {timed_attacks:{list:MineAttack[]}}).timed_attacks.list[1]}
 active(h:HeroUnit){return this.casts.has(h)}
 private pose(h:HeroUnit,c:Cast,index:number,time:number){c.animationAt=time;h.visualOverride={name:this.attack(h).animations[index],at:time,loop:false};h.rangedUntil=time+h.template.webAnimationDurations[h.visualOverride.name];h.idleRequestedAt=undefined}
 private finished(h:HeroUnit,c:Cast,index:number,time:number){return nativeLogicAnimationFrame(Math.round(h.template.webAnimationDurations[this.attack(h).animations[index]]*30),time,c.animationAt,false,30).runs>0}
 private release(h:HeroUnit){if(h.visualOverride)h.idleVisual={...h.visualOverride,loop:false};h.visualOverride=undefined;h.rangedUntil=undefined;this.casts.delete(h)}
 advance(h:HeroUnit,time:number,canStart=true){
  const a=this.attack(h),c=this.casts.get(h);this.timestamps.set(h,this.timestamps.get(h)??a.ts)
  if(c){
   if(c.phase==='start'){
    if(!this.finished(h,c,0,time)){if(h.hp<=0||h.template.unit?.is_stunned||h.deploying)this.release(h);return true}
    c.phase='throw';this.pose(h,c,1,time)
   }
   if(c.phase==='throw'){
    if(time-c.animationAt<a.throw_time){if(h.hp<=0||h.template.unit?.is_stunned||h.deploying)this.release(h);return true}
    this.onThrow(h,a,c.point,time)
    const all=this.mines();if(all.length>=a.max_mines){const distant=luaSort(all.filter(m=>(m.pos.x-c.origin.x)**2+(m.pos.y-c.origin.y)**2>a.max_range*a.max_range),(x,y)=>(y.pos.x-c.origin.x)**2+(y.pos.y-c.origin.y)**2<(x.pos.x-c.origin.x)**2+(x.pos.y-c.origin.y)**2);if(distant.length)distant[0].trigger=true}
    this.timestamps.set(h,c.at);const skill=(h.template.hero as unknown as {skills:{skill_b:{level:number;xp_gain:number[]}}}).skills.skill_b;h.xpQueued+=skill.xp_gain[skill.level-1];c.phase='tail'
   }
   if(c.phase==='tail'){
    if(!this.finished(h,c,1,time)){if(h.hp<=0||h.template.unit?.is_stunned||h.deploying)this.release(h);return true}
    c.phase='end';this.pose(h,c,2,time)
   }
   if(c.phase==='end'&&(this.finished(h,c,2,time)||h.hp<=0||h.template.unit?.is_stunned||h.deploying))this.release(h)
   return true
  }
  if(!canStart||a.disabled||h.hp<=0||h.scriptLocked||h.deploying||h.moving||h.target||h.attack||h.template.unit?.is_stunned||this.maxNear.get(h)||this.wave()<=0||time-(this.timestamps.get(h)??0)<=a.cooldown)return false
  const retry=()=>this.timestamps.set(h,time-a.cooldown+10/30-1e-6)
  if(this.nearbyEnemy(h,a)){retry();return false}
  const origin=bolinMineOrigin(this.level!,h.pos,a.range_offset);if(!origin){retry();return false}
  const near=this.mines().filter(m=>(m.pos.x-origin.x)**2+(m.pos.y-origin.y)**2<=a.max_range*a.max_range)
  if(near.length>=a.max_mines){this.maxNear.set(h,true);retry();return false}
  const points=bolinMinePositions(this.level!,origin,a.min_range,a.max_range,near.map(m=>m.pos),a.min_dist_between_mines)
  if(!points.length){this.maxNear.set(h,true);retry();return false}
  const cast:Cast={phase:'start',at:time,animationAt:time,origin:{...origin},point:{...points[Math.floor(this.random()*points.length)]}}
  this.casts.set(h,cast);this.pose(h,cast,0,time);return true
 }
}
