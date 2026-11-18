import templates from '../../public/data/entities.json' with {type:'json'}
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder'
import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {Point} from './types'
import {nativeAnimationFrame} from './NativeAnimation'
export class CatapultTrapsRenderer {
 private sprites=new Map<string,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private animations:Record<string,Animation>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,animations:Record<string,Animation>){this.scene=scene;this.atlas=atlas;this.animations=animations}
 advance(session:GameSession){
  const live=new Set<string>(),draw=(key:string,name:string,age:number,loop:boolean,pos:Point,offset:Point,config:NativeSpriteSort&{anchor:Point},id:number,flip=false)=>{
   live.add(key);let art=this.sprites.get(key);if(!art){art=this.atlas.create();this.sprites.set(key,art);this.scene.add(art.root)}
   const a=this.animations[name],frame=nativeAnimationFrame(a.to-a.from+1,age,loop,30).frame
   art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,config.anchor,flip);art.root.position.set(pos.x+offset.x,pos.y+offset.y,2);art.setOrder(...nativeSpriteOrder(config,pos,id))
  }
  const trapConfig=templates.aura_catapult_skill_c_trap.render.sprites[0],stunConfig=templates.mod_catapult_skill_c_stun.render.sprites[0]
  for(const t of (session.entities?session.combat.nativeTraps.traps:session.combat.catapultTraps.traps))if(!t.hidden)draw(`trap-${t.id}`,`tower_catapult_projectiles_trap_${t.name}`,session.time-t.spriteAt,t.loop,t.pos,trapConfig.offset,trapConfig,session.entities?.entity(t)?.id??t.id)
  if(session.entities)for(const s of session.combat.nativeTraps.stuns.stuns){const e=s.enemy;if(e.teleportHidden)continue;const id=session.entities.entity(s)!.id;draw(`stun-${id}`,`stun_${(e.template.unit.size??1)>1?'big':'small'}_loop`,session.time-s.spriteTs,true,s.pos,s.offset,stunConfig,id,s.flip)}
  else for(const [id,s]of session.combat.catapultTraps.stuns){const e=s.enemy;if(e.teleportHidden)continue;draw(`stun-${id}`,`stun_${(e.template.unit.size??1)>1?'big':'small'}_loop`,session.time-s.spriteAt,true,e.path.position,e.template.unit.mod_offset??{x:0,y:0},stunConfig,id)}
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
