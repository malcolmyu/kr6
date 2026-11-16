import counts from '../../public/data/catapult-exo-frames.json' with {type:'json'}
import {resetSkillTimestamp} from './TowerSkillCooldown.ts'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
export interface CatapultTarget {id:number|string;pos:Point;predict:(seconds:number)=>Point;hasMotion?:boolean}
export interface CatapultChoice {target:CatapultTarget;pos:Point}
interface Sprite {name:string;ts?:number;flip_x?:boolean;loop?:boolean;fps?:number;prefix?:string}
interface Template {powers?:{skill_a?:{cooldown:number[];bullets:string[]};skill_b?:{};skill_c?:{cooldown:number[];max_traps:number[]}};timed_attacks?:{list:{basic_attack?:boolean;static_cooldown?:boolean;cooldown?:number;cast_time:number;animation:string;bullet:string;bullet_start_offset:Point;max_range:number;min_dist_between_traps:number}[]};rotation_time:number;tower_sid:number;loader_sid:number;balls_sid?:number;tower:{level:number;damage_factor:number;range_offset:Point};render:{sprites:Sprite[]};attacks:{range?:number;cooldown:number;list:{level?:number;cooldown:number;shoot_time:number;bullet:string;bullet_start_offset:Point}[]}}
export interface CatapultPart {name:string;ts:number;flip:boolean;loop:boolean;fps?:number;runs:number}
export interface CatapultState {site:TowerSite;key:string;instance:number;parts:CatapultPart[];started:boolean;attackTs:number;phase:'outer'|'turn-in'|'windup'|'attack-end'|'turn-out'|'reload'|'trap-windup'|'trap-end';waitAt:number;direction:number;fallback?:Point;explosiveLevel:number;explosiveTs:number;nextAttack:number;currentAttack:number;reloadExplosive:boolean;tarLevel:number;tarTs:number;tarCooldown:number;tarBullet:string;reloadAttack:number;trapLevel:number;trapTs:number;trapCooldown:number;groupTs?:number;trapTarget?:Point}
export type CatapultFinder=(site:TowerSite,seconds:number,direction?:number)=>CatapultChoice|undefined
export function catapultDirection(origin:Point,target:Point){return origin.x<target.x?(origin.y<target.y?1:2):(origin.y<target.y?4:3)}
/** Native19991 basic coroutine, including directional rotation and loader/ball
 * parts and Lv4 tar/explosive ammunition. Ultimate remains unavailable. */
