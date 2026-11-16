import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {SpriteAtlas} from './SpriteAtlas'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder'
import type {GameSession} from './GameSession'
import type {ArcherMark} from './ArcherMarkRuntime'
export class ArcherMarkRenderer {
 readonly sprites=new Map<ArcherMark,ExoSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private definition:ExoDefinition
 private config:NativeSpriteSort
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,definition:ExoDefinition,config:NativeSpriteSort){this.scene=scene;this.atlas=atlas;this.definition=definition;this.config=config}
 advance(session:GameSession){
  const live=new Set<ArcherMark>()
  for(const m of session.archerMark.marks){
   const entity=session.entities?.entity(m);if(!m.inserted||!m.render||!entity||!session.entities?.registry.entities.get(entity.id))continue
   live.add(m);let art=this.sprites.get(m)
   if(!art){art=new ExoSprite(this.atlas,this.definition);this.sprites.set(m,art);this.scene.add(art.root)}
   art.root.position.set(m.pos.x+m.offset.x,m.pos.y+m.offset.y,2)
   art.setOrder(...nativeSpriteOrder(this.config,m.pos,entity.id));art.animate(m.animation,session.time-m.spriteAt,m.loop,this.definition.fps)
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
