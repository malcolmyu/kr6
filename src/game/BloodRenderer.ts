import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type * as THREE from 'three'
import type {AtlasSprite,SpriteAtlas,Animation} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import type {BloodDecal,DeathEffect} from './EnemyDeath'
import {nativeAnimationFrame} from './NativeAnimation.ts'
export class BloodRenderer {
 readonly sprites=new Map<BloodDecal,AtlasSprite>()
 readonly effectSprites=new Map<DeathEffect,AtlasSprite>()
 constructor(private scene:THREE.Scene,private atlas:SpriteAtlas,private animations:Record<string,Animation>,private templates:Record<string,{render:{sprites:{z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;prefix?:string;anchor:{x:number;y:number};offset:{x:number;y:number}}[]}}>){}
 advance(session:GameSession){
  const live=new Set<BloodDecal>()
  for(const b of session.enemyDeaths.blood){
   if(session.time<=b.at)continue
   const a=this.animations[`blood_pool_${b.color}`];if(!a)continue
   live.add(b);let art=this.sprites.get(b)
   if(!art){art=this.atlas.create();this.sprites.set(b,art);this.scene.add(art.root)}
   const frame=nativeAnimationFrame(a.to-a.from+1,session.time-b.at,true,30).frame
   art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,{x:.5,y:.5});art.root.position.set(b.pos.x,b.pos.y,1);art.setOrder(...nativeSpriteOrder({...this.templates.decal_blood_pool.render.sprites[0],z:b.z??3000,sort_y_offset:b.sort_y_offset??1},b.pos,session.entities?.entity(b)?.id??0));art.setOpacity(b.alpha/255)
  }
  for(const [b,art]of this.sprites)if(!live.has(b)){art.dispose();this.sprites.delete(b)}
  const liveEffects=new Set<DeathEffect>()
  for(const fx of session.enemyDeaths.effectModels){
   if(session.time<=fx.at)continue
   const entity=session.entities?.entity(fx);if(entity&&!session.entities!.registry.entities.get(entity.id))continue
   const cfg=this.templates[fx.name]?.render.sprites[0],a=cfg&&this.animations[`${cfg.prefix}_${fx.sprite}`];if(!a)continue
   liveEffects.add(fx);let art=this.effectSprites.get(fx);if(!art){art=this.atlas.create();this.effectSprites.set(fx,art);this.scene.add(art.root)}
   const frame=nativeAnimationFrame(a.to-a.from+1,session.time-fx.at,false,30).frame
   art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,cfg.anchor);art.root.position.set(fx.pos.x+cfg.offset.x,fx.pos.y+cfg.offset.y+(fx.offsetY??0),1);art.setOrder(...nativeSpriteOrder(cfg,fx.pos,entity?.id??0));art.setOpacity(fx.alpha/255)
  }
  for(const [fx,art]of this.effectSprites)if(!liveEffects.has(fx)){art.dispose();this.effectSprites.delete(fx)}
 }
 dispose(){for(const art of this.sprites.values())art.dispose();this.sprites.clear();for(const art of this.effectSprites.values())art.dispose();this.effectSprites.clear()}
}
