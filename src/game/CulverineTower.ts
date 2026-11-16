import times from '../../public/data/culverine-exo-times.json' with {type:'json'}
import type {Point} from './types'
import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import {nativeLogicAnimationFrame} from './NativeAnimation.ts'
export interface CulverinePart {prefix?:string;name:string;ts:number;flip:boolean;hidden:boolean;loop:boolean}
interface Template {tower:{level:number};render:{sprites:{prefix?:string;name:string;hidden?:boolean;loop?:boolean}[]};attacks:{list:{bullet:string;shoot_time:number;time_to_rest:number;animation_duration:number;cooldown:number;animation_reload?:string;critical_chance:number;sound:string;bullet_start_offset:Point[]}[]}}
export interface CulverineTowerState {key:string;parts:CulverinePart[];phase:'idle'|'windup'|'rest'|'body'|'reload'|'yield';phaseAt:number;attackAt:number;target?:EnemyInstance;point:Point;quadrant:number;fired:boolean}
export interface CulverineTarget {enemy:EnemyInstance;point:Point}
/** Basic-attack branch of native Culverine21525; skill branches are separate work. */
export class CulverineTowerSystem {
 readonly states=new Map<string,CulverineTowerState>()
 private templates:Record<string,Template>
 private random:()=>number
 onSound:(name:string)=>void=()=>{}
 onShoot:(name:string,from:Point,to:Point,target:EnemyInstance,factor:number,time:number)=>void=()=>{}
 constructor(templates:Record<string,Template>,random:()=>number=Math.random){this.templates=templates;this.random=random}
 private pose(s:CulverineTowerState,site:TowerSite,name:string,point:Point,time:number,loop:boolean){
  const angle=Math.atan2(point.x-site.pos.x,point.y-site.pos.y)*180/Math.PI,abs=Math.abs(angle),q=abs<35?1:abs<70?2:abs<120?3:4,flip=angle<=0
  const set=(part:CulverinePart,n:string)=>{part.name=n;part.flip=flip;part.loop=loop;if(!loop)part.ts=time}
  set(s.parts[1],name+['up','back','','down'][q-1]);s.parts[3].hidden=q!==3;if(q===3)set(s.parts[3],name)
  s.quadrant=q
 }
 private start(s:CulverineTowerState,site:TowerSite,t:Template,target:CulverineTarget,time:number){
  this.pose(s,site,'shoot',target.point,time,false)
  for(const i of [2,4]){const p=s.parts[i];p.name='shoot';p.ts=time;p.flip=false;p.loop=false}
  s.phase='windup';s.phaseAt=time;s.attackAt=time;s.target=target.enemy;s.point={...target.point};s.fired=false
 }
 private finished(p:CulverinePart,time:number){const d=(times as Record<string,Record<string,number>>)[p.prefix!][p.name];return nativeLogicAnimationFrame(Math.round(d*30),time,p.ts,p.loop,30).runs>0}
 advance(time:number,sites:TowerSite[],pick:(site:TowerSite)=>CulverineTarget|undefined,updateSites:TowerSite[]=sites){
  const live=new Set(sites.filter(site=>site.tower?.startsWith('tower_culverine_')).map(site=>site.id))
  for(const site of updateSites){if(!site.tower?.startsWith('tower_culverine_'))continue;
   const t=this.templates[site.tower],a=t.attacks.list[0];let s=this.states.get(site.id)
   if(!s||s.key!==site.tower){s={key:site.tower,parts:t.render.sprites.map(p=>({prefix:p.prefix,name:p.name,ts:0,flip:false,hidden:p.hidden??false,loop:p.loop??true})),phase:'idle',phaseAt:time,attackAt:time-a.cooldown,point:{x:site.pos.x+1,y:site.pos.y},quadrant:3,fired:false};this.states.set(site.id,s);this.pose(s,site,'idle',s.point,time,true)}
   if(s.phase==='yield'){s.phase='idle'}
   if(s.phase==='idle'){
    if(site.towerBlocked||site.attackDisabled)continue
    const target=pick(site);if(target){this.pose(s,site,'idle',target.enemy.path.position,time,true);this.start(s,site,t,target,time)}
    continue
   }
   if(s.phase==='windup'){
    if(time-s.phaseAt<Math.round(a.shoot_time*30)/30)continue
    if(site.towerBlocked||site.attackDisabled){s.phase='yield';continue}
    this.onSound(a.sound);const offset=a.bullet_start_offset[s.quadrant-1],flip=s.parts[1].flip
    const critical=this.random()<a.critical_chance
    this.onShoot(a.bullet,{x:site.pos.x+offset.x*(flip?-1:1),y:site.pos.y+offset.y},{...s.point},s.target!,(site.damageFactor??1)*(critical?2:1),time)
    s.fired=true;s.phase=t.tower.level===4?'body':'rest';s.phaseAt=time
   }
   if(s.phase==='rest'){
    if(time-s.phaseAt<Math.round(a.time_to_rest*30)/30+4/30)continue
    s.phase='body'
   }
   if(s.phase==='body'){
    if(!this.finished(s.parts[2],time)){const target=pick(site);if(target)s.point={...target.point};continue}
    if(t.tower.level===4){s.parts[2].name=a.animation_reload!;s.parts[2].ts=time;s.parts[2].loop=false;s.phase='reload'}
    else{s.phase='reload'}
   }
   if(s.phase==='reload'){
    if(!this.finished(s.parts[2],time)){const target=pick(site);if(target)s.point={...target.point};continue}
    // Basic cooldown equals its animation budget; native U.y_wait(0) does not yield here.
    this.pose(s,site,'idle',s.point,time,true);s.phase='yield';s.phaseAt=time
   }
  }
  for(const id of this.states.keys())if(!live.has(id))this.states.delete(id)
 }
}
