import {nativeAnimationFrame} from './NativeAnimation.ts'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type * as THREE from 'three'
import type {AtlasSprite,SpriteAtlas,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {BolinModel} from './BolinNativeRuntime'
import type {Point} from './types'
interface Config extends NativeSpriteSort {prefix:string;name:string;loop:boolean;exo?:boolean;anchor:Point;offset:Point;alpha:number;r:number}
export class BolinRenderer {
 readonly sprites=new Map<BolinModel,ExoSprite|AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 private animations:Record<string,Animation>
 private templates:Record<string,{render:{sprites:Config[]}}>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>,animations:Record<string,Animation>,templates:Record<string,object>){this.scene=scene;this.atlas=atlas;this.exos=exos;this.animations=animations;this.templates=templates as typeof this.templates}
 advance(session:GameSession){
  const live=new Set<BolinModel>()
  for(const m of session.heroes.bolinRuntime.models){
   if(m.kind!=='hit'&&m.kind!=='casing'&&!(m.kind==='bullet'&&this.templates[m.name].render))continue
   const e=session.entities?.entity(m);if(!e||!session.entities?.registry.entities.get(e.id))continue
   const c=this.templates[m.name].render.sprites[0];live.add(m);let art=this.sprites.get(m)
   if(!art){art=c.exo?new ExoSprite(this.atlas,this.exos[c.prefix]):this.atlas.create();this.sprites.set(m,art);this.scene.add(art.root)}
   const name=m.kind==='casing'?m.animation:c.name,at=m.kind==='casing'?m.spriteAt:m.kind==='bullet'?m.ray?.at??0:m.at,loop=m.kind==='casing'?m.animation==='spin':c.loop
   art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.root.rotation.z=m.kind==='bullet'?m.ray?.rotation??c.r:m.rotation;art.root.visible=m.kind!=='bullet'||!m.ray?.hidden;art.root.scale.set(m.kind==='bullet'?m.ray?.scale.x??1:1,m.kind==='bullet'?m.ray?.scale.y??1:1,1);art.setOrder(...nativeSpriteOrder({...c,z:m.kind==='casing'?m.z:c.z},m.pos,e.id));art.setOpacity((m.kind==='casing'?m.alpha:c.alpha)/255)
   if(art instanceof ExoSprite)art.animate(name,session.time-at,loop,30)
   else{const a=this.animations[`${c.prefix}_${name}`],frame=nativeAnimationFrame(a.to-a.from+1,session.time-at,loop,30).frame;art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,c.anchor)}
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
