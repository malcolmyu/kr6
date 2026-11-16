import type {HeroUnit} from './HeroSystem'
export interface GeraldRegeneration {hero:HeroUnit;ts:number;health:number}
/** The regeneration aura owns an absolute clock and snapshots maximum HP on insertion. */
export class GeraldTalents {
 regenerationEnabled=false
 regeneration?:GeraldRegeneration
 configure(nodes:string[]){this.regenerationEnabled=nodes.includes('talent_2')}
 insertRegeneration(hero:HeroUnit){if(this.regenerationEnabled)this.regeneration={hero,ts:0,health:hero.template.health.hp_max*.03}}
 advance(time:number,hero:HeroUnit|undefined,mayRecreate=true){
  time=Math.round(time*30)/30
  if(this.regeneration&&(this.regeneration.hero!==hero||this.regeneration.hero.hp<=0))this.regeneration=undefined
  if(this.regenerationEnabled&&!this.regeneration&&hero&&hero.hp>0&&mayRecreate){this.insertRegeneration(hero);return}
  const aura=this.regeneration;if(!aura)return
  const h=aura.hero,cooldown=h.template.regen.cooldown
  if(time-aura.ts>=cooldown){
   if(!h.modifierTypes?.has('freeze')&&!((h.template.vis?.bans??0)&4)){
    aura.ts+=cooldown;h.hp=Math.max(0,Math.min(h.template.health.hp_max,h.hp+aura.health))
   }else aura.ts=time
  }
 }
}
