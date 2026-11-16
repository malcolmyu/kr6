import type * as THREE from 'three'
import native from '../../public/data/rain-of-fire.json' with {type:'json'}
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {Point} from './types'
import {nativeAnimationFrame} from './NativeAnimation'
export class RainRenderer {
 private sprites=new Map<string,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 constructor(scene:THREE.Scene,atlas:SpriteAtlas){this.scene=scene;this.atlas=atlas}
 advance(session:GameSession){
  const live=new Set<string>(),areas=session.powers.rainAreas,time=session.time
  const draw=(key:string,name:string,age:number,pos:Point,order:number,scale:number,alpha:number,loop:boolean)=>{
   live.add(key);let art=this.sprites.get(key);if(!art){art=this.atlas.create();this.scene.add(art.root);this.sprites.set(key,art)}
   const animation=(native.animations as Record<string,Animation>)[name],frame=nativeAnimationFrame(animation.to-animation.from+1,age,loop,30).frame
   art.setFrame(`${animation.prefix}_${String(animation.from+frame).padStart(4,'0')}`,{x:.5,y:.5});art.root.position.set(pos.x,pos.y,2);art.root.scale.setScalar(scale);art.setOrder(order);art.setOpacity(alpha)
  }
  for(const [id,b]of areas.burns){const p=b.enemy.path.position,o=b.enemy.template.unit.mod_offset??{x:0,y:0};draw(`burn-${id}`,'rain_of_fire_burning_mod_loop',time-b.spriteAt,{x:p.x+o.x,y:p.y+o.y},11000-p.y,1,areas.alpha(b,time),true)}
  for(const s of areas.scorches)draw(`scorch-${s.id}`,'rain_of_fire_decal2_loop',time-s.spriteAt,s.pos,9998-s.pos.y,1.2,areas.scorchAlpha(s,time),true)
  for(const x of areas.explosions)draw(`extra-${x.id}`,'rain_of_fire_hit_explosion_hit',time-x.at,x.pos,11000-x.pos.y,1,1,false)
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){this.sprites.forEach(art=>art.dispose());this.sprites.clear()}
}
