import {nativeSpriteOrder} from './NativePainterOrder.ts'
import nativeData from '../../public/data/gerald-modifiers.json' with {type:'json'}
import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {NativeGeraldModifier} from './GeraldModifierRuntime'
import type {GeraldBuff} from './GeraldSkills'
import {geraldBuffPose} from './GeraldSkills'
export class GeraldSkillsRenderer {
 private sprites=new Map<string,ExoSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>){this.scene=scene;this.atlas=atlas;this.exos=exos}
 advance(session:GameSession){
  const system=session.heroes.geraldSkills,buffs=new Map<string,GeraldBuff|NativeGeraldModifier>([...system.buffs,...system.nativeModifiers.buffs])
  for(const [key,buff]of buffs){
   const shield=buff.kind==='skill_b',prefix=shield?'hero_gerald_shield_of_retribution_fxDef':'hero_gerald_inspire_courage_buff_decalDef'
   let art=this.sprites.get(key)
   if(!art){art=new ExoSprite(this.atlas,this.exos[prefix]);this.scene.add(art.root);this.sprites.set(key,art)}
   const native='phase'in buff,pose=native?{name:buff.name,age:session.time-buff.ts,opacity:buff.alpha/255,loop:buff.phase==='loop'||buff.phase==='fade'}:geraldBuffPose(buff,session.time),pos=native?buff.pos:buff.target.pos
   // The shield follows unit.mod_offset; courage is a decal at the feet.
   const offset=shield?buff.target.template.unit?.mod_offset:undefined
   art.root.position.set(pos.x+(offset?.x??0),pos.y+(offset?.y??0),2);if(native)art.setOrder(...nativeSpriteOrder(nativeData[`mod_gerald_${buff.kind}`].render.sprites[0],pos,session.entities?.entity(buff)?.id??0));else art.setOrder((shield?13000:5000)-pos.y)
   art.setOpacity(pose.opacity);art.animate(pose.name,pose.age,pose.loop,native?30:undefined)
  }
  for(const [key,art]of this.sprites)if(!buffs.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
