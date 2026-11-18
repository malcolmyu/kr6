import {nativeAnimationFrame} from './NativeAnimation.ts'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {NativeSpriteSort} from './NativePainterOrder'
import type {AtlasSprite,SpriteAtlas,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {MortarModel} from './BolinMortarRuntime'
import type {Point} from './types'
import type * as THREE from 'three'
interface Config extends NativeSpriteSort {prefix:string;name:string;animated:boolean;loop:boolean;exo?:boolean;anchor:Point;offset:Point;scale?:Point;r:number}
export class BolinMortarRenderer {
 readonly sprites=new Map<MortarModel,ExoSprite|AtlasSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private exos:Record<string,ExoDefinition>,private animations:Record<string,Animation>,private templates:Record<string,{render?:{sprites:Config[]}}> ){}
 advance(g:GameSession){
  const live=new Set<MortarModel>()
  for(const m of g.heroes.bolinMortar.models){
   if(m.kind==='area'||m.kind==='slow')continue
   const e=g.entities?.entity(m);if(!e||!g.entities?.registry.entities.get(e.id))continue
   const c=this.templates[m.name].render!.sprites[0];live.add(m);let art=this.sprites.get(m)
   if(!art){art=c.exo?new ExoSprite(this.atlas,this.exos[c.prefix]):this.atlas.create();this.sprites.set(m,art);this.scene.add(art.root)}
   const name=m.kind==='bullet'?(m.phase==='fly'?'flyspin':'explode'):m.animation,loop=m.kind==='bullet'?m.phase==='fly':m.loop
   art.root.position.set(m.pos.x+c.offset.x,m.pos.y+c.offset.y,2);art.root.scale.set(c.scale?.x??1,c.scale?.y??1,1);art.root.rotation.z=m.kind==='bullet'?m.rotation:c.r
   art.setOrder(...nativeSpriteOrder({...c,z:m.kind==='bullet'?m.z:c.z},m.pos,e.id));art.setOpacity(m.kind==='bullet'?1:m.alpha/255)
   if(art instanceof ExoSprite)art.animate(name,g.time-m.spriteAt,loop,30)
   else if(!c.animated)art.setFrame(c.name,c.anchor)
   else{const a=this.animations[`${c.prefix}_${name}`],frame=nativeAnimationFrame(a.to-a.from+1,g.time-m.spriteAt,loop,30).frame;art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,c.anchor)}
  }
  for(const [m,art]of this.sprites)if(!live.has(m)){art.dispose();this.sprites.delete(m)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear()}
}
