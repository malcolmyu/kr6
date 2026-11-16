import type {HeroUnit} from './HeroSystem'
import type {EnemyInstance} from './GameSession'
export interface ZefiraWeakness {enemy:EnemyInstance;at:number;animationAt:number}
const inside=(x:number,y:number,cx:number,cy:number)=>.7*.7*(x-cx)**2+(y-cy)**2<=50*50*(.7*.7)
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
/** Native weakening aura, including its raw-armour arithmetic and modifier queue phase. */
export class ZefiraTalents {
 weakening=false
 readonly weaknesses=new Map<number,ZefiraWeakness>()
 private source?:HeroUnit
 private ready=false
 private queuedAt?:number
 private lastPulse?:number
 private pending:{enemy:EnemyInstance;at:number}[]=[]
 onQueueModifier:(enemy:EnemyInstance,time:number)=>void=()=>{}
 configure(nodes:string[]){this.weakening=nodes.includes('talent_1')}
 insertAura(hero:HeroUnit){this.source=hero;this.ready=true;this.lastPulse=undefined;this.queuedAt=undefined}
 advance(time:number,hero:HeroUnit|undefined,enemies:EnemyInstance[]){
  for(let i=this.pending.length-1;i>=0;i--){const p=this.pending[i];if(time<=p.at)continue
   const e=p.enemy,previous=this.weaknesses.get(e.id)
   if(previous)previous.at=time
   else if(enemies.includes(e)&&e.hp>0&&e.template.enemy.can_accept_magic&&!(e.template.vis.bans&4)){
    const health=e.template.health,raw=health.raw_armor??health.armor,magic=health.raw_magic_armor??health.magic_armor
    health.raw_armor=raw-raw*.3;health.raw_magic_armor=magic-magic*.3
    health.armor=clamp(health.raw_armor);health.magic_armor=clamp(health.raw_magic_armor)
    this.weaknesses.set(e.id,{enemy:e,at:time,animationAt:time})
   }
   this.pending.splice(i,1)
  }
  for(const [id,m]of this.weaknesses)if(m.enemy.hp<=0||!enemies.includes(m.enemy)||time-m.at>=1){
   if(enemies.includes(m.enemy)){
    // The shipped remove function uses CURRENT raw armour, not the insertion snapshot.
    const h=m.enemy.template.health,raw=h.raw_armor??h.armor,magic=h.raw_magic_armor??h.magic_armor
    h.raw_armor=raw+raw*.3;h.raw_magic_armor=magic+magic*.3;h.armor=clamp(h.raw_armor);h.magic_armor=clamp(h.raw_magic_armor)
   }
   this.weaknesses.delete(id)
  }
  if(!this.weakening||!hero)return
  if(!this.source){this.source=hero;this.queuedAt=time;return}
  if(this.source!==hero)return
  if(!this.ready){if(time<=(this.queuedAt??time))return;this.insertAura(hero)}
  const cycle=hero.hp<=0?1e99:.5
  this.lastPulse??=time-cycle
  if(time-this.lastPulse<cycle)return
  this.lastPulse=time
  for(const e of enemies)if(e.hp>0&&e.escapedAt===undefined&&!(e.template.vis.flags&1184)&&inside(e.path.position.x,e.path.position.y,hero.pos.x,hero.pos.y)){this.pending.push({enemy:e,at:time});this.onQueueModifier(e,time)}
 }
}
