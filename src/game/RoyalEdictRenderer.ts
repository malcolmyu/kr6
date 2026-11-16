import {nativeSpriteOrder} from './NativePainterOrder.ts'
import nativeData from '../../public/data/royal-edict.json' with {type:'json'}
import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {Point} from './types'
import type {NativeRoyalBuff} from './RoyalRuntime'
import {royalActorPose} from './RoyalEdictPose'
export class RoyalEdictRenderer {
 private sprites=new Map<string,ExoSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>){this.scene=scene;this.atlas=atlas;this.exos=exos}
 advance(session:GameSession){
  const live=new Set<string>(),royal=session.powers.royal,time=session.time
  const draw=(key:string,prefix:string,name:string,age:number,pos:Point,order:number,scale=1,opacity=1,loop=true,nativeFps?:number)=>{
   live.add(key);let art=this.sprites.get(key)
   if(!art){art=new ExoSprite(this.atlas,this.exos[prefix]);this.scene.add(art.root);this.sprites.set(key,art)}
   art.setOrder(order);art.root.position.set(pos.x,pos.y,2);art.root.scale.setScalar(scale);art.setOpacity(opacity);art.animate(name,age,loop,nativeFps);return art
  }
  for(const cast of royal.casts){
   if(cast.native)continue
   const age=time-cast.at,pose=royalActorPose(age)
   if(!pose.done){draw(`king-${cast.id}`,'royal_edictDef',pose.name,pose.elapsed,cast.pos,11000-cast.pos.y,1,1,pose.loop);draw(`rug-${cast.id}`,'royal_edict_underDef',pose.name,pose.elapsed,cast.pos,5000-cast.pos.y,1,1,pose.loop)}
   if(age<2.5){const opacity=age<1?Math.max(0,age):age<1.5?1:Math.max(0,2.5-age);draw(`area-${cast.id}`,'royal_edict_decalDef','loop',age,cast.pos,4000,1,opacity)}
  }
  for(const a of royal.runtime.actors)if(a.inserted){
   const config=nativeData.templates[a.template as 'decal_power_royal_edict_king'].render.sprites[0]
   const art=draw(`native-${a.template}-${a.created}-${a.pos.x}-${a.pos.y}`,config.prefix,a.name,time-a.ts,a.pos,0,1,a.alpha/255,a.loop,30)
   art.setOrder(...nativeSpriteOrder(config,a.pos,session.entities?.entity(a)?.id??0))
  }
  for(const [id,buff] of royal.buffs){
   if('kind' in buff){const b=buff as NativeRoyalBuff,config=nativeData.templates.mod_power_royal_edict_towerbuff.render.sprites[0],art=draw(`buff-${id}`,config.prefix,b.name,time-b.ts,{x:b.pos.x+config.offset.x,y:b.pos.y+config.offset.y},0,.95,b.alpha/255,b.loop,30);art.setOrder(...nativeSpriteOrder(config,b.pos,session.entities?.entity(b)?.id??0));continue}
   const age=time-buff.born,name=time+1e-9<buff.loopAt?'start':'loop',opacity=Math.min(1,Math.max(0,buff.expiresAt-time))
   draw(`buff-${id}`,'royal_edict_towerbuffDef',name,age,{x:buff.site.pos.x,y:buff.site.pos.y+11},10500-buff.site.pos.y,.95,opacity,name==='loop')
  }
  for(const [key,art]of this.sprites)if(!live.has(key)){art.dispose();this.sprites.delete(key)}
 }
 dispose(){this.sprites.forEach(art=>art.dispose());this.sprites.clear()}
}
