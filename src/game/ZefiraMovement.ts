import type {HeroUnit} from './HeroSystem'
import type {Point} from './types'
export interface ZefiraBlinkBuff {hero:HeroUnit;modifierAt:number;animationAt:number;phaseAt:number;phase:'in'|'loop'|'out';deathEnd:boolean;factor:number;duration:number}
interface Movement {hero:HeroUnit;phase:'teleport_out'|'teleport_in'|'walk_in'|'walk'|'walk_out';phaseAt:number;bans:number;arrived:boolean}
/** Native Zefira rally coroutine: transfer immunity, distance-gated blink and its damage modifier. */
export class ZefiraMovement {
 level=0
 state?:Movement
 buff?:ZefiraBlinkBuff
 private pending?:{hero:HeroUnit;pos:Point}
 get hasPending(){return this.pending!==undefined}
 private lastBuff?:number
 onReleaseTarget:(hero:HeroUnit)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 configure(nodes:string[]){this.level=nodes.includes('upg_sc2')?3:nodes.includes('upg_sc1')?2:nodes.includes('skill_c')?1:0}
 request(hero:HeroUnit,pos:Point){this.pending={hero,pos:{...pos}};hero.rally={...pos};hero.center={...pos};return true}
 applyBuff(hero:HeroUnit,time:number){
  if(!this.level||hero.hp<=0)return
  if(this.buff){this.buff.modifierAt=time;return}
  const factor=[1,1.3,1.4,1.5][this.level]
  hero.template.unit!.damage_factor=(hero.template.unit!.damage_factor??1)*factor
  this.buff={hero,modifierAt:time,animationAt:time,phaseAt:time,phase:'in',deathEnd:false,factor,duration:2+this.level*2}
 }
 advance(time:number,hero:HeroUnit|undefined,dt=1/30,canStart=true){
  time=Math.round(time*30)/30
  this.advanceBuff(time,hero)
  if(hero&&this.lastBuff===undefined)this.lastBuff=hero.born-2
  if(canStart&&!this.state&&this.pending&&time+1e-9>=(this.pending.hero.actionYieldUntil??0)){const p=this.pending;this.pending=undefined;this.begin(p.hero,p.pos,time)}
  const s=this.state;if(!s)return
  const h=s.hero
  if(s.phase==='teleport_out'){
   if(this.pending?.hero===h||time-s.phaseAt+1e-9>=16/30){
    const to=this.pending?.hero===h?this.pending.pos:h.rally
    Object.assign(h.pos,to);h.rally={...to};h.center={...to};s.phase='teleport_in';s.phaseAt=time;h.visualOverride={name:s.phase,at:time};this.onSound('HeroZefiraAstralBlinkOutCast')
   }
  }else if(s.phase==='teleport_in'){
   if(time-s.phaseAt+1e-9>=14/30){
    this.finish(s)
    if(this.level&&time-(this.lastBuff??time)>2){this.lastBuff=time;this.applyBuff(h,time)}
   }
  }else if(s.phase==='walk_out'){
   if(time-s.phaseAt+1e-9>=6/30)this.finish(s)
  }else{
   if(s.arrived){s.phase='walk_out';s.phaseAt=time;h.moving=false;h.visualOverride={name:'walk_out',at:time};return}
   if(this.pending?.hero===h){
    const p=this.pending;this.pending=undefined
    if(this.level&&Math.hypot(p.pos.x-h.pos.x,p.pos.y-h.pos.y)>160){this.restore(s);this.begin(h,p.pos,time);return}
    s.phase='walk';s.phaseAt=time;h.facingLeft=p.pos.x<h.pos.x;h.visualOverride={name:'walk',at:time}
   }
   const duration=s.phase==='walk_in'?4/30:24/30
   if(time-s.phaseAt+1e-9>=duration){s.phase='walk';s.phaseAt=time;h.visualOverride={name:'walk',at:time}}
   const dx=h.rally.x-h.pos.x,dy=h.rally.y-h.pos.y,d=Math.hypot(dx,dy),step=h.template.motion.max_speed*dt
   if(d<=step){Object.assign(h.pos,h.rally);s.arrived=true}else{h.pos.x+=dx/d*step;h.pos.y+=dy/d*step}
   h.moving=true
  }
 }
 private begin(h:HeroUnit,pos:Point,time:number){
  if(h.hp<=0)return
  this.onReleaseTarget(h);h.target=undefined;h.attack=undefined;h.rangedUntil=undefined;h.scriptLocked=false;h.visualOverride=undefined;h.deploying=false;h.moving=false
  const sound=h.template.sound_events?.change_rally_point;if(sound)this.onSound(sound)
  h.rally={...pos};h.center={...pos}
  if(Math.hypot(pos.x-h.pos.x,pos.y-h.pos.y)===0)return
  const blink=this.level>0&&Math.hypot(pos.x-h.pos.x,pos.y-h.pos.y)>160
  const phase=blink?'teleport_out':'walk_in',bans=h.template.vis?.bans??0
  this.state={hero:h,phase,phaseAt:time,bans,arrived:false};h.scriptLocked=true;h.ignoreDamage=true
  if(h.template.vis)h.template.vis.bans=4294967295
  if(blink&&h.template.health_bar)h.template.health_bar.hidden=true
  h.facingLeft=pos.x<h.pos.x;h.visualOverride={name:phase,at:time}
  if(blink)this.onSound('HeroZefiraAstralBlinkInCast')
 }
 private restore(s:Movement){s.hero.ignoreDamage=false;if(s.hero.template.vis)s.hero.template.vis.bans=s.bans}
 private finish(s:Movement){
  this.restore(s);s.hero.scriptLocked=false;s.hero.moving=false;s.hero.visualOverride=undefined
  if(s.phase==='teleport_in'&&s.hero.template.health_bar)s.hero.template.health_bar.hidden=false
  this.state=undefined
 }
 private advanceBuff(time:number,hero:HeroUnit|undefined){
  const b=this.buff;if(!b)return
  if(b.phase==='in'&&time-b.phaseAt+1e-9>=4/30)b.phase='loop'
  if(b.phase==='loop'&&(hero!==b.hero||b.hero.hp<=0||time-b.modifierAt>b.duration)){
   b.phase='out';b.phaseAt=time;b.animationAt=time;b.deathEnd=hero!==b.hero||b.hero.hp<=0
  }
  if(b.phase==='out'){
   if(!b.deathEnd&&time-b.modifierAt<=b.duration){b.phase='in';b.phaseAt=time;b.animationAt=time}
   else if(time-b.phaseAt+1e-9>=8/30){b.hero.template.unit!.damage_factor=(b.hero.template.unit!.damage_factor??1)/b.factor;this.buff=undefined}
  }
 }
}
