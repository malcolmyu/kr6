import {nativeAnimationFrame} from './NativeAnimation.ts'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder'
import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
interface Config extends NativeSpriteSort {loop?:boolean;name:string;prefix:string;anchor:{x:number;y:number};offset:{x:number;y:number}}
export class CulverineNativeRenderer {
 readonly sprites=new Map<object,AtlasSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private animations:Record<string,Animation>,private templates:Record<string,{render:{sprites:Config[]}}>){}
 advance(session:GameSession){
  const live=new Set<object>()
  for(const m of [...session.combat.nativeCulverine.decals,...session.sulfur.decals]){
   const entity=session.entities?.entity(m)
   if(m.born===undefined||!entity||!session.entities?.registry.entities.get(entity.id))continue
   live.add(m);let art=this.sprites.get(m)
   if(!art){art=this.atlas.create();this.sprites.set(m,art);this.scene.add(art.root)}
   const c=this.templates[m.name].render.sprites[0],a=this.animations[`${c.prefix}_${c.name}`],frame=nativeAnimationFrame(a.to-a.from+1,session.time-m.born,c.loop??false,30).frame
   art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,c.anchor);art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.setOpacity(m.alpha/255);art.setOrder(...nativeSpriteOrder(c,m.pos,entity.id))
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
