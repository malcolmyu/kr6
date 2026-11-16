import type * as THREE from 'three'
import type {AtlasSprite,SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import {blockPopScale} from './DodgeSystem'
export class DodgeRenderer {
 private sprites=new Map<number,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 constructor(scene:THREE.Scene,atlas:SpriteAtlas){this.scene=scene;this.atlas=atlas}
 advance(session:GameSession){
  const live=new Set<number>()
  for(const p of session.barracks.dodges.pops){
   if(session.time<=p.at)continue // Native pop entities enter the render list on the following tick.
   live.add(p.id);let art=this.sprites.get(p.id)
   if(!art){art=this.atlas.create();art.setFrame(p.frame??'pop_0028',{x:.5,y:.5});this.scene.add(art.root);this.sprites.set(p.id,art)}
   art.root.position.set(p.pos.x,p.pos.y,3);art.root.rotation.z=p.rotation;art.root.scale.setScalar(blockPopScale(session.time-p.at));art.setOrder(15000-p.pos.y)
  }
  for(const [id,art]of this.sprites)if(!live.has(id)){art.dispose();this.sprites.delete(id)}
 }
 dispose(){for(const s of this.sprites.values())s.dispose();this.sprites.clear()}
}
