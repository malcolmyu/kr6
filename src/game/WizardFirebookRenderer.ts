import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {NativeSpriteSort} from './NativePainterOrder.ts'
import {nativeTrailParticleOrder} from './FirebookTrail.ts'
import type * as THREE from 'three'
import type {SpriteAtlas,AtlasSprite,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
export class WizardFirebookRenderer {
 private sprites=new Map<number,AtlasSprite>()
 private trailSprites=new Map<number|string,AtlasSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private animations:Record<string,Animation>,private burnConfig:NativeSpriteSort={draw_order:2}){}
 advance(session:GameSession){
  const live=new Set<number>()
  for(const b of session.combat.firebook.burns){
   const e=b.enemy,p='pos'in b?b.pos as {x:number;y:number}:e.path.position,o=e.template.unit.mod_offset??{x:0,y:0},size=e.template.unit.size??1
   live.add(b.id);let art=this.sprites.get(b.id)
   if(!art){art=this.atlas.create();this.sprites.set(b.id,art);this.scene.add(art.root)}
   art.root.visible=!e.teleportHidden
   art.animate(this.animations[`fire_${['small','medium','large'][size-1]}`],session.time-b.spriteAt,30,{x:.5,y:.5})
   art.root.position.set(p.x+o.x,p.y+o.y,2);if(session.entities?.entity(b))art.setOrder(...nativeSpriteOrder({...this.burnConfig,z:e.template.render.sprites[0].z??3000},p,session.entities.entity(b)!.id));else art.setOrder(10000-p.y+.002)
  }
  for(const [id,art]of this.sprites)if(!live.has(id)){art.dispose();this.sprites.delete(id)}
  const particles=new Set<number|string>()
  for(const [family,trails]of [['tower',session.combat.firebookTrails.trails],['hero',session.heroes.ranged.trails.trails],['rain',session.powers.rainTrails.trails],['bolin',session.heroes.bolinRuntime.trails.trails],['mortar',session.heroes.bolinMortar.trails.trails]] as const)for(const trail of trails)for(const p of trail.particles){
   const key=family==='tower'?p.id:`${family}:${p.id}`;particles.add(key);let art=this.trailSprites.get(key)
   if(!art){art=this.atlas.create();this.trailSprites.set(key,art);this.scene.add(art.root)}
   art.setFrame(p.frame,{x:.5,y:.5});art.root.position.set(p.pos.x,p.pos.y,2);art.root.rotation.z=p.rotation
   art.root.scale.set(p.scale.x,p.scale.y,1);art.setOpacity(p.alpha/255)
   art.setOrder(...nativeTrailParticleOrder(trail,p,session.entities?.entity(trail)?.id??0))
  }
  for(const [id,art]of this.trailSprites)if(!particles.has(id)){art.dispose();this.trailSprites.delete(id)}
 }
 dispose(){for(const s of [...this.sprites.values(),...this.trailSprites.values()])s.dispose();this.sprites.clear();this.trailSprites.clear()}
}
