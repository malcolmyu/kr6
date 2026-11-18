import {ExoSprite} from './ExoSprite.ts'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type * as THREE from 'three'
import type {SpriteAtlas} from './SpriteAtlas'
import type {ThrottleBuff,CulverineThrottleRuntime} from './CulverineThrottleRuntime'
import type {GameSession} from './GameSession'
import type {NativeSpriteSort} from './NativePainterOrder'
interface Config extends NativeSpriteSort {prefix:string;name:string;loop:boolean;offset:{x:number;y:number}}
export class CulverineThrottleRenderer {
 readonly sprites=new Map<ThrottleBuff,ExoSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private exos:Record<string,ConstructorParameters<typeof ExoSprite>[1]>,private templates:Record<string,{render:{sprites:Config[]}}>){}
 advance(session:GameSession,runtime:CulverineThrottleRuntime){
  const live=new Set<ThrottleBuff>()
  for(const m of runtime.models){const entity=session.entities?.entity(m);if(!entity||!session.entities?.registry.entities.get(entity.id))continue
   live.add(m);const c=this.templates[m.name].render.sprites[0];let art=this.sprites.get(m)
   if(!art){art=new ExoSprite(this.atlas,this.exos[c.prefix]);this.sprites.set(m,art);this.scene.add(art.root)}
   art.setOpacity(m.alpha/255);art.animate(c.name,session.time-m.spriteAt,c.loop,30);art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.setOrder(...nativeSpriteOrder(c,m.pos,entity.id))
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
