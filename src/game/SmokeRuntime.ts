import type {EnemyInstance} from './GameSession'
import type {EnemySkills,SmokeArea} from './EnemySkills'
import type {Point} from './types'
export interface SmokeDecal {kind:'decal';pos:Point;animationAt:number;born:number;inserted:boolean;alpha:number;fadeAt?:number;queued?:boolean}
export interface SmokeAura extends SmokeArea {kind:'aura';native:true;inserted:boolean;started?:boolean;queued?:boolean;decals:SmokeDecal[]}
export interface SmokeModifier {kind:'modifier';enemy:EnemyInstance;pos:Point;inserted:boolean;ts:number;spriteTs:number;previousDodge?:EnemyInstance['dodge'];facingLeft:boolean;offset:Point;queued?:boolean}
export type SmokeModel=SmokeAura|SmokeDecal|SmokeModifier
/** scripts_game1935/1997/2035/2047/2083 and scripts3938/4490. */
export class SmokeRuntime {
 readonly modifiers=new Map<EnemyInstance,SmokeModifier>()
 onQueue:(name:string,model:SmokeModel)=>void=()=>{}
 onRemove:(model:SmokeModel)=>void=()=>{}
 present:(enemy:EnemyInstance)=>boolean=()=>true
 targets:()=>EnemyInstance[]=()=>[]
 private nextId=1
 private owner:EnemySkills
 private random:()=>number
 private config:{duration:number;radius:number;cycle:number;visFlags:number;visBans:number;modifierDuration:number;fadeDuration:number}
 constructor(owner:EnemySkills,random:()=>number,config:SmokeRuntime['config']){this.owner=owner;this.random=random;this.config=config}
 queue(enemy:EnemyInstance,time:number){
  const a:SmokeAura={kind:'aura',native:true,id:this.nextId++,pos:{...enemy.path.position},born:time,duration:this.config.duration,lastApply:time-this.config.cycle,decals:[],inserted:false}
  this.onQueue('aura_shadow_blades_smoke',a)
 }
 insert(m:SmokeModel,time:number){
  if(m.kind==='aura'){
   const geometry=this.owner.areaGeometry(m.pos);m.pos=geometry.pos;m.born=time;m.lastApply=time-this.config.cycle;m.inserted=true;this.owner.areas.push(m)
   for(const pos of geometry.decals){const d:SmokeDecal={kind:'decal',pos,animationAt:time-Math.floor(this.random()*16)*(1/30),born:time,inserted:false,alpha:255};m.decals.push(d);this.onQueue('decal_shadow_blades_smoke',d)}
  }else if(m.kind==='modifier'){
   // mod_lifecycle4 refreshes an existing modifier before its script insert.
   const existing=this.modifiers.get(m.enemy);if(existing){existing.ts=time;return false}
   if(!this.present(m.enemy)||m.enemy.hp<=0||(m.enemy.template.vis.bans&4))return false
   m.previousDodge=m.enemy.dodge;m.enemy.dodge={chance:1,ts:0,ranged:true,show_pop:true,silent:true,active:false};m.inserted=true;m.ts=m.spriteTs=time;m.facingLeft=m.enemy.visualOverride?.facingLeft??Math.cos(m.enemy.headingAngle??0)<0;m.pos=m.enemy.path.position;this.modifiers.set(m.enemy,m);m.enemy.smokeDodgeUntil=Infinity;m.enemy.smokeDodgeVisualAt=time
  }else m.inserted=true
  return true
 }
 advance(m:SmokeModel,time:number){
  if(m.kind==='decal'||m.queued)return
  if(m.kind==='aura'){
   if(!m.started){m.lastApply=time-this.config.cycle;m.started=true}
   if(m.duration<time-m.born){m.queued=true;this.onRemove(m);return}
   if(this.config.cycle>time-m.lastApply)return
   m.lastApply=time
   for(const e of this.targets()){
    const {vis}=e.template,dx=e.path.position.x-m.pos.x,dy=e.path.position.y-m.pos.y
    if(e.hp<=0||vis.flags&this.config.visBans||vis.bans&this.config.visFlags||dx*dx+dy*dy/(.7*.7)>this.config.radius**2)continue
    this.onQueue('mod_shadow_blades_smoke',{kind:'modifier',enemy:e,pos:{...e.path.position},inserted:false,ts:time,spriteTs:time,facingLeft:false,offset:{x:0,y:0}})
   }
  }else if(!this.present(m.enemy)||m.enemy.hp<=0||this.config.modifierDuration<time-m.ts){m.queued=true;this.onRemove(m)}
  else{const offset=m.enemy.template.unit.mod_offset??{x:0,y:0},flip=m.enemy.visualOverride?.facingLeft??Math.cos(m.enemy.headingAngle??0)<0;m.offset={x:offset.x*(flip?-1:1),y:offset.y}}

 }
 tween(m:SmokeModel,time:number){
  if(m.kind!=='decal')return
  m.alpha=255*Math.max(0,Math.min(1,m.fadeAt===undefined?(time-m.born)/this.config.fadeDuration:1-(time-m.fadeAt)/this.config.fadeDuration))
  if(m.fadeAt!==undefined&&time-m.fadeAt>=this.config.fadeDuration&&!m.queued){m.queued=true;this.onRemove(m)}
 }
 remove(m:SmokeModel,time:number){
  if(m.kind==='aura'){m.endedAt=time;for(const d of m.decals)d.fadeAt=time}
  else if(m.kind==='modifier'){
   if(this.modifiers.get(m.enemy)===m){this.modifiers.delete(m.enemy);m.enemy.smokeDodgeUntil=undefined;m.enemy.dodge=m.previousDodge}
  }else{
   for(let i=this.owner.areas.length-1;i>=0;i--){const a=this.owner.areas[i];if(!('native'in a))continue;const n=a as SmokeAura;const j=n.decals.indexOf(m);if(j>=0)n.decals.splice(j,1);if(n.endedAt!==undefined&&!n.decals.length)this.owner.areas.splice(i,1)}
  }
  return true
 }
}
