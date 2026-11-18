import {resetSkillTimestamp} from './TowerSkillCooldown.ts'
import type {SkillClock} from './TowerSkillCooldown'
import type {ThrottleBuff} from './CulverineThrottleRuntime'
import times from '../../public/data/culverine-exo-times.json' with {type:'json'}
import type {Point} from './types'
import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
export interface CulverinePart {prefix?:string;name:string;ts:number;flip:boolean;hidden:boolean;loop:boolean}
export interface CulverineAttack extends SkillClock {bullet:string;animation:string;shoot_time:number;time_to_rest:number;animation_duration:number;cooldown:number;animation_reload?:string;critical_chance:number;sound:string;bullet_start_offset:Point[];ts:number;disabled?:boolean}
interface SulfurAttack extends SkillClock {min_health:number;buff_time:number;rest_time:number;rate_of_fire:number;shots:number;buff_fg:string;buff_bg:string;sound:string;bullet:string;cooldown:number;ts:number;disabled:boolean;animation:string;animation_reload:string;anim_length:number;cast_time:number;min_targets:number;min_magic_res:number;sound_prep:string;bullet_start_offset:Point}
interface Template {powers?:{skill_a:{cooldown:number[]};skill_c:{cooldown:number[];shots:number[];rate_of_fire:number[]}};timed_attacks?:{list:SulfurAttack[]};tower:{level:number;range_offset?:Point};render:{sprites:{prefix?:string;name:string;hidden?:boolean;loop?:boolean}[]};attacks:{list:CulverineAttack[]}}
export interface CulverineTowerState {key:string;normalLoaded:boolean;throttleShots:number;throttleTargetWaited?:boolean;throttleFallback?:Point;throttleFg?:ThrottleBuff;throttleBg?:ThrottleBuff;parts:CulverinePart[];timedAttacks:SulfurAttack[];sulfurPoint?:Point;sulfurVisual?:{z:number;sort_y_offset:number};attacks:CulverineAttack[];selectedAttack:number;cycleAttack:number;rankB:number;phase:'idle'|'windup'|'rest'|'body'|'reload'|'yield'|'sulfur-load'|'sulfur-cast'|'sulfur-z'|'sulfur-animation'|'sulfur-shooter'|'sulfur-idle'|'sulfur-reload'|'throttle-buff'|'throttle-load'|'throttle-target'|'throttle-shot'|'throttle-windup'|'throttle-rest'|'throttle-rate'|'throttle-reload';phaseAt:number;attackAt:number;target?:EnemyInstance;point:Point;quadrant:number;fired:boolean}
export interface CulverineTarget {enemy:EnemyInstance;point:Point}
/** Native basic/B ray attacks, sulfur cast and C burst coroutine phases. */
export class CulverineTowerSystem {
 native=false
 readonly states=new Map<string,CulverineTowerState>()
 private templates:Record<string,Template>
 private random:()=>number
 onSound:(name:string,options?:{delay?:number})=>void=()=>{}
 onShoot:(name:string,from:Point,to:Point,target:EnemyInstance|undefined,factor:number,time:number,site:TowerSite)=>void=()=>{}
 findThrottle:(site:TowerSite,seconds:number)=>CulverineTarget[]=()=>[]
 onThrottleBuff:(name:string,pos:Point,time:number)=>ThrottleBuff=()=>{throw Error('Missing native C queue')}
 onThrottleRemove:(model:ThrottleBuff)=>void=()=>{}
 findSulfur:(site:TowerSite,seconds:number)=>CulverineTarget[]=()=>[]
 onSulfurShoot:(name:string,from:Point,to:Point,factor:number,time:number,visual:{z:number;sort_y_offset:number})=>void=()=>{}
 constructor(templates:Record<string,Template>,random:()=>number=Math.random){this.templates=templates;this.random=random}
 private pose(s:CulverineTowerState,site:TowerSite,name:string,point:Point,time:number,loop:boolean){
  const angle=Math.atan2(point.x-site.pos.x,point.y-site.pos.y)*180/Math.PI,abs=Math.abs(angle),q=abs<35?1:abs<70?2:abs<120?3:4,flip=angle<=0
  const set=(part:CulverinePart,n:string)=>{part.name=n;part.flip=flip;part.loop=loop;if(!loop)part.ts=time}
  set(s.parts[1],name+['up','back','','down'][q-1]);s.parts[3].hidden=q!==3;if(q===3)set(s.parts[3],name)
  s.quadrant=q
 }
 private start(s:CulverineTowerState,site:TowerSite,t:Template,target:CulverineTarget,time:number){
  s.cycleAttack=s.selectedAttack;const a=s.attacks[s.cycleAttack]
  this.pose(s,site,a.animation,target.point,time,false)
  for(const i of [2,4]){const p=s.parts[i];p.name=a.animation;p.ts=time;p.flip=false;p.loop=false}
  s.phase='windup';s.phaseAt=time;a.ts=time;if(s.cycleAttack===0)s.attackAt=time;s.target=target.enemy;s.point={...target.point};s.fired=false
 }
 resetSkillCooldowns(site:TowerSite,time:number){const s=this.states.get(site.id);if(!s)return;for(const a of [...s.attacks,...s.timedAttacks]){const ts=resetSkillTimestamp(a,time);if(ts!==undefined)a.ts=ts}}
 removeThrottleEffects(id:string){const s=this.states.get(id);if(s?.throttleFg)this.onThrottleRemove(s.throttleFg);if(s?.throttleBg)this.onThrottleRemove(s.throttleBg)}
 private readyThrottle(s:CulverineTowerState,site:TowerSite,time:number){const a=s.timedAttacks[1];if(!a||a.disabled||s.normalLoaded||site.towerBlocked)return false;const found=this.findThrottle(site,1/30);return time-a.ts>a.cooldown&&found.length>0&&(found.length>=a.min_targets||found.some(t=>t.enemy.hp>=a.min_health))}
 private startThrottle(s:CulverineTowerState,site:TowerSite,time:number){const a=s.timedAttacks[1],look=this.findThrottle(site,1/30)[0];if(look)this.pose(s,site,'idle',look.enemy.path.position,time,true);this.onSound(a.sound_prep,{delay:21/30});Object.assign(s.parts[2],{name:a.animation_reload,ts:time,loop:false});s.throttleShots=0;s.throttleTargetWaited=false;s.phase='throttle-buff';s.phaseAt=time}
 private applyB(site:TowerSite,s:CulverineTowerState,time:number){
  if(site.powerChanges?.delete('skill_a')){const a=s.timedAttacks[0],rank=site.powerLevels?.skill_a??0;a.disabled=false;a.cooldown=this.templates[site.tower!].powers!.skill_a.cooldown[rank-1];a.bullet=`bullet_culverine_skill_a_lvl${rank}`;if(rank===1)a.ts=time-a.cooldown}
  if(site.powerChanges?.delete('skill_c')){const a=s.timedAttacks[1],rank=site.powerLevels?.skill_c??0,c=this.templates[site.tower!].powers!.skill_c;a.disabled=false;a.cooldown=c.cooldown[rank-1];a.shots=c.shots[rank-1];a.rate_of_fire=c.rate_of_fire[rank-1];if(rank===1)a.ts=time-a.cooldown}
  if(!site.powerChanges?.delete('skill_b'))return
  const a=s.attacks[1];if(!a)return
  s.rankB=site.powerLevels?.skill_b??0;a.disabled=false;a.bullet=`bullet_culverine_skill_b_lvl${s.rankB}`;s.selectedAttack=1
 }
 private finished(p:CulverinePart,time:number){const d=(times as Record<string,Record<string,number>>)[p.prefix!][p.name];return nativeLogicAnimationFrame(Math.round(d*30),time,p.ts,p.loop,30).runs>0}
 advance(time:number,sites:TowerSite[],pick:(site:TowerSite,ranged?:boolean)=>CulverineTarget|undefined,updateSites:TowerSite[]=sites){
  const live=new Set(sites.filter(site=>site.tower?.startsWith('tower_culverine_')).map(site=>site.id))
  for(const site of updateSites){if(!site.tower?.startsWith('tower_culverine_'))continue;
   const t=this.templates[site.tower],a=t.attacks.list[0];let s=this.states.get(site.id)
   if(!s||s.key!==site.tower){s={key:site.tower,normalLoaded:false,throttleShots:0,timedAttacks:structuredClone(t.timed_attacks?.list??[]),attacks:structuredClone(t.attacks.list),selectedAttack:0,cycleAttack:0,rankB:0,parts:t.render.sprites.map(p=>({prefix:p.prefix,name:this.native?p.name.replace('%04i',String(site.terrain??1).padStart(4,'0')):p.name,ts:0,flip:false,hidden:p.hidden??false,loop:p.loop??true})),phase:'idle',phaseAt:time,attackAt:time-a.cooldown,point:{x:site.pos.x+1,y:site.pos.y},quadrant:3,fired:false};s.attacks[0].ts=s.attackAt;this.states.set(site.id,s);this.pose(s,site,'idle',s.point,time,true)}
   if(s.phase==='yield'){s.phase='idle'}
   if(s.phase==='idle'){
    if(site.towerBlocked||site.attackDisabled)continue
    this.applyB(site,s,time)
    if(this.readyThrottle(s,site,time)){this.startThrottle(s,site,time);continue}
    const look=pick(site,false);if(look){this.pose(s,site,'idle',look.enemy.path.position,time,true);const target=pick(site,true);if(target)this.start(s,site,t,target,time);else{const selected=s.attacks[s.selectedAttack];selected.ts=time-selected.cooldown+10*(1/30)-1e-6;if(s.selectedAttack===0)s.attackAt=selected.ts}}
    continue
   }
   if(s.phase.startsWith('throttle-')){
    const a=s.timedAttacks[1],body=s.parts[2]
    const endShots=()=>{this.onThrottleRemove(s.throttleFg!);Object.assign(body,{name:s.attacks[s.selectedAttack].animation_reload!,ts:time,flip:false,loop:false});s.phase='throttle-reload'}
    if(s.phase==='throttle-buff'){
     if(time-s.phaseAt<a.buff_time)continue
     const offset=t.tower.range_offset??{x:0,y:0},at={x:site.pos.x+offset.x,y:site.pos.y+offset.y};s.throttleFg=this.onThrottleBuff(a.buff_fg,at,time);s.throttleBg=this.onThrottleBuff(a.buff_bg,at,time);s.phase='throttle-load'
    }
    if(s.phase==='throttle-load'){
     if(!this.finished(body,time))continue
     s.phase='throttle-target'
    }
    if(s.phase==='throttle-target'){
     const target=this.findThrottle(site,1/30)[0]
     if(!target){s.throttleTargetWaited=true;continue}
     s.throttleFallback={...target.point};s.phase='throttle-shot'
     if(s.throttleTargetWaited){s.throttleTargetWaited=false;continue}
    }
    if(s.phase==='throttle-shot'){
     if(s.throttleShots>=a.shots||site.towerBlocked)endShots()
     else{
      const target=this.findThrottle(site,1/30)[0];s.target=target?.enemy;s.point=target?{...target.point}:{...s.throttleFallback!};if(target)s.throttleFallback={...target.point}
      const attack=s.attacks[s.selectedAttack];s.cycleAttack=s.selectedAttack;this.pose(s,site,attack.animation,s.point,time,false)
      Object.assign(body,{name:a.animation,ts:time,flip:false,loop:false});Object.assign(s.parts[4],{name:attack.animation,ts:time,flip:false,loop:false});s.phase='throttle-windup';s.phaseAt=time
     }
    }
    if(s.phase==='throttle-windup'){
     const attack=s.attacks[s.cycleAttack]
     if(time-s.phaseAt<attack.shoot_time)continue
     if(site.towerBlocked)endShots()
     else{
      s.throttleBg!.spriteAt=time;this.onSound(a.sound);const offset=attack.bullet_start_offset[s.quadrant-1],flip=s.parts[1].flip,critical=this.random()<attack.critical_chance
      this.onShoot(attack.bullet,{x:site.pos.x+offset.x*(flip?-1:1),y:site.pos.y+offset.y},{...s.point},s.target!, (site.damageFactor??1)*(critical?2:1),time,site)
      s.normalLoaded=false;this.applyB(site,s,time);s.throttleShots++;s.phase='throttle-rest';s.phaseAt=time
     }
    }
    if(s.phase==='throttle-rest'){
     if(time-s.phaseAt<a.rest_time)continue
     s.phase='throttle-rate';s.phaseAt=time
    }
    if(s.phase==='throttle-rate'){
     if(time-s.phaseAt<a.rate_of_fire)continue
     s.phase='throttle-shot'
     // Native y_wait(rate) resumes directly in the next shot iteration.
     if(s.throttleShots>=a.shots||site.towerBlocked)endShots()
     else{const target=this.findThrottle(site,1/30)[0],attack=s.attacks[s.selectedAttack];s.target=target?.enemy;s.point=target?{...target.point}:{...s.throttleFallback!};if(target)s.throttleFallback={...target.point};s.cycleAttack=s.selectedAttack;this.pose(s,site,attack.animation,s.point,time,false);Object.assign(body,{name:a.animation,ts:time,flip:false,loop:false});Object.assign(s.parts[4],{name:attack.animation,ts:time,flip:false,loop:false});s.phase='throttle-windup';s.phaseAt=time}
    }
    if(s.phase==='throttle-reload'){
     if(!this.finished(body,time)){const look=pick(site,false);if(look)this.pose(s,site,'idle',look.point,time,true);continue}
     this.onThrottleRemove(s.throttleBg!);a.ts=time;s.phase='idle'
     // Original continues into its normal attack in this same main resume.
     const target=pick(site,true);if(target)this.start(s,site,t,target,time);else{const attack=s.attacks[s.selectedAttack];attack.ts=time-attack.cooldown+10/30-1e-6;if(s.selectedAttack===0)s.attackAt=attack.ts;s.phase='yield';continue}
    }else continue
   }
   if(s.phase.startsWith('sulfur-')){
    const a=s.timedAttacks[0],body=s.parts[2],cannon=s.parts[1],shooter=s.parts[3]
    if(s.phase==='sulfur-load'){
     if(!this.finished(body,time))continue
     this.onSound(a.sound_prep)
     for(const i of [1,2,4])Object.assign(s.parts[i],{name:a.animation,ts:time,loop:false})
     shooter.hidden=true;s.phase='sulfur-cast';s.phaseAt=time
    }
    if(s.phase==='sulfur-cast'){
     if(time-s.phaseAt<a.cast_time)continue
     const target=this.findSulfur(site,35/30)[0]
     if(site.towerBlocked){s.phase='yield';continue}
     s.sulfurPoint=target?.point??s.sulfurPoint!
     s.sulfurVisual={z:3000,sort_y_offset:1}
     this.onSulfurShoot(a.bullet,{x:site.pos.x+a.bullet_start_offset.x,y:site.pos.y+a.bullet_start_offset.y},s.sulfurPoint,site.damageFactor??1,time,s.sulfurVisual)
     a.ts=time;s.phase='sulfur-z';s.phaseAt=time
    }
    if(s.phase==='sulfur-z'){
     if(time-s.phaseAt<8/30)continue
     Object.assign(s.sulfurVisual!,{z:3400,sort_y_offset:0});s.phase='sulfur-animation'
    }
    if(s.phase==='sulfur-animation'){
     if(!this.finished(cannon,time))continue
     shooter.hidden=false
     const flip=Math.atan2(s.sulfurPoint!.x-site.pos.x,s.sulfurPoint!.y-site.pos.y)<=0
     for(const part of [shooter,cannon])Object.assign(part,{name:'shoot',ts:time-28/30,flip,loop:false})
     s.phase='sulfur-shooter';s.phaseAt=time
    }
    if(s.phase==='sulfur-shooter'){
     if(time-s.phaseAt<6/30)continue
     Object.assign(cannon,{name:'idle',loop:true});s.phase='sulfur-idle';s.phaseAt=time
    }
    if(s.phase==='sulfur-idle'){
     if(time-s.phaseAt<10/30)continue
     Object.assign(body,{name:s.attacks[s.selectedAttack].animation_reload!,ts:time,flip:false,loop:false});s.phase='sulfur-reload'
    }
    if(s.phase==='sulfur-reload'){
     if(!this.finished(body,time)){const target=pick(site,false);if(target)s.sulfurPoint={...target.point};continue}
     s.phase='yield'
    }
    continue
   }
   const attack=s.attacks[s.cycleAttack]
   if(s.phase==='windup'){
    if(time-s.phaseAt<Math.round(attack.shoot_time*30)/30)continue
    if(site.towerBlocked||site.attackDisabled){s.phase='yield';continue}
    this.onSound(attack.sound);const offset=attack.bullet_start_offset[s.quadrant-1],flip=s.parts[1].flip
    const critical=this.random()<attack.critical_chance
    this.onShoot(attack.bullet,{x:site.pos.x+offset.x*(flip?-1:1),y:site.pos.y+offset.y},{...s.point},s.target!,(site.damageFactor??1)*(critical?2:1),time,site)
    this.applyB(site,s,time)
    s.normalLoaded=false;s.fired=true;s.phase=t.tower.level===4?'body':'rest';s.phaseAt=time
   }
   if(s.phase==='rest'){
    if(time-s.phaseAt<Math.round(attack.time_to_rest*30)/30+4/30)continue
    s.phase='body'
   }
   if(s.phase==='body'){
    if(!this.finished(s.parts[2],time)){if(t.tower.level!==4){const target=pick(site,false);if(target)s.point={...target.point}}continue}
    if(this.readyThrottle(s,site,time)){this.startThrottle(s,site,time);continue}
    const sulfur=s.timedAttacks[0],look=t.tower.level===4?this.findSulfur(site,1/30):[]
    if(sulfur&&!sulfur.disabled&&!site.towerBlocked&&time-sulfur.ts>sulfur.cooldown&&(look.length>=sulfur.min_targets||look.some(t=>t.enemy.template.health.magic_armor>=sulfur.min_magic_res))){
     const target=this.findSulfur(site,sulfur.anim_length+sulfur.cast_time+35/30)[0]
     if(target){s.sulfurPoint={...target.point};Object.assign(s.parts[2],{name:sulfur.animation_reload,ts:time,flip:false,loop:false});s.phase='sulfur-load';continue}
     sulfur.ts=time-sulfur.cooldown+10/30-1e-6
    }
    if(t.tower.level===4){s.parts[2].name=attack.animation_reload!;s.parts[2].ts=time;s.parts[2].loop=false;s.phase='reload'}
    else{s.phase='reload'}
   }
   if(s.phase==='reload'){
    if(!this.finished(s.parts[2],time)){const target=pick(site,false);if(target)s.point={...target.point};continue}
    // Basic cooldown equals its animation budget; native U.y_wait(0) does not yield here.
    s.normalLoaded=true;this.pose(s,site,'idle',s.point,time,true);s.phase='yield';s.phaseAt=time
   }
  }
  for(const id of this.states.keys())if(!live.has(id))this.states.delete(id)
 }
}
