import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativePaintOrder} from './NativePainterOrder'
import type {TowerTemplate} from './TowerSystem'
import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {Point} from './types'
export class ArcherRangeRenderer {
 private sprites=new Map<string,ExoSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 private templates:Record<string,TowerTemplate>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>,templates:Record<string,TowerTemplate>){this.scene=scene;this.atlas=atlas;this.exos=exos;this.templates=templates}
 advance(session:GameSession){
  const live=new Set<string>(),system=session.archerRange,time=session.time
  const draw=(key:string,prefix:string,name:string,age:number,pos:Point,order:number,opacity:number,loop=true,native?:NativePaintOrder)=>{live.add(key);let sprite=this.sprites.get(key);if(!sprite){sprite=new ExoSprite(this.atlas,this.exos[prefix]);this.scene.add(sprite.root);this.sprites.set(key,sprite)}sprite.root.position.set(pos.x,pos.y,2);sprite.setOrder(order,native);sprite.setOpacity(opacity);sprite.animate(name,age,loop,native?this.exos[prefix].fps:undefined)}
  if(system.native){
   for(const m of system.runtime.models){
    const entity=session.entities?.entity(m)
    if(!m.inserted||!entity||!session.entities?.registry.entities.get(entity.id))continue
    const name=m.kind==='buff'?'mod_archers_skill_b_range':m.kind==='eagle'?'decal_archers_skill_b_eagle':'decal_archers_skill_b_preview'
    for(const [i,config]of this.templates[name].render.sprites.entries()){
     const offset=m.kind==='eagle'?config.offset:m.offset,pos={x:m.pos.x+offset.x,y:m.pos.y+offset.y},sort=m.kind==='eagle'?{...config,draw_order:m.draw}:config
     const [order,native]=nativeSpriteOrder(sort,m.pos,entity.id,i+1),at=m.kind==='buff'?m.spriteAt:m.queued
     draw(`native-range-${entity.id}-${i+1}`,config.prefix!,config.name,time-at,pos,order,m.kind==='eagle'?1:m.alpha/255,config.loop??true,native)
    }
   }
   for(const [key,sprite]of this.sprites)if(!live.has(key)){sprite.dispose();this.sprites.delete(key)}
   return
  }
  for(const [id,buff]of system.buffs){const offset=system.offset(buff.target),pos={x:buff.target.pos.x+offset.x,y:buff.target.pos.y+offset.y},alpha=Math.max(0,Math.min(1,(time-buff.tweenAt)/.5));draw('range-'+id,'archer_buffdecalDef','loop',time-buff.spriteAt,pos,10000-buff.target.pos.y+.015,alpha);draw('range-under-'+id,'archer_buffdecal_2Def','idle',time-buff.spriteAt,pos,5000-buff.target.pos.y,alpha)}
  for(const p of system.previews)if(p.at!==undefined){const pos={x:p.target.pos.x+p.offset.x,y:p.target.pos.y+p.offset.y};draw('preview-'+p.id,'archer_buffdecalDef','loop',time-p.at,pos,10000-p.target.pos.y+.015,Math.min(1,(time-p.at)/.5))}
  for(const eagle of system.eagles)if(eagle.started!==undefined){draw('eagle-'+eagle.id,'archer_buffbirdDef','run',time-eagle.queued,{x:eagle.source.pos.x+7,y:eagle.source.pos.y+15},10000-eagle.source.pos.y+eagle.draw/100,1,false)}
  for(const [key,sprite]of this.sprites)if(!live.has(key)){sprite.dispose();this.sprites.delete(key)}
 }
 dispose(){this.sprites.forEach(s=>s.dispose());this.sprites.clear()}
}
