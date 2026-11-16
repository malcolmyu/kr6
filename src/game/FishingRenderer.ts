import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite.ts'
import type {ExoDefinition} from './ExoSprite'
import type {SpriteAtlas} from './SpriteAtlas'
import {fishingTemplates} from './Fishing.ts'
import type {FishingSystem} from './Fishing'

export class FishingRenderer {
 readonly sprites=new Map<string,ExoSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private definitions:Record<string,ExoDefinition>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,definitions:Record<string,ExoDefinition>){this.scene=scene;this.atlas=atlas;this.definitions=definitions}
 advance(system:FishingSystem,time:number){
  const live=new Set<string>()
  for(const s of system.visible(time)){
   live.add(s.key)
   const config=fishingTemplates[s.template as keyof typeof fishingTemplates].render.sprites[0]
   let art=this.sprites.get(s.key)
   if(!art){art=new ExoSprite(this.atlas,this.definitions[config.prefix]);this.scene.add(art.root);this.sprites.set(s.key,art)}
   art.root.visible=!s.hidden;art.root.position.set(s.pos.x+config.offset.x,s.pos.y+config.offset.y,1);art.root.scale.set(s.flip?-1:1,1,1)
   art.setOrder(config.z===3000?10000-s.pos.y:config.z<3000?config.z:20000+config.z)
   art.animate(s.name,time-s.ts,s.loop,30)
  }
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
