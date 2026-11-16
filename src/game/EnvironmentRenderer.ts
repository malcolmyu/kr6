import * as THREE from 'three'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {Animation,SpriteAtlas,AtlasSprite} from './SpriteAtlas'
import type {GameMode,LevelData,Point} from './types'
import type {AmbientCreatures,AmbientCreature} from './AmbientCreatures'
import {nativeSpritePhase} from './SpritePhase.ts'
interface DecalSprite {draw_order?:number;sort_y?:number;sort_y_offset?:number;name:string;prefix?:string;exo?:boolean;animated?:boolean;offset:Point;anchor:Point;z:number;hidden?:boolean;flip_x?:boolean;scale?:Point;alpha?:number;ts?:number;random_ts?:number;time_offset?:number;loop?:boolean}
interface DecalTemplate {render?:{sprites:DecalSprite[]};editor?:{game_mode?:number;alpha?:number;flip?:number}}
export class EnvironmentRenderer {
  private parts:{art:AtlasSprite|ExoSprite;config:DecalSprite;phase:number;model?:AmbientCreature}[]=[]
  private creatures?:AmbientCreatures
  private animations:Record<string,Animation>
  constructor(scene:THREE.Scene,atlas:SpriteAtlas,animations:Record<string,Animation>,exos:Record<string,ExoDefinition>,templates:Record<string,DecalTemplate>,level:LevelData,mode:GameMode,random=Math.random,creatures?:AmbientCreatures) {
    this.animations=animations;this.creatures=creatures
    const modeId=mode==='campaign'?1:3
    for(const [sourceIndex,entity]of level.data.entities_list.entries()) {
      if(!entity.template.startsWith('decal_') || entity.template==='decal_background')continue
      if(entity.template==='decal_stage_03_fish'||entity.template==='decal_stage_03_fisherman')continue
      const template=templates[entity.template]
      const filter=Number(entity['editor.game_mode']??template.editor?.game_mode??0)
      if(filter!==0 && filter!==modeId)continue
      for(const [index,original] of (template.render?.sprites??[]).entries()) {
        if(original.hidden)continue
        const config={...original,name:String(entity[`render.sprites[${index+1}].name`]??original.name),z:Number(entity[`render.sprites[${index+1}].z`]??original.z)}
        // scripts_game.decal_defend_point5.insert34470: the circle is static;
        // editor orientation is not a sprite rotation or animation selector.
        if(entity.template==='decal_defend_point5')config.alpha=Number(entity['editor.alpha']??template.editor?.alpha??10)*10
        const art=config.exo?new ExoSprite(atlas,exos[config.prefix!]):atlas.create()
        const pos=entity.pos??{x:0,y:0}
        art.root.position.set(pos.x+config.offset.x,pos.y+config.offset.y,1)
        const flip=entity.template==='decal_defend_point5'?Number(entity['editor.flip']??template.editor?.flip??0)>0:entity['editor.flip']===undefined?config.flip_x:Number(entity['editor.flip'])!==0
        art.root.scale.set((config.scale?.x??1)*(flip?-1:1),config.scale?.y??1,1)
        art.setOrder(...nativeSpriteOrder(config,pos,sourceIndex,index+1))
        if(art instanceof ExoSprite)art.animate(config.name,0)
        else if(config.prefix && config.animated)art.animate(animations[`${config.prefix}_${config.name}`],0,30,config.anchor)
        else art.setFrame(config.name,config.anchor)
        if(!(art instanceof ExoSprite))art.setOpacity((config.alpha??255)/255)
        scene.add(art.root)
        this.parts.push({art,config,phase:nativeSpritePhase(config,random),model:creatures?.models.find(m=>m.sourceIndex===sourceIndex)})
      }
    }
  }
  advance(time:number) {
    for(let i=this.parts.length-1;i>=0;i--){const p=this.parts[i];if(p.model&&this.creatures&&!this.creatures.models.includes(p.model)){p.art.dispose();this.parts.splice(i,1)}}
    for(const {art,config,phase,model} of this.parts) {
      if(model&&this.creatures){art.root.visible=this.creatures.models.includes(model);if(!art.root.visible)continue;if(art instanceof ExoSprite)art.animate(model.animation,time-model.at,model.loop,this.creatures.fps(model));continue}
      if(art instanceof ExoSprite)art.animate(config.name,time+phase)
      else if(config.animated && config.prefix)art.animate(this.animations[`${config.prefix}_${config.name}`],time+phase,30,config.anchor)
    }
  }
  dispose(){for(const part of this.parts)part.art.dispose();this.parts=[]}
}
