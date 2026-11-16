import type {WizardEmpowerSystem,EmpowerTarget} from './WizardEmpower'
import type {Point} from './types'
import type {TowerSite} from './TowerSystem'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
import {resetSkillTimestamp} from './TowerSkillCooldown.ts'
export interface WizardTarget {id:number|string;pos:Point;hitOffset?:Point}
interface Part {name:string;ts:number;flip:boolean;loop:boolean;offset:Point}
interface Sprite {name:string;ts?:number;flip_x?:boolean;loop?:boolean;offset:Point;prefix?:string;angles?:Record<string,string[]>}
export interface WizardTemplate {powers?:{skill_a?:{cooldown:number[];damage_min:number[];damage_max:number[]};skill_b?:{cooldown:number[]};skill_c?:{cooldown:number[]}};tower:{type:string};shooter_offset:Point;render:{sid_shooter:number;sid_scroll?:number;sprites:Sprite[]};attacks:{min_cooldown?:number;attack_delay_on_spawn:number;list:{hit_min_damage?:number;hit_max_damage?:number;basic_attack?:boolean;static_cooldown?:boolean;shoot_time:number;ts?:number;cooldown:number;sound?:string;bullet:string;bullet_start_offset:Point[]}[]}}
export interface WizardTowerState {site:TowerSite;key:string;instance:number;parts:Part[];ts:number;lastAttack:number;loading:boolean;bobTime:number;phase:'outer'|'start'|'first-wait'|'second-wait'|'end'|'buff-start'|'buff-windup'|'buff-end'|'fire-start'|'fire-windup'|'fire-end'|'book-start'|'book-windup'|'book-end';bookLevel:number;bookTs:number;bookTarget?:WizardTarget;fireLevel:number;fireTs:number;fireMin:number;fireMax:number;fireTarget?:WizardTarget;buffLevel:number;buffTs:number;buffTargets?:EmpowerTarget[];waitAt:number;selected?:WizardTarget;pair?:WizardTarget[];candidates?:WizardTarget[]}
/** Native wizard basic/A/C/B coroutine. Wait continuations run before blocked checks, as in Lua. */
export class WizardTowerSystem {
 empower?:WizardEmpowerSystem
 onSound:(name:string)=>void=()=>{}
 readonly states=new Map<string,WizardTowerState>()
 onCopies:(site:TowerSite,name:string,from:Point,to:Point,targetId:number|string,level:number,min:number,max:number,time:number)=>void=()=>{}
 onFirebook:(site:TowerSite,name:string,from:Point,to:Point,targetId:number|string,level:number,min:number,max:number,time:number)=>void=()=>{}
 onShoot:(site:TowerSite,name:string,from:Point,target:WizardTarget,sign:number,time:number)=>void=()=>{}
 private templates:Record<string,WizardTemplate>
 private durations:Record<string,Record<string,number>>
 private random:()=>number
 constructor(templates:Record<string,WizardTemplate>,durations:Record<string,Record<string,number>>,random:()=>number){this.templates=templates;this.durations=Object.fromEntries(Object.entries(durations).map(([prefix,animations])=>[prefix,Object.fromEntries(Object.entries(animations).map(([name,duration])=>[name,Math.round(duration*30)/30]))]));this.random=random}
 private animate(state:WizardTowerState,name:string,time:number,loop:boolean){const p=state.parts[this.templates[state.key].render.sid_shooter-1];p.name=name;p.ts=time;p.flip=false;p.loop=loop}
 private facing(state:WizardTowerState,name:string,pos:Point,offset=false){const t=this.templates[state.key],s=t.render.sprites[t.render.sid_shooter-1];return s.angles?.[name]?.[pos.y>state.site.pos.y+(offset?t.shooter_offset.y:0)?0:1]??name}
 private finished(state:WizardTowerState,time:number){const p=state.parts[this.templates[state.key].render.sid_shooter-1],prefix=this.templates[state.key].render.sprites[this.templates[state.key].render.sid_shooter-1].prefix!;return nativeLogicAnimationFrame(Math.round(this.durations[prefix][p.name]*30),time,p.ts,p.loop,30).runs>0}
 private fire(state:WizardTowerState,index:number,time:number){const a=this.templates[state.key].attacks.list[0],o=a.bullet_start_offset[index];this.onShoot(state.site,a.bullet,{x:state.site.pos.x+o.x,y:state.site.pos.y+o.y},state.pair![index],index===0?-1:1,time)}
 resetSkillCooldowns(site:TowerSite,time:number){const state=this.states.get(site.id),template=site.tower?this.templates[site.tower]:undefined,a=template?.attacks?.list[2];if(state&&template?.powers?.skill_a){const fireTs=resetSkillTimestamp(template.attacks.list[1],time);if(fireTs!==undefined)state.fireTs=fireTs}if(state&&template?.powers&&a){const ts=resetSkillTimestamp(a,time);if(ts!==undefined)state.buffTs=ts}if(state&&template?.powers?.skill_c){const ts=resetSkillTimestamp(template.attacks.list[3],time);if(ts!==undefined)state.bookTs=ts}}
 advance(time:number,sites:TowerSite[],findTargets:(site:TowerSite,attackIndex?:number)=>WizardTarget[],updateSites:TowerSite[]=sites){
  for(const [id,state]of this.states)if(!sites.includes(state.site)||state.site.tower!==state.key||(state.site.instance??0)!==state.instance)this.states.delete(id)
  for(const site of updateSites){
   if(!site.tower||!site.tower.startsWith('tower_wizard_lvl'))continue
   const t=this.templates[site.tower],a=t.attacks.list[0];let s=this.states.get(site.id)
   if(!s){s={site,key:site.tower,instance:site.instance??0,parts:t.render.sprites.map(p=>({name:p.name,ts:p.ts??0,flip:!!p.flip_x,loop:p.loop??true,offset:{...p.offset}})),ts:time-a.cooldown+t.attacks.attack_delay_on_spawn,lastAttack:time-a.cooldown,loading:false,bobTime:0,phase:'outer',bookLevel:0,bookTs:t.attacks.list[3]?.ts??0,fireLevel:0,fireTs:t.attacks.list[1]?.ts??0,fireMin:0,fireMax:0,buffLevel:0,buffTs:t.attacks.list[2]?.ts??0,waitAt:time};this.states.set(site.id,s)}
   if(site.attackDisabled)continue
   let afterFireEnd=false,afterBookEnd=false
   if(s.phase==='book-start'){if(!this.finished(s,time))continue;this.beginCopies(s,time)}
   if(s.phase==='book-windup'){
    const a=t.attacks.list[3];if(time-s.waitAt<Math.round(a.shoot_time*30)/30)continue
    const target=s.bookTarget!,o=a.bullet_start_offset as unknown as Point,h=target.hitOffset??{x:0,y:0}
    this.onCopies(site,a.bullet,{x:site.pos.x+o.x,y:site.pos.y+o.y},{x:target.pos.x+h.x,y:target.pos.y+h.y},target.id,site.powerLevels?.skill_c??s.bookLevel,a.hit_min_damage!,a.hit_max_damage!,time)
    s.bookTs=s.lastAttack;s.phase='outer';continue
   }
   if(s.phase==='book-end'){
    if(!this.finished(s,time))continue
    this.animate(s,'idle',time,true);s.loading=false;s.bookTs=time-t.powers!.skill_c!.cooldown[s.bookLevel-1]+10/30-1e-6;s.phase='outer';afterBookEnd=true
   }
   if(s.phase==='fire-start'){if(!this.finished(s,time))continue;this.beginFirebook(s,time)}
   if(s.phase==='fire-windup'){
    if(time-s.waitAt<.5)continue
    const f=t.attacks.list[1],o=f.bullet_start_offset as unknown as Point,target=s.fireTarget!
    this.onFirebook(site,f.bullet,{x:site.pos.x+o.x,y:site.pos.y+o.y},target.pos,target.id,site.powerLevels?.skill_a??s.fireLevel,s.fireMin,s.fireMax,time)
    s.fireTs=s.lastAttack;s.phase='outer';continue
   }
   if(s.phase==='fire-end'){
    if(!this.finished(s,time))continue
    this.animate(s,'idle',time,true);s.loading=false;s.fireTs=time-t.powers!.skill_a!.cooldown[s.fireLevel-1]+10/30-1e-6;s.phase='outer';afterFireEnd=true
   }
   if(s.phase==='buff-start'){
    if(!this.finished(s,time))continue
    this.beginBuff(s,time)
   }
   if(s.phase==='buff-windup'){
    if(time-s.waitAt<Math.round(t.attacks.list[2].shoot_time*30)/30)continue
    s.lastAttack=time;this.empower!.cast(site,s.buffTargets!,site.powerLevels!.skill_b,time);s.phase='buff-end'
   }
   if(s.phase==='buff-end'){
    if(!this.finished(s,time))continue
    const scroll=s.parts[t.render.sid_scroll!-1];scroll.name='idle';scroll.flip=false;scroll.loop=true;s.buffTs=s.lastAttack;s.phase='outer';continue
   }
   if(s.phase==='start'){
    if(!this.finished(s,time))continue
    this.beginPair(s,time)
   }
   if(s.phase==='first-wait'){
    if(time-s.waitAt<.15)continue
    this.fire(s,1,time);s.waitAt=time;s.phase='second-wait';continue
   }
   if(s.phase==='second-wait'){
    if(time-s.waitAt<.15)continue
    s.phase='outer'
   }
   if(s.phase==='end'){
    if(!this.finished(s,time))continue
    this.animate(s,'idle',time,true);s.loading=false;s.ts=time-a.cooldown+10/30-1e-6;s.phase='outer';continue
   }
   if(site.towerBlocked)continue
   const level=site.powerLevels?.skill_b??0
   if(level!==s.buffLevel){s.buffLevel=level;if(level===1)s.buffTs=time-t.powers!.skill_b!.cooldown[0]}
   const bookLevel=site.powerLevels?.skill_c??0
   if(bookLevel!==s.bookLevel){s.bookLevel=bookLevel;if(bookLevel===1)s.bookTs=time-t.powers!.skill_c!.cooldown[0]}
   const fireLevel=site.powerLevels?.skill_a??0
   if(fireLevel!==s.fireLevel){s.fireLevel=fireLevel;if(fireLevel){s.fireMin=t.powers!.skill_a!.damage_min[fireLevel-1];s.fireMax=t.powers!.skill_a!.damage_max[fireLevel-1];if(fireLevel===1)s.fireTs=time-t.powers!.skill_a!.cooldown[0]}}
   if(s.loading&&!afterFireEnd&&!afterBookEnd){s.bobTime+=1/30;s.parts[t.render.sid_shooter-1].offset.y=10+2.5*Math.sin(s.bobTime*1.5)}
   const fireCooldown=fireLevel?t.powers!.skill_a!.cooldown[fireLevel-1]:undefined
   if(!afterFireEnd&&!afterBookEnd&&fireCooldown!==undefined&&time-s.fireTs>fireCooldown&&time-s.lastAttack>(t.attacks.min_cooldown??0)){
    const target=findTargets(site,1)[0]
    if(target){s.fireTarget=target;if(!s.loading){s.loading=true;this.animate(s,this.facing(s,'shootstart',target.pos,true),time,false);s.phase='fire-start'}else this.beginFirebook(s,time);continue}
    if(s.loading){this.animate(s,'shootend',time,false);s.phase='fire-end';continue}
    s.fireTs=time-fireCooldown+10/30-1e-6
   }
   const bookCooldown=bookLevel?t.powers!.skill_c!.cooldown[bookLevel-1]:undefined
   if(!afterBookEnd&&bookCooldown!==undefined&&time-s.bookTs>bookCooldown&&time-s.lastAttack>(t.attacks.min_cooldown??0)){
    const target=findTargets(site,3)[0]
    if(target){s.bookTarget=target;if(!s.loading){s.loading=true;this.animate(s,this.facing(s,'shootstart',target.pos,true),time,false);s.phase='book-start'}else this.beginCopies(s,time);continue}
    if(s.loading){this.animate(s,'shootend',time,false);s.phase='book-end';continue}
    s.bookTs=time-bookCooldown+10/30-1e-6
   }
   if(this.empower&&site.tower==='tower_wizard_lvl4'){
    this.empower.syncPreview(site,level,time)
    const cooldown=level?t.powers!.skill_b!.cooldown[level-1]:undefined
    if(cooldown!==undefined&&time-s.buffTs>cooldown&&time-s.lastAttack>(t.attacks.min_cooldown??0)){
     const targets=this.empower.findTargets(site)
     if(!targets.length)s.buffTs=time-cooldown+5-1e-6
     else if(!this.empower.hasEnemy(site))s.buffTs=time-cooldown+2-1e-6
     else{
      this.onSound(t.attacks.list[2].sound!);s.buffTargets=targets
      if(!s.loading){s.loading=true;this.animate(s,'shootstart',time,false);s.phase='buff-start'}else this.beginBuff(s,time)
      continue
     }
    }
   }
   if(time-s.ts<=a.cooldown||time-s.lastAttack<=(t.attacks.min_cooldown??0))continue
   const targets=findTargets(site),first=targets[0]
   if(!first){
    if(s.loading){this.animate(s,'shootend',time,false);s.phase='end'}
    else s.ts=time-a.cooldown+10/30-1e-6
    continue
   }
   s.selected=first;s.candidates=targets
   if(!s.loading){s.loading=true;this.animate(s,this.facing(s,'shootstart',first.pos,true),time,false);s.phase='start';continue}
   this.beginPair(s,time)
  }
 }
 private beginCopies(s:WizardTowerState,time:number){s.lastAttack=time;this.animate(s,this.facing(s,'throwbook',s.bookTarget!.pos),time,false);this.onSound(this.templates[s.key].attacks.list[3].sound!);s.phase='book-windup';s.waitAt=time}
 private beginFirebook(s:WizardTowerState,time:number){s.lastAttack=time;this.animate(s,this.facing(s,'firebook',s.fireTarget!.pos),time,false);this.onSound(this.templates[s.key].attacks.list[1].sound!);s.phase='fire-windup';s.waitAt=time}
 private beginBuff(s:WizardTowerState,time:number){this.animate(s,'buff',time,false);const scroll=s.parts[this.templates[s.key].render.sid_scroll!-1];scroll.name='buff';scroll.ts=time;scroll.flip=false;scroll.loop=false;s.phase='buff-windup';s.waitAt=time}
 private beginPair(s:WizardTowerState,time:number){
  s.lastAttack=time;s.ts=time;this.animate(s,this.facing(s,'shootloop',s.selected!.pos),time,false)
  s.pair=[s.selected!,s.selected!]
  const second=s.candidates?.[1]
  if(this.random()<.5&&second&&(s.selected!.pos.x-second.pos.x)**2+(s.selected!.pos.y-second.pos.y)**2<2500)s.pair[1]=second
  this.fire(s,0,time);s.phase='first-wait';s.waitAt=time
 }
}
