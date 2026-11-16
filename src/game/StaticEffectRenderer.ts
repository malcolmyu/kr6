import {nativeSpriteOrder} from './NativePainterOrder.ts'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type * as THREE from 'three'
import type {AtlasSprite,SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {StaticEffect} from './StaticEffects'
export class StaticEffectRenderer {
 readonly sprites=new Map<StaticEffect,(AtlasSprite|ExoSprite)[]>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>={}){this.scene=scene;this.atlas=atlas;this.exos=exos}
 advance(session:GameSession){
  const live=new Set<StaticEffect>()
  for(const m of session.staticEffects.models){
   if(session.time<=m.at)continue
   const entity=session.entities?.entity(m);if(entity&&!session.entities!.registry.entities.get(entity.id))continue
   live.add(m);let parts=this.sprites.get(m)
   if(!parts){parts=m.sprites.map(s=>{const art=s.exo?new ExoSprite(this.atlas,this.exos[s.prefix as string]):this.atlas.create();this.scene.add(art.root);return art});this.sprites.set(m,parts)}
   for(let i=0;i<parts.length;i++){
    const art=parts[i],s=m.sprites[i]
    art.setOpacity((s.alpha??255)/255);art.setOrder(...nativeSpriteOrder(s,m.pos,entity?.id??0,i+1))
    if(art instanceof ExoSprite)art.animate(s.name,session.time-(s.ts as number??m.at),s.loop as boolean??true,s.fps as number??30);else art.setFrame(s.name,s.anchor)
    art.root.visible=!(s.hidden_count||s.hidden);art.root.position.set(m.pos.x+s.offset.x,m.pos.y+s.offset.y,1);art.root.rotation.z=s.r??0
    art.root.scale.set((s.scale?.x??1)*(s.flip_x?-1:1),s.scale?.y??1,1);art.setOpacity((s.alpha??255)/255);art.setOrder(...nativeSpriteOrder(s,m.pos,entity?.id??0,i+1))
   }
  }
  for(const [model,parts]of this.sprites)if(!live.has(model)){parts.forEach(p=>p.dispose());this.sprites.delete(model)}
 }
 dispose(){for(const parts of this.sprites.values())parts.forEach(p=>p.dispose());this.sprites.clear()}
}
