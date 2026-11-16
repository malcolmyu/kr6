import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import {nativeAnimationFrame} from './NativeAnimation'
export class CatapultTarRenderer {
 private sprites=new Map<number,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private animation:Animation
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,animations:Record<string,Animation>){this.scene=scene;this.atlas=atlas;this.animation=animations.tower_catapult_projectiles_tarred_zone_decal_run}
 advance(session:GameSession){
  const live=new Set<number>()
  for(const a of session.combat.catapultTar.areas){
   live.add(a.id);let art=this.sprites.get(a.id)
   if(!art){art=this.atlas.create();this.sprites.set(a.id,art);this.scene.add(art.root)}
   const animation=this.animation,frame=nativeAnimationFrame(animation.to-animation.from+1,session.time-a.spriteAt,false,30).frame
   art.setFrame(`${animation.prefix}_${String(animation.from+frame).padStart(4,'0')}`,{x:.5,y:.5});art.root.position.set(a.pos.x,a.pos.y,2);art.setOrder(9998-a.pos.y);art.setOpacity(a.alpha/255)
  }
  for(const [id,art]of this.sprites)if(!live.has(id)){art.dispose();this.sprites.delete(id)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
