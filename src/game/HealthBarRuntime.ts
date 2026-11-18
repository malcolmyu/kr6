import {HealthBar} from './HealthBar.ts'
import type {HealthBarConfig} from './HealthBar'
import type {GameSession} from './GameSession'
/** systems.render advances health-bar fades on simulation ticks, even between paints. */
export class HealthBarRuntime {
 readonly states=new WeakMap<object,HealthBar>()
 private pendingAlpha=new WeakMap<object,number>()
 setAlpha(source:object,alpha:number){const bar=this.states.get(source);if(bar)bar.alpha=alpha;else this.pendingAlpha.set(source,alpha)}
 readonly frames=new Map<object,ReturnType<HealthBar['sample']>>()
 advance(session:GameSession){
  this.frames.clear()
  const units=[...session.enemies.map(e=>({source:e,hp:e.hp,max:Array.isArray(e.template.health.hp_max)?e.template.health.hp_max[1]:e.template.health.hp_max,pos:e.path.position,config:(e.template as unknown as {health_bar?:HealthBarConfig}).health_bar,hidden:e.diedAt!==undefined||e.escapedAt!==undefined&&!session.entities||e.teleportHidden})),...session.barracks.soldiers.map(s=>({source:s,hp:s.hp,max:s.template.health.hp_max,pos:s.pos,config:(s.template as unknown as {health_bar?:HealthBarConfig}).health_bar,hidden:s.healthBarHidden}))]
  for(const u of units){
   // Native render keeps frames until the entity or its bar is hidden/removed.
   if(!u.config||u.hp<=0&&!session.entities)continue
   const entity=session.entities?.entity(u.source)
   if(session.entities&&(!entity||!session.entities.registry.entities.get(entity.id)))continue
   let bar=this.states.get(u.source)
   if(!bar){bar=new HealthBar(u.config);this.states.set(u.source,bar)}
   const alpha=this.pendingAlpha.get(u.source);if(alpha!==undefined){bar.alpha=alpha;this.pendingAlpha.delete(u.source)}
   this.frames.set(u.source,bar.sample(session.time,u.hp,u.max,u.pos,u.hidden||u.config.hidden))
  }
 }
}
