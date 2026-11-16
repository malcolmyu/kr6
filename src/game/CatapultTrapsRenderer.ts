import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import {nativeAnimationFrame} from './NativeAnimation'
export class CatapultTrapsRenderer {
 private sprites=new Map<string,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private animations:Record<string,Animation>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,animations:Record<string,Animation>){this.scene=scene;this.atlas=atlas;this.animations=animations}
 advance(session:GameSession){
  const live=new Set<string>(),draw=(key:string,name:string,age:number,loop:boolean,x:number,y:number,order:number)=>{
   live.add(key);let art=this.sprites.get(key);if(!art){art=this.atlas.create();this.sprites.set(key,art);this.scene.add(art.root)}
   const a=this.animations[name],frame=nativeAnimationFrame(a.to-a.from+1,age,loop,30).frame
   art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,{x:.5,y:.5});art.root.position.set(x,y,2);art.setOrder(order)
  }
  for(const t of session.combat.catapultTraps.traps)if(!t.hidden)draw(`trap-${t.id}`,`tower_catapult_projectiles_trap_${t.name}`,session.time-t.spriteAt,t.loop,t.pos.x,t.pos.y,10000-t.pos.y)
  for(const [id,s]of session.combat.catapultTraps.stuns){const e=s.enemy;if(e.teleportHidden)continue;const p=e.path.position,o=e.template.unit.mod_offset??{x:0,y:0};draw(`stun-${id}`,`stun_${(e.template.unit.size??1)>1?'big':'small'}_loop`,session.time-s.spriteAt,true,p.x+o.x,p.y+o.y,13020-p.y)}
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
