import type * as THREE from 'three'
import {nativeAnimationFrame} from './NativeAnimation.ts'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
interface Config extends NativeSpriteSort {name:string;prefix?:string;animated?:boolean;loop?:boolean;anchor:{x:number;y:number};offset:{x:number;y:number}}
/** Registered ingress and armor sprites share the original render/tween clocks. */
export class ReinforcementSpecialRenderer {
 readonly sprites=new Map<string,AtlasSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private animations:Record<string,Animation>,private templates:Record<string,{render?:{sprites:Config[]}}>){}
 advance(session:GameSession){
  const live=new Set<string>()
  for(const m of session.reinforcementSpecial.models){
   if(m.kind!=='ingress'&&m.kind!=='armor')continue
   const entity=session.entities?.entity(m)
   if(!m.inserted||!entity||!session.entities?.registry.entities.get(entity.id))continue
   for(const [i,c]of (this.templates[m.key].render?.sprites??[]).entries()){
    const key=`${entity.id}:${i+1}`;live.add(key)
    let art=this.sprites.get(key);if(!art){art=this.atlas.create();this.scene.add(art.root);this.sprites.set(key,art)}
    let name=c.name
    if(c.animated){const a=this.animations[c.prefix?`${c.prefix}_${c.name}`:c.name],frame=nativeAnimationFrame(a.to-a.from+1,session.time-m.spriteAt,c.loop??true,30).frame;name=`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`}
    art.setFrame(name,c.anchor);art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.setOpacity(m.alpha/255);art.setOrder(...nativeSpriteOrder(c,m.pos,entity.id,i+1))
   }
  }
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
