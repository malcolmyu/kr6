import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import {nativeAnimationFrame} from './NativeAnimation'
export class CatapultBombRenderer {
 private sprites=new Map<number,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private animations:Record<string,Animation>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,animations:Record<string,Animation>){this.scene=scene;this.atlas=atlas;this.animations=animations}
 advance(session:GameSession){
  const live=new Set<number>()
  for(const b of session.combat.catapultBombs.bombs){
   live.add(b.id);let art=this.sprites.get(b.id)
   if(!art){art=this.atlas.create();this.sprites.set(b.id,art);this.scene.add(art.root)}
   const a=this.animations[`tower_catapult_projectiles_pojectile_lvl4_explosive_fx_${b.name}`],frame=nativeAnimationFrame(a.to-a.from+1,session.time-b.spriteAt,b.loop,30).frame
   art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,{x:.5,y:.5});art.root.position.set(b.pos.x,b.pos.y,2);art.setOrder(9998-b.pos.y)
  }
  for(const [id,art]of this.sprites)if(!live.has(id)){art.dispose();this.sprites.delete(id)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
