import {recordEnemyDamage} from './EnemyDeath.ts'
import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
import type {LevelData,Point} from './types'
import {predictDamage} from './Damage.ts'
interface Cast {hero:HeroUnit;at:number;pi:number;committed:boolean;nodes?:{pi:number;spi:number;ni:number}[];index:number;waitAt?:number;finishedSpawning:boolean}
export interface ZefiraSpear {id:number;pos:Point;queuedAt:number;at?:number;phase:'in'|'loop'|'out';phaseAt?:number;animationAt?:number;removed:boolean;flip:boolean}
export interface ZefiraSpearFloor {id:number;pos:Point;at:number}
const inside=(p:Point,c:Point,r:number)=>.49*(p.x-c.x)**2+(p.y-c.y)**2<=r*r*.49
/** Original hero6979 ultimate and independently queued spear7661 coroutines. */
export class ZefiraUltimate {
 enabled=false
 level?:LevelData
 cast?:Cast
 readonly spears:ZefiraSpear[]=[]
 readonly floors:ZefiraSpearFloor[]=[]
 private nextId=1
 private last?:number
 private battleStarted?:boolean
 private interrupted=false
 onSound:(name:string)=>void=()=>{}
 onEffect:(name:string,pos:Point,time:number,flip:boolean)=>void=()=>{}
 private random:()=>number
 private onKill:(enemy:EnemyInstance)=>void
 constructor(random:()=>number=Math.random,onKill:(enemy:EnemyInstance)=>void=()=>{}){this.random=random;this.onKill=onKill}
 configure(nodes:string[]){this.enabled=nodes.includes('ulti')}
 requestInterrupt(){if(this.cast)this.interrupted=true}
 private valid(pi:number,ni:number){return this.level?.navigation?.noBackwardsNodes?.[pi-1]?.[ni-1]===true}
 private nearest(pos:Point,pi:number){const lane=this.level?.paths.paths[pi-1]?.[0];if(!lane)return
  let result=0,best=Infinity;for(const [i,p]of lane.entries()){const d=(p.x-pos.x)**2+(p.y-pos.y)**2;if(d<best){best=d;result=i+1}}return result
 }
 private release(hero:HeroUnit,time:number,preservePose=false){if(hero.visualOverride?.name==='ultimate'){hero.scriptLocked=false;if(!preservePose)hero.visualOverride=undefined}hero.actionYieldUntil=time+1/30;this.cast=undefined;this.interrupted=false}
 advance(time:number,hero:HeroUnit|undefined,enemies:EnemyInstance[],wave=1,canStart=true):boolean{
  this.advanceSpears(time,enemies)
  if(hero&&this.last===undefined){this.last=hero.born-34;this.battleStarted=wave>0}
  if(hero&&!this.cast&&!this.battleStarted&&wave>0){this.battleStarted=true;this.last=time}
  const c=this.cast
  if(c){
   // Only the initial hero wait is interruptible; the spear-emission waits are ordinary U.y_wait.
   if(!c.committed&&time-c.at<17/30&&(this.interrupted||c.hero.hp<=0||!c.hero.scriptLocked||c.hero.visualOverride?.name!=='ultimate')){this.release(c.hero,time,true);return true}
   if(!c.committed&&time-c.at>=17/30){
    c.committed=true;this.last=c.at;c.nodes=[];const ni=this.nearest(c.hero.pos,c.pi)
    if(ni!==undefined){const base=ni-1;for(let i=1;i<=7;i++){
     if(this.valid(c.pi,base-i*2))c.nodes.push({pi:c.pi,spi:1,ni:base-i*2})
     if(this.valid(c.pi,base-i*3)){c.nodes.push({pi:c.pi,spi:2,ni:base-i*3});c.nodes.push({pi:c.pi,spi:3,ni:base-i*3})}
    }}
   }
   if(c.committed&&!c.finishedSpawning&&(c.waitAt===undefined||time-c.waitAt>=1/30)){
    const node=c.nodes?.[c.index++]
    if(node){const p=this.level!.paths.paths[node.pi-1][node.spi-1][node.ni-1],pos={x:p.x-4+Math.floor(this.random()*9),y:p.y-5+Math.floor(this.random()*11)}
     this.spears.push({id:this.nextId++,pos,queuedAt:time,phase:'in',removed:false,flip:c.hero.facingLeft});this.onEffect('decal_zefira_ultimate_spear',pos,time,c.hero.facingLeft);c.waitAt=time
    }else{c.finishedSpawning=true;c.hero.xpQueued+=34}
   }
   if(c.finishedSpawning&&(this.interrupted||time-c.at+1e-9>=33/30||c.hero.hp<=0||!c.hero.scriptLocked||c.hero.visualOverride?.name!=='ultimate'))this.release(c.hero,time)
   return true
  }
  if(!canStart||!this.enabled||!this.level||!hero||hero.hp<=0||hero.template.unit?.is_stunned||hero.scriptLocked||hero.deploying||hero.moving||hero.attack||hero.rangedUntil!==undefined||time+1e-9<(hero.actionYieldUntil??0)||time-(this.last??time)<=34)return false
  const targets=enemies.filter(e=>{const path=e.path as typeof e.path&{pi?:number;ni?:number};return e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.flags&16777600)&&!(e.template.vis.bans&8)&&inside(e.path.position,hero.pos,150)&&!inside(e.path.position,hero.pos,50)&&path.pi!==undefined&&path.ni!==undefined&&this.valid(path.pi,path.ni)})
  const behind=targets.filter(e=>{const p=e.path as typeof e.path&{pi:number;ni:number};return p.ni<(this.nearest(hero.pos,p.pi)??0)})
  if(targets.length<3||behind.length<3){this.last=time-34+10/30-1e-6;return false}
  const target=behind[0],path=target.path as typeof target.path&{pi:number}
  hero.facingLeft=target.path.position.x<hero.pos.x;hero.scriptLocked=true;hero.visualOverride={name:'ultimate',at:time}
  this.cast={hero,at:time,pi:path.pi,committed:false,index:0,finishedSpawning:false}
  this.onSound('HeroZefiraEtherealSpears');this.onSound('HeroZefiraTauntUltimate');return true
 }
 private advanceSpears(time:number,enemies:EnemyInstance[]){
  for(const s of this.spears){if(s.removed)continue
   if(s.at===undefined){if(time<=s.queuedAt)continue;s.at=time;s.phaseAt=time;s.animationAt=time
    for(const e of enemies)if(e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.flags&128)&&!(e.template.vis.bans&8)&&inside(e.path.position,s.pos,35)){
     const path=e.path as typeof e.path&{pi?:number;ni?:number};if(path.pi!==undefined&&path.ni!==undefined&&this.level?.navigation?.targetNodes?.[path.pi-1]?.[path.ni-1]===false)continue
     this.random();if(e.template.health.ignore_damage)continue;recordEnemyDamage(e,4,time);e.hp-=predictDamage({...e.template.health,hp:e.hp},{value:20,damage_type:4});if(e.hp<=0){e.diedAt=time;this.onKill(e)}
    }
    this.floors.push({id:s.id,pos:{...s.pos},at:time});this.onEffect('decal_zefira_ultimate_spear_floor',s.pos,time,false)
   }
   if(s.phase==='in'&&time-s.phaseAt!+1e-9>=13/30){s.phase='loop';s.phaseAt=time}
   else if(s.phase==='loop'&&time-s.phaseAt!>=1){s.phase='out';s.phaseAt=time;s.animationAt=time}
   else if(s.phase==='out'&&time-s.phaseAt!+1e-9>=33/30)s.removed=true
  }
  for(let i=this.floors.length-1;i>=0;i--)if(time-this.floors[i].at>=93/30)this.floors.splice(i,1)
  // Keep removed entries through the current tick for observers; bounded cleanup on the next one.
  for(let i=this.spears.length-1;i>=0;i--)if(this.spears[i].removed&&time-this.spears[i].phaseAt!>34/30)this.spears.splice(i,1)
 }
}
