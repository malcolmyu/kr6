import {recordEnemyDamage} from './EnemyDeath.ts'
import native from '../../public/data/rain-of-fire.json' with {type:'json'}
import type {EnemyInstance} from './GameSession'
import type {Point} from './types'
import {predictDamage} from './Damage.ts'
import {nativeAnimationFrame} from './NativeAnimation.ts'
interface AuraConfig {radius:number;duration:number;cycle_time:number;vis_flags:number;vis_bans:number}
interface Template {aura?:AuraConfig;modifier?:{duration:number;vis_flags:number;vis_bans:number};dps?:{damage_min:number;damage_max:number;damage_inc:number;damage_every:number;damage_type:number};slow?:{factor:number};duration?:number;explosion_delay?:number;damage_min?:number;damage_max?:number;damage_type?:number;upgrade_scorching_floor?:boolean;upgrade_slow_floor?:boolean;upgrade_extra_explosion?:boolean;dmg_aura?:string;slow_aura?:string;bullet?:{hit_decal:string;hit_fx:string;hit_payload:string}}
export interface RainArea {kind:'burn'|'slow';pos:Point;at:number;last:number;duration:number}
export interface RainBurn {enemy:EnemyInstance;at:number;spriteAt:number;dpsTs:number;pending:boolean;fadeAt?:number;removeNext?:boolean}
export interface RainSlow {enemy:EnemyInstance;at:number;pending:boolean}
export interface RainScorch {id:number;pos:Point;at:number;spriteAt:number;fadeAt?:number;removeNext?:boolean}
export interface RainExplosion {id:number;pos:Point;at:number;hit:boolean}
export function rainImpactEntities(template:Template,water:boolean){
 if(water)return ['fx_explosion_water']
 const b=template.bullet!,out:string[]=[]
 if(b.hit_decal)out.push(b.hit_decal)
 if(template.upgrade_scorching_floor)out.push(template.dmg_aura!)
 if(template.upgrade_slow_floor)out.push(template.slow_aura!)
 if(b.hit_fx)out.push(b.hit_fx)
 if(template.upgrade_extra_explosion&&b.hit_payload)out.push(b.hit_payload)
 return out
}
const inside=(p:Point,c:Point,r:number)=>(p.x-c.x)**2+(p.y-c.y)**2/(.7*.7)<=r*r
/** Original aura/mod_lifecycle/mod_dps and delayed explosion clocks, isolated from the flight controller. */
export class RainAreas {
 readonly areas:RainArea[]=[]
 readonly burns=new Map<number,RainBurn>()
 readonly slows=new Map<number,RainSlow>()
 readonly scorches:RainScorch[]=[]
 readonly explosions:RainExplosion[]=[]
 onQueue:(name:string,enemy:EnemyInstance,time:number)=>void=()=>{}
 targetValid:(enemy:EnemyInstance)=>boolean=()=>true
 private templates:Record<string,Template>
 private random:()=>number
 private onKill:(enemy:EnemyInstance)=>void
 private pending:{name:string;pos:Point;at?:number}[]=[]
 private mods:{kind:'burn'|'slow';enemy:EnemyInstance}[]=[]
 private nextId=1
 constructor(templates:Record<string,object>,random:()=>number,onKill:(enemy:EnemyInstance)=>void){this.templates={...native.templates,...templates} as unknown as Record<string,Template>;this.random=random;this.onKill=onKill}
 queue(name:string,pos:Point,time?:number){this.pending.push({name,pos:{...pos},at:time})}
 startArea(kind:RainArea['kind'],pos:Point,time:number){const c=this.templates[`aura_bullet_power_rain_of_fire_${kind==='burn'?'dmg':'slow'}`].aura!;this.areas.push({kind,pos:{...pos},at:time,last:time-c.cycle_time,duration:c.duration})}
 startExtra(pos:Point,time:number){this.explosions.push({id:this.nextId++,pos:{...pos},at:time,hit:false})}
 alpha(b:RainBurn,time:number){return b.fadeAt===undefined?1:Math.max(0,1-(time-b.fadeAt)/.75)}
 scorchAlpha(s:RainScorch,time:number){return s.fadeAt===undefined?1:Math.max(0,Math.min(1,(2.5-(time-s.fadeAt))/1.5))}
 private eligible(enemy:EnemyInstance,c:AuraConfig,pos:Point){return enemy.hp>0&&enemy.escapedAt===undefined&&!(enemy.template.vis.flags&c.vis_bans)&&!(enemy.template.vis.bans&c.vis_flags)&&inside(enemy.path.position,pos,c.radius)}
 private damage(enemy:EnemyInstance,value:number,type:number,time:number){if(enemy.hp<=0||enemy.template.health.ignore_damage)return;recordEnemyDamage(enemy,type,time);enemy.hp-=predictDamage({...enemy.template.health,hp:enemy.hp},{value,damage_type:type});if(enemy.hp<=0){enemy.diedAt=time;this.onKill(enemy)}}
 advance(time:number,enemies:EnemyInstance[]){
  for(const m of this.mods.splice(0)){
   const e=m.enemy;if(e.hp<=0||!enemies.includes(e))continue
   if(m.kind==='burn'){
    const old=this.burns.get(e.id);if(old){old.at=time;continue}
    const c=this.templates.mod_bullet_power_rain_of_fire_burn.modifier!
    if(e.template.vis.bans&c.vis_flags||e.template.vis.flags&c.vis_bans)continue
    this.burns.set(e.id,{enemy:e,at:time,spriteAt:time,dpsTs:time-this.templates.mod_bullet_power_rain_of_fire_burn.dps!.damage_every,pending:false})
   }else{
    const old=this.slows.get(e.id);if(old){old.at=time;continue}
    if(e.template.motion.invulnerable)continue
    e.template.motion.max_speed*=this.templates.mod_bullet_power_rain_of_fire_slow.slow!.factor;this.slows.set(e.id,{enemy:e,at:time,pending:false})
   }
  }
  for(const [id,b]of this.burns){if(b.removeNext){this.burns.delete(id);continue}if(b.pending){b.pending=false;b.fadeAt=time}}
  for(const [id,s]of this.slows)if(s.pending){s.enemy.template.motion.max_speed/=this.templates.mod_bullet_power_rain_of_fire_slow.slow!.factor;this.slows.delete(id)}
  for(const p of this.pending.splice(0)){
   if(p.name==='aura_bullet_power_rain_of_fire_dmg')this.startArea('burn',p.pos,time)
   else if(p.name==='aura_bullet_power_rain_of_fire_slow')this.startArea('slow',p.pos,time)
   else if(p.name==='decal_power_rain_of_fire_extra_explosion')this.startExtra(p.pos,time)
   else if(p.name==='decal_power_rain_of_fire_scorch')this.scorches.push({id:this.nextId++,pos:p.pos,at:time,spriteAt:p.at??time})
  }
  for(let index=this.areas.length-1;index>=0;index--){const a=this.areas[index],c=this.templates[`aura_bullet_power_rain_of_fire_${a.kind==='burn'?'dmg':'slow'}`].aura!
   if(time-a.at>a.duration){this.areas.splice(index,1);continue}
   if(time-a.last<c.cycle_time)continue;a.last=time
   for(const e of enemies)if(this.eligible(e,c,a.pos)){const name=`mod_bullet_power_rain_of_fire_${a.kind}`;this.mods.push({kind:a.kind,enemy:e});this.onQueue(name,e,time)}
  }
  const burn=this.templates.mod_bullet_power_rain_of_fire_burn,dps=burn.dps!
  for(const b of this.burns.values()){
   if(b.fadeAt!==undefined){if(time-b.fadeAt>=.75)b.removeNext=true;continue}
   if(b.enemy.hp<=0||!enemies.includes(b.enemy)||time-b.at>=burn.modifier!.duration-1e-9){b.pending=true;continue}
   if(time-b.dpsTs>=dps.damage_every){b.dpsTs+=dps.damage_every;const min=Math.floor(dps.damage_min+dps.damage_inc),max=Math.floor(dps.damage_max+dps.damage_inc);this.damage(b.enemy,min+Math.floor(this.random()*(max-min+1)),dps.damage_type,time)}
  }
  for(const s of this.slows.values())if(s.enemy.hp<=0||!enemies.includes(s.enemy)||time-s.at>this.templates.mod_bullet_power_rain_of_fire_slow.modifier!.duration)s.pending=true
  for(let index=this.scorches.length-1;index>=0;index--){const s=this.scorches[index];if(s.removeNext){this.scorches.splice(index,1);continue}if(s.fadeAt===undefined&&time-s.at>=this.templates.decal_power_rain_of_fire_scorch.duration!)s.fadeAt=time;if(s.fadeAt!==undefined&&time-s.fadeAt>=2.5)s.removeNext=true}
  const extra=this.templates.decal_power_rain_of_fire_extra_explosion!,delay=Math.round(extra.explosion_delay!*30)/30
  for(let index=this.explosions.length-1;index>=0;index--){const x=this.explosions[index]
   if(!x.hit&&time-x.at>=delay){x.hit=true;for(const e of enemies)if(this.eligible(e,extra.aura!,x.pos)&&this.targetValid(e)){const p=e.path.position,distance=Math.sqrt((p.x-x.pos.x)**2+(p.y-x.pos.y)**2/(.7*.7))/extra.aura!.radius;this.damage(e,Math.floor(extra.damage_max!-(extra.damage_max!-extra.damage_min!)*distance),extra.damage_type!,time)}}
   if(x.hit&&nativeAnimationFrame(37,time-x.at,false,30).runs>0)this.explosions.splice(index,1)
  }
 }
}