export class CatapultTowerSystem {
 readonly states=new Map<string,CatapultState>()
 waveGroupNumber=1
 trapCount:(site:TowerSite)=>number=()=>0
 findTrapPosition:(site:TowerSite,scope:number,range:number,spacing:number)=>Point|undefined=()=>undefined
 onShoot:(site:TowerSite,name:string,from:Point,to:Point,factor:number,time:number,level:number)=>void=()=>{}
 private templates:Record<string,Template&{bullet?:{flight_time:number}}>
 constructor(templates:Record<string,Template&{bullet?:{flight_time:number}}>){this.templates=templates}
 private animate(s:CatapultState,sid:number,name:string,time:number,loop:boolean){const p=s.parts[sid-1];p.name=name;p.flip=false;p.loop=loop;if(!loop){p.ts=time;p.runs=0}}
 insert(site:TowerSite,time:number,find:CatapultFinder){
  const t=this.templates[site.tower!],origin={x:site.pos.x+t.tower.range_offset.x,y:site.pos.y+t.tower.range_offset.y},target=time*30>1?find(site,0)?.target:undefined
  const idle=target?origin.x<target.pos.x?(origin.y<target.pos.y?3:2):(origin.y<target.pos.y?7:5):2
  const state:CatapultState={site,key:site.tower!,instance:site.instance??0,parts:t.render.sprites.map(p=>({name:p.name,ts:p.ts??0,flip:!!p.flip_x,loop:p.loop??true,fps:p.fps,runs:0})),started:false,attackTs:0,phase:'outer',waitAt:time,direction:2,explosiveLevel:0,explosiveTs:0,nextAttack:0,currentAttack:0,reloadExplosive:false,tarLevel:0,tarTs:0,tarCooldown:t.attacks.list[1]?.cooldown??0,tarBullet:t.attacks.list[1]?.bullet??'',reloadAttack:0,trapLevel:0,trapTs:0,trapCooldown:0}
  this.animate(state,t.tower_sid,`idle_${idle}`,time,true);this.states.set(site.id,state);return state
 }
 private rotate(s:CatapultState,time:number,back:boolean){
  const t=this.templates[s.key];s.waitAt=time;s.phase=back?'turn-out':'turn-in'
  if(s.direction!==2){const index=s.direction===1?(back?2:1):s.direction===3?(back?4:3):(back?6:5);this.animate(s,t.tower_sid,`rotation_${index}${this.suffix(s.currentAttack)}`,time,false)}
 }
 private suffix(attack:number){return attack===1?'_tarred_zone':attack===2?'_explosive':''}
 private attack(s:CatapultState,index:number){const a=this.templates[s.key].attacks.list[index];return index===1?{...a,cooldown:s.tarCooldown,bullet:s.tarBullet}:a}
 resetSkillCooldowns(site:TowerSite,time:number){const s=this.states.get(site.id),a=site.tower?this.templates[site.tower].timed_attacks?.list[0]:undefined;if(s&&a){const ts=resetSkillTimestamp(a,time);if(ts!==undefined)s.trapTs=ts}}
 private tryTrap(s:CatapultState,time:number){
  if(!s.trapLevel||time-s.trapTs<=s.trapCooldown||this.waveGroupNumber<=0)return
  const t=this.templates[s.key],a=t.timed_attacks!.list[0]
  if(this.trapCount(s.site)>=t.powers!.skill_c!.max_traps[s.site.powerLevels!.skill_c-1]){s.groupTs=time-t.attacks.cooldown+10/30-1e-6;return}
  const pos=this.findTrapPosition(s.site,t.attacks.range!*(s.site.rangeFactor??1),a.max_range,a.min_dist_between_traps)
  if(!pos){s.groupTs=time-t.attacks.cooldown+10/30-1e-6;return}
  s.trapTs=time;s.trapTarget={...pos};this.animate(s,t.loader_sid,a.animation,time,false);s.waitAt=time;s.phase='trap-windup'
 }
 private syncPowers(s:CatapultState,time:number){
  const trap=this.templates[s.key].powers?.skill_c,trapLevel=s.site.powerLevels?.skill_c??0
  if(trap&&trapLevel!==s.trapLevel){s.trapLevel=trapLevel;s.trapCooldown=trap.cooldown[trapLevel-1];if(trapLevel===1)s.trapTs=time-s.trapCooldown}

  const tar=this.templates[s.key].powers?.skill_a,tarLevel=s.site.powerLevels?.skill_a??0
  if(tar&&tarLevel!==s.tarLevel){s.tarLevel=tarLevel;s.tarCooldown=tar.cooldown[tarLevel-1];s.tarBullet=tar.bullets[tarLevel-1];if(tarLevel===1)s.tarTs=time-s.tarCooldown}

  if(!this.templates[s.key].powers?.skill_b)return
  const level=s.site.powerLevels?.skill_b??0
  if(level===s.explosiveLevel)return
  s.explosiveLevel=level;s.explosiveTs=time-this.templates[s.key].attacks.list[2].cooldown
  this.animate(s,this.templates[s.key].tower_sid,'idle_2_explosive',time,true)
  this.animate(s,this.templates[s.key].balls_sid!,'idle_2',time,false)
  if(s.nextAttack===0)s.nextAttack=2
 }
 advance(time:number,sites:TowerSite[],find:CatapultFinder,updateSites:TowerSite[]=sites){
  for(const [id,s]of this.states)if(!sites.includes(s.site)||s.site.tower!==s.key||(s.site.instance??0)!==s.instance)this.states.delete(id)
  for(const site of updateSites){
   if(!site.tower?.startsWith('tower_catapult_lvl'))continue
   const t=this.templates[site.tower];let s=this.states.get(site.id)
   if(!s)s=this.insert(site,time,find)
   if(site.attackDisabled)continue
   if(s.started)for(const [index,p]of s.parts.entries()){const prefix=t.render.sprites[index].prefix,frames=prefix?(counts as Record<string,Record<string,number>>)[prefix]?.[p.name]:undefined;if(frames)p.runs=nativeLogicAnimationFrame(frames,time,p.ts,p.loop,p.fps??30).runs}
   if(!s.started){s.started=true;s.attackTs=time-t.attacks.list[0].cooldown}
   const a=this.attack(s,s.currentAttack)
   if(s.phase==='trap-windup'){const c=t.timed_attacks!.list[0];if(time-s.waitAt<c.cast_time)continue;const o=c.bullet_start_offset;this.onShoot(site,c.bullet,{x:site.pos.x+o.x,y:site.pos.y+o.y},{...s.trapTarget!},1,time,site.powerLevels!.skill_c);s.phase='trap-end'}
   if(s.phase==='trap-end'){if(s.parts[t.tower_sid-1].runs===0)continue;s.phase='outer';continue}
   // Wait continuations resume before the outer blocked-tower check.
   if(s.phase==='turn-in'){
    if(s.direction===2?time-s.waitAt<t.rotation_time:s.parts[t.tower_sid-1].runs===0)continue
    this.animate(s,t.tower_sid,`attack_${({1:2,2:1,3:3,4:4} as Record<number,number>)[s.direction]}${this.suffix(s.currentAttack)}`,time,false);s.waitAt=time;s.phase='windup'
   }
   if(s.phase==='windup'){
    if(time-s.waitAt<a.shoot_time)continue
    const flight=this.templates[a.bullet].bullet!.flight_time,choice=find(site,flight,s.direction),to=choice?.pos??s.fallback!,o=a.bullet_start_offset
    this.onShoot(site,a.bullet,{x:site.pos.x+o.x,y:site.pos.y+o.y},{...to},t.tower.damage_factor*(site.damageFactor??1),time,s.currentAttack===1?(site.powerLevels?.skill_a??0):s.currentAttack===2?(site.powerLevels?.skill_b??0):0);s.phase='attack-end'
   }
   if(s.phase==='attack-end'){
    if(s.parts[t.tower_sid-1].runs===0)continue
    this.rotate(s,time,true)
   }
   if(s.phase==='turn-out'){
    if(s.direction===2?time-s.waitAt<t.rotation_time:s.parts[t.tower_sid-1].runs===0)continue
    this.syncPowers(s,time);s.reloadExplosive=s.explosiveLevel>0;s.reloadAttack=s.tarLevel>0&&time-s.tarTs>s.tarCooldown?1:s.reloadExplosive?2:0
    if(t.balls_sid)this.animate(s,t.balls_sid,s.reloadExplosive?'ball_reload_2':'ball_reload',time,false)
    const reload=`reload${this.suffix(s.reloadAttack)}`;this.animate(s,t.loader_sid,reload,time,false);this.animate(s,t.tower_sid,reload,time,false);s.phase='reload'
   }
   if(s.phase==='reload'){
    if(s.parts[t.tower_sid-1].runs===0)continue
    this.animate(s,t.tower_sid,`idle_2${this.suffix(s.reloadAttack)}`,time,true);if(t.balls_sid)this.animate(s,t.balls_sid,s.reloadExplosive?'idle_2':'idle',time,false);this.animate(s,t.loader_sid,'idle',time,true);s.nextAttack=s.reloadAttack;s.phase='outer';this.tryTrap(s,time);continue
   }
   if(s.phase!=='outer'||site.towerBlocked)continue
   this.syncPowers(s,time)
   if(time-s.attackTs<=t.attacks.cooldown){this.tryTrap(s,time);continue}
   const choice=find(site,0)
   const selected=this.attack(s,s.nextAttack)
   if(!choice){if(s.nextAttack===1)s.tarTs=time-selected.cooldown+10/30-1e-6;else if(s.nextAttack===2)s.explosiveTs=time-selected.cooldown+10/30-1e-6;else s.attackTs=time-selected.cooldown+10/30-1e-6;this.tryTrap(s,time);continue}
   s.currentAttack=s.nextAttack;if(s.currentAttack===1)s.tarTs=time;else if(s.currentAttack===2)s.explosiveTs=time
   s.attackTs=time;s.fallback={...choice.pos}
   const origin={x:site.pos.x+t.tower.range_offset.x,y:site.pos.y+t.tower.range_offset.y},flight=this.templates[selected.bullet].bullet!.flight_time
   const point=choice.target.hasMotion===false?choice.pos:choice.target.predict(t.rotation_time+selected.shoot_time+flight)
   s.direction=catapultDirection(origin,point);this.rotate(s,time,false)
  }
 }
}
