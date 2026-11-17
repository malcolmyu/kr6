import data from '../../public/data/knight-armor.json' with {type:'json'}
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite} from './SpriteAtlas'
import type {GameSession} from './GameSession'
export class KnightArmorRenderer {
 readonly sprites=new Map<string,AtlasSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas){}
 advance(session:GameSession){
  const live=new Set<string>()
  for(const m of session.knightArmor.models){const entity=session.entities?.entity(m);if(!m.inserted||!entity||!session.entities?.registry.entities.get(entity.id))continue
   for(const [i,c]of data.armorAura.render.sprites.entries()){
    const key=`${entity.id}:${i+1}`;live.add(key);let art=this.sprites.get(key)
    if(!art){art=this.atlas.create();this.scene.add(art.root);this.sprites.set(key,art)}
    const [order,native]=nativeSpriteOrder(c,m.pos,entity.id,i+1)
    art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.setFrame(c.name,c.anchor);art.setOrder(order,native);art.setOpacity(m.alpha/255)
   }
  }
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){this.sprites.forEach(s=>s.dispose());this.sprites.clear()}
}
