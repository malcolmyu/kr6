import {FirebookBurnRuntime} from './FirebookBurnRuntime.ts'
import type {EnemyInstance} from './GameSession'
import type {Damage} from './Damage'
export interface FirebookBurn {id:number;enemy:EnemyInstance;level:number;at:number;spriteAt:number;dpsTs:number;removeNext:boolean}
interface FirebookMod {modifier:{duration:number;vis_flags:number;vis_bans:number};dps:{damage_config:number[];damage_every:number;damage_type:number}}
/** Original firebook insert1884 + mod_dps4837. Queued mods insert next tick. */
export class WizardFirebookSystem {
 native=false
 readonly runtime:FirebookBurnRuntime
 readonly burns:FirebookBurn[]=[]
 onDamage:(enemy:EnemyInstance,damage:Damage,time:number)=>void=()=>{}
 private pending:{enemy:EnemyInstance;level:number}[]=[]
 private nextId=1
 private template:FirebookMod|undefined
 private random:()=>number
 constructor(template:FirebookMod|undefined,random:()=>number){this.template=template;this.random=random;this.runtime=new FirebookBurnRuntime(this,random,template)}
 queue(enemy:EnemyInstance,level:number){if(this.native){this.runtime.queue(enemy,level);return}this.pending.push({enemy,level})}
 advance(time:number,enemies:EnemyInstance[]){
  if(this.native)return
  for(let i=this.burns.length-1;i>=0;i--)if(this.burns[i].removeNext)this.burns.splice(i,1)
  const c=this.template
  if(!c){if(this.pending.length)throw new Error('Missing original mod_firebook_aura');return}
  for(const p of this.pending.splice(0)){
   const old=this.burns.find(b=>b.enemy===p.enemy)
   if(old&&old.level===p.level){old.at=time;continue}
   if(old&&old.level>p.level)continue
   if(old)this.burns.splice(this.burns.indexOf(old),1)
   const e=p.enemy,m=c.modifier
   if(!enemies.includes(e)||e.hp<=0||e.template.vis.bans&m.vis_flags||e.template.vis.flags&m.vis_bans)continue
   this.burns.push({id:this.nextId++,enemy:e,level:p.level,at:time,spriteAt:time,dpsTs:time-c.dps.damage_every,removeNext:false})
  }
  for(const b of this.burns){
   const e=b.enemy
   if(e.hp<=0||!enemies.includes(e)||time-b.at>=c.modifier.duration-1e-9){b.removeNext=true;continue}
   if(time-b.dpsTs>=c.dps.damage_every){b.dpsTs+=c.dps.damage_every;this.random();this.onDamage(e,{value:c.dps.damage_config[b.level-1],damage_type:c.dps.damage_type},time)}
  }
 }
}
