import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {HeroTombstone} from './HeroLifeRuntime'
import data from '../../public/data/hero-life-runtime.json' with {type:'json'}
export class HeroLifeRenderer {
 readonly sprites=new Map<HeroTombstone,ExoSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>){this.scene=scene;this.atlas=atlas;this.exos=exos}
 advance(session:GameSession){const live=new Set<HeroTombstone>()
  for(const m of session.heroes.life.tombs){const entity=session.entities?.entity(m);if(!entity||!session.entities!.registry.entities.get(entity.id))continue
   const c=data.hero_zefira.tombstone.sprite;live.add(m);let art=this.sprites.get(m);if(!art){art=new ExoSprite(this.atlas,this.exos[c.prefix]);this.scene.add(art.root);this.sprites.set(m,art)}
   art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,1);art.root.scale.set(c.scale.x*(m.facingLeft?-1:1),c.scale.y,1);art.setOrder(...nativeSpriteOrder(c,m.pos,entity.id));art.setOpacity(m.alpha/255);art.animate(c.name,session.time-m.at,c.loop,30)
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
