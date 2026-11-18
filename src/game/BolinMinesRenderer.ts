import {ExoSprite} from './ExoSprite'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {ExoDefinition} from './ExoSprite'
import type {NativeSpriteSort} from './NativePainterOrder'
import type {SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {BolinMineModel} from './BolinMinesRuntime'
import type {Point} from './types'
import type * as THREE from 'three'
interface Config extends NativeSpriteSort {prefix:string;offset:Point;scale?:Point;alpha:number}
export class BolinMinesRenderer {
 readonly sprites=new Map<BolinMineModel,ExoSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private exos:Record<string,ExoDefinition>,private templates:Record<string,{render:{sprites:Config[]}}> ){}
 advance(g:GameSession){
  const live=new Set<BolinMineModel>()
  for(const m of g.heroes.bolinMines.models){
   const e=g.entities?.entity(m);if(!e||!g.entities?.registry.entities.get(e.id))continue
   live.add(m);const c=this.templates[m.name].render.sprites[0];let art=this.sprites.get(m)
   if(!art){art=new ExoSprite(this.atlas,this.exos[c.prefix]);this.sprites.set(m,art);this.scene.add(art.root)}
   art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.root.rotation.z=m.rotation;art.root.scale.set(c.scale?.x??1,c.scale?.y??1,1)
   art.setOrder(...nativeSpriteOrder({...c,z:m.z},m.pos,e.id));art.setOpacity(c.alpha/255);art.animate(m.animation,g.time-m.spriteAt,m.loop,30)
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
