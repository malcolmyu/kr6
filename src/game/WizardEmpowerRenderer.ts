import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {AtlasSprite,SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {Point} from './types'
interface Template {render:{sprites:{z?:number;draw_order?:number;prefix?:string;name:string;exo?:boolean;offset:Point;scale?:Point;anchor:Point;loop:boolean}[]}}
export class WizardEmpowerRenderer {
 private sprites=new Map<number,ExoSprite|AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 private templates:Record<string,Template>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>,templates:Record<string,Template>){this.scene=scene;this.atlas=atlas;this.exos=exos;this.templates=templates}
 advance(session:GameSession){
  const live=new Set<number>(),system=session.wizardEmpower,time=session.time
  if(system.native){
   for(const m of system.runtime.models){
    const entity=session.entities?.entity(m)
    if(m.kind==='buff'||!m.inserted||!entity||!session.entities?.registry.entities.get(entity.id))continue
    const name=m.kind==='fx'?'mod_wizard_skill_b_fx':m.kind==='decal'?'decal_tower_wizard_skill_b':'decal_tower_wizard_empowerment_preview',config=this.templates[name].render.sprites[0]
    live.add(entity.id);let sprite=this.sprites.get(entity.id)
    if(!sprite){sprite=config.exo?new ExoSprite(this.atlas,this.exos[config.prefix!]):this.atlas.create();this.scene.add(sprite.root);this.sprites.set(entity.id,sprite)}
    const [order,native]=nativeSpriteOrder(config,m.pos,entity.id)
    sprite.root.position.set(m.pos.x+config.offset.x,m.pos.y+config.offset.y,2);sprite.root.scale.set(config.scale?.x??1,config.scale?.y??1,1);sprite.setOrder(order,native);sprite.setOpacity(m.alpha/255)
    if(sprite instanceof ExoSprite)sprite.animate(config.name,time-m.spriteAt,config.loop,this.exos[config.prefix!].fps);else sprite.setFrame(config.name,config.anchor)
   }
   for(const [id,sprite]of this.sprites)if(!live.has(id)){sprite.dispose();this.sprites.delete(id)}
   return
  }
  for(const v of system.visuals){
   if(v.started===undefined)continue
   const name=v.kind==='fx'?'mod_wizard_skill_b_fx':v.kind==='decal'?'decal_tower_wizard_skill_b':'decal_tower_wizard_empowerment_preview',config=this.templates[name].render.sprites[0]
   live.add(v.id);let sprite=this.sprites.get(v.id)
   if(!sprite){sprite=config.exo?new ExoSprite(this.atlas,this.exos[config.prefix!]):this.atlas.create();this.scene.add(sprite.root);this.sprites.set(v.id,sprite)}
   sprite.root.position.set(v.pos.x+config.offset.x,v.pos.y+config.offset.y,2);sprite.root.scale.set(config.scale?.x??1,config.scale?.y??1,1);sprite.setOrder(10000-v.pos.y+.015);sprite.setOpacity(system.alpha(v,time)/255)
   if(sprite instanceof ExoSprite)sprite.animate(config.name,time-v.spriteAt,config.loop);else sprite.setFrame(config.name,config.anchor)
  }
  for(const [id,sprite]of this.sprites)if(!live.has(id)){sprite.dispose();this.sprites.delete(id)}
 }
 dispose(){this.sprites.forEach(s=>s.dispose());this.sprites.clear()}
}
