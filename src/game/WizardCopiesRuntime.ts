import {WizardBookBounceSystem} from './WizardBookBounce.ts'
import {WizardBookAuraSystem} from './WizardBookAura.ts'
import type {WizardBookAura,WizardBookShot} from './WizardBookAura'
import type {LevelData,Point} from './types'
interface Templates {aura_wizard_skill_c:ConstructorParameters<typeof WizardBookAuraSystem>[0]}
export interface WizardCopiesBounce {name:'controller_tower_wizard_book_bounce';pos:Point;level:number;done:boolean}
export type WizardCopiesAura=WizardBookAura&{name:'aura_wizard_skill_c';inserted:boolean}
/** Autonomous copies payloads survive replacing or selling their source tower. */
export class WizardCopiesRuntime {
 readonly auras:WizardCopiesAura[]=[]
 readonly bounce:WizardBookBounceSystem
 readonly book:WizardBookAuraSystem
 onQueue:(model:WizardCopiesBounce|WizardCopiesAura,kind:'copyBounce'|'copyAura')=>void=()=>{}
 onRemove:(model:object)=>void=()=>{}
 onReserve:(name:string)=>object=()=>({})
 onBomb:(model:object,shot:{name:string;from:Point;to:Point;level:number},time:number)=>void=()=>{}
 onShard:(model:object,shot:WizardBookShot,time:number)=>void=()=>{}
 private pending?:object
 private currentBounce?:WizardCopiesBounce
 private time=0
 constructor(level:LevelData,templates:Templates,landFrames:number,random:()=>number){
  this.bounce=new WizardBookBounceSystem(level,random);this.book=new WizardBookAuraSystem(templates.aura_wizard_skill_c,landFrames,random)
  this.bounce.onCreateShot=()=>{this.pending=this.onReserve('bullet_skill_c_wizard_2')}
  this.bounce.onShot=shot=>this.onBomb(this.pending!,shot,this.time)
  this.bounce.onRemove=()=>this.onRemove(this.currentBounce!)
  this.book.onCreateShot=name=>{this.pending=this.onReserve(name)}
  this.book.onShot=(shot,time)=>this.onShard(this.pending!,shot,time)
  this.book.onRemove=model=>this.onRemove(model)
 }
 queueBounce(pos:Point,level:number){this.onQueue({name:'controller_tower_wizard_book_bounce',pos:{...pos},level,done:false},'copyBounce')}
 queueAura(pos:Point,level:number){const model=Object.assign(this.book.create(pos,level),{name:'aura_wizard_skill_c' as const,inserted:false});this.auras.push(model);this.onQueue(model,'copyAura')}
 advanceBounce(model:WizardCopiesBounce,time:number){if(model.done)return;model.done=true;this.time=time;this.currentBounce=model;this.bounce.advance(model.pos,model.level)}
 advanceAura(model:WizardCopiesAura,time:number){this.book.advance(model,time)}
 insertAura(model:WizardCopiesAura){model.inserted=true}
 removeAura(model:WizardCopiesAura){this.book.remove(model);const i=this.auras.indexOf(model);if(i>=0)this.auras.splice(i,1)}
 tween(model:WizardCopiesAura,time:number){this.book.tween(model,time)}
}
