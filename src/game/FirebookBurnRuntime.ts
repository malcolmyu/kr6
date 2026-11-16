import type {Point} from './types'
import type {EnemyInstance} from './GameSession'
import type {FirebookBurn,WizardFirebookSystem} from './WizardFirebook'
export interface NativeFirebookBurn extends FirebookBurn {pos:Point;inserted:boolean;queued:boolean}
interface Config {modifier:{duration:number;vis_flags:number;vis_bans:number};dps:{damage_config:number[];damage_every:number;damage_type:number}}
/** Original mod_lifecycle4, firebook.insert1884 and mod_dps own-main4837. */
export class FirebookBurnRuntime {
 onQueue:(burn:NativeFirebookBurn)=>void=()=>{}
 onRemove:(burn:NativeFirebookBurn)=>void=()=>{}
 candidates:(enemy:EnemyInstance)=>NativeFirebookBurn[]=enemy=>this.owner.burns.filter(b=>b.enemy===enemy) as NativeFirebookBurn[]
 present:(enemy:EnemyInstance)=>boolean=()=>true
 private serial=1
 private owner:WizardFirebookSystem
 private random:()=>number
 private config:Config|undefined
 constructor(owner:WizardFirebookSystem,random:()=>number,config:Config|undefined){this.owner=owner;this.random=random;this.config=config}
 queue(enemy:EnemyInstance,level:number){this.onQueue({id:this.serial++,enemy,level,at:0,spriteAt:0,dpsTs:0,removeNext:false,pos:{x:0,y:0},inserted:false,queued:false})}
 insert(m:NativeFirebookBurn,time:number){
  if(!this.config)throw Error('Missing original firebook modifier')
  m.at=time
  // Lifecycle refresh/replacement precedes the modifier's script acceptance.
  for(const old of this.candidates(m.enemy)){if(!old.inserted)continue
   if(old.level<m.level){this.removeLater(old);continue}
   if(old.level===m.level)old.at=time
   return false
  }
  const e=m.enemy,c=this.config.modifier
  if(!this.present(e)||e.hp<=0||(e.template.vis.bans&c.vis_flags)||(e.template.vis.flags&c.vis_bans))return false
  m.spriteAt=time;m.dpsTs=time-this.config.dps.damage_every;m.inserted=true;this.owner.burns.push(m);return true
 }
 advance(m:NativeFirebookBurn,time:number){
  if(m.queued)return
  const c=this.config!,e=m.enemy
  // Position aliases the target from the first own-main resume onwards.
  if(!this.present(e)||e.hp<=0||time-m.at>=c.modifier.duration-1e-9){this.removeLater(m);return}
  m.pos=e.path.position
  if(time-m.dpsTs>=c.dps.damage_every){m.dpsTs+=c.dps.damage_every;this.random();this.owner.onDamage(e,{value:c.dps.damage_config[m.level-1],damage_type:c.dps.damage_type},time)}
 }
 private removeLater(m:NativeFirebookBurn){if(m.queued)return;m.queued=true;this.onRemove(m)}
 remove(m:NativeFirebookBurn){const i=this.owner.burns.indexOf(m);if(i>=0)this.owner.burns.splice(i,1);m.inserted=false;return true}
}
