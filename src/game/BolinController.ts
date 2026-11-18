import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {enemyIsDead} from './EnemyDeath.ts'
import {BolinMortarController} from './BolinMortarController.ts'
import {BolinMinesController} from './BolinMinesController.ts'
import type {HeroUnit,HeroRangedAttack} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
export interface BolinRangedState {phase:'idle'|'windup'|'tail';ts:number;at:number;target?:EnemyInstance;predicted?:Point;animation:string;flip:boolean;direction:number}
export class BolinController {
 readonly mortar=new BolinMortarController()
 readonly mines=new BolinMinesController()
 readonly states=new WeakMap<HeroUnit,BolinRangedState>()
 find:(hero:HeroUnit,attack:HeroRangedAttack)=>{enemy:EnemyInstance;point:Point}|undefined=()=>undefined
 present:(enemy:EnemyInstance)=>boolean=()=>true
 onCasing:(hero:HeroUnit,attack:HeroRangedAttack,time:number)=>void=()=>{}
 onShoot:(hero:HeroUnit,attack:HeroRangedAttack,target:EnemyInstance,from:Point,to:Point,time:number)=>void=()=>{}
 begin(h:HeroUnit,time:number){if(!this.states.has(h)){const skill=(h.template.hero as unknown as {skills:{skill_c:{disabled:boolean;bullet:string}}}).skills.skill_c;if(!skill.disabled)h.template.ranged!.attacks[0].bullet=skill.bullet;this.states.set(h,{phase:'idle',ts:0,at:0,animation:'idle',flip:false,direction:1});h.readyAt=time}}
 isAttacking(hero:HeroUnit){return this.mines.active(hero)||this.mortar.active(hero)||this.states.get(hero)?.phase!=='idle'&&this.states.has(hero)}
 private finish(h:HeroUnit,s:BolinRangedState){h.idleVisual={name:s.animation,at:s.at,loop:false};h.visualOverride=undefined;h.rangedUntil=undefined;s.phase='idle'}
 cancel(h:HeroUnit,time:number){const s=this.states.get(h);if(!s||s.phase==='idle')return;this.finish(h,s);const a=h.template.ranged!.attacks[0];s.ts=time-a.cooldown+10/30-1e-6}
 advance(h:HeroUnit,time:number){
  const a=h.template.ranged!.attacks[0]
  this.begin(h,time);const s=this.states.get(h)!
  if(this.mines.active(h)){this.mines.advance(h,time);return}
  if(s.phase==='idle'&&this.mortar.advance(h,time))return
  if(s.phase==='windup'){
   if(time-s.at<a.shoot_time){if(h.hp<=0||h.template.unit!.is_stunned||h.deploying){this.cancel(h,time);h.idleRequestedAt=time}return}
   if(!s.target||enemyIsDead(s.target)||!this.present(s.target)){const found=this.find(h,a);if(!found){this.cancel(h,time);h.idleRequestedAt=time;return}s.target=found.enemy;s.predicted=found.point}
   const o=a.bullet_start_offset[s.direction-1],hit=s.target.template.unit.hit_offset
   this.onShoot(h,a,s.target,{x:h.pos.x+(s.flip?-1:1)*o.x,y:h.pos.y+o.y},{x:s.predicted!.x+hit.x,y:s.predicted!.y+hit.y},time)
   s.ts=time;s.phase='tail'
  }
  if(s.phase==='tail'){
   if(nativeLogicAnimationFrame(Math.round(h.template.webAnimationDurations[s.animation]*30),time,s.at,false,30).runs>0){this.finish(h,s);return}
   if(h.hp<=0||h.template.unit!.is_stunned||h.deploying){this.cancel(h,time);h.idleRequestedAt=time}return
  }
  if(h.hp<=0||h.scriptLocked||h.template.unit!.is_stunned||h.deploying||h.moving||h.target||h.attack||time<(h.actionYieldUntil??0))return
  if(time-s.ts>a.cooldown){
   const found=this.find(h,a)
   if(!found)s.ts=time-a.cooldown+10/30-1e-6
   else{
    s.target=found.enemy;s.predicted={...found.point};this.onCasing(h,a,time)
    const rawAngle=Math.atan2(found.enemy.path.position.y-h.pos.y,found.enemy.path.position.x-h.pos.x),angle=rawAngle<0?rawAngle+Math.PI*2:rawAngle,degrees=angle*180/Math.PI
    s.direction=degrees>=35&&degrees<145?2:degrees>=215&&degrees<325?3:1;s.flip=angle>Math.PI/2&&angle<3*Math.PI/2;s.animation=['shoot','shootup','shootdown'][s.direction-1];s.at=time;s.phase='windup'
    h.facingLeft=s.flip;h.visualOverride={name:s.animation,at:time,loop:false};h.rangedUntil=time+h.template.webAnimationDurations[s.animation];return
   }
  }
  this.mines.advance(h,time)
 }
}
