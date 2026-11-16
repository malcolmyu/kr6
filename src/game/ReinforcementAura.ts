import data from '../../public/data/reinforcements.json' with {type:'json'}
import type {SoldierInstance} from './BarracksCombat'
interface Aura {source:SoldierInstance;at:number;last:number;duration:number}
export interface ReinforcementBuff {target:SoldierInstance;at:number;spriteAt:number;removeAt?:number;removed?:boolean}
const config=data.templates.aura_power_reinforcement_special.aura
const damage=data.templates.mod_reinforcement_special_damage
const armor=data.templates.mod_reinforcement_special_armor
/** Native aura_apply_mod cycles and next-tick modifier insertion; same-rank refreshes do not stack. */
export class ReinforcementAura {
 readonly auras:Aura[]=[]
 readonly buffs=new Map<number,ReinforcementBuff>()
 private pending:SoldierInstance[]=[]
 onQueue:(target:SoldierInstance,time:number)=>void=()=>{}
 start(source:SoldierInstance,time:number,duration=config.duration){this.auras.push({source,at:time,last:time-config.cycle_time,duration})}
 advance(time:number,soldiers:SoldierInstance[]){
  for(const target of this.pending.splice(0)){
   if(target.hp<=0||!soldiers.includes(target))continue
   const old=this.buffs.get(target.id)
   if(old&&!old.removed){old.at=time;continue}
   target.buffs??=new Map();target.buffs.set('reinforcement-special',{armor:armor.armor_buff.max_factor,magicArmor:0,spikedArmor:0});target.reinforcementDamageFactor=damage.inflicted_damage_factor
   this.buffs.set(target.id,{target,at:time,spriteAt:time})
  }
  for(const [id,buff]of this.buffs){
   if(buff.removed){if(time-buff.removeAt!>=1)this.buffs.delete(id);continue}
   if(buff.removeAt!==undefined){buff.target.buffs?.delete('reinforcement-special');buff.target.reinforcementDamageFactor=1;buff.removed=true;continue}
   if(!soldiers.includes(buff.target)||buff.target.hp<=0||time-buff.at>damage.modifier.duration)buff.removeAt=time
  }
  for(let index=this.auras.length-1;index>=0;index--){
   const a=this.auras[index],source=a.source
   if(time-a.at>a.duration||!soldiers.includes(source)){this.auras.splice(index,1);continue}
   if(source.hp<=0||time-a.last<config.cycle_time)continue
   a.last=time
   for(const target of soldiers){
    const vis=target.template.vis,p=target.pos,o=source.pos
    if(target.hp<=0||!vis||vis.flags&config.vis_bans||vis.bans&config.vis_flags||(p.x-o.x)**2+(p.y-o.y)**2/(.7*.7)>config.radius**2)continue
    this.pending.push(target);this.onQueue(target,time)
   }
  }
 }
}
