import * as THREE from 'three'
import type {NativePaintOrder} from './NativePainterOrder.ts'
import { SpriteAtlas } from './SpriteAtlas.ts'
import type { AtlasSprite } from './SpriteAtlas'
import {nativeAnimationFrame} from './NativeAnimation.ts'
export interface ExoDefinition {
  fps:number;partScaleCompensation:number;parts:[string,number,number][]
  animations:{name:string;frames:number[][][]}[]
}
/** EXO v3 frames: type, part, alpha, x, y, sx, sy, rotation, kx, ky.
 * Flash's y-down transforms are converted to Three's y-up coordinates.
 */
export class ExoSprite {
  readonly root=new THREE.Group()
  private slots:{transform:THREE.Group;sprite:AtlasSprite}[]=[]
  private opacity=1
  setOpacity(alpha:number){this.opacity=alpha}
  private order=0
  private nativeOrder?:NativePaintOrder
  setOrder(order:number,native?:NativePaintOrder){this.order=order;this.nativeOrder=native;this.slots.forEach((slot,index)=>this.orderSlot(slot.sprite,index))}
  private orderSlot(sprite:AtlasSprite,index:number){sprite.setOrder(this.order+(this.nativeOrder?0:index/10000),this.nativeOrder?{...this.nativeOrder,group:this.root.id,part:index}:undefined)}
  duration(name:string){const animation=this.definition.animations.find(a=>a.name===name);if(!animation)throw new Error(`Missing EXO animation ${name}`);return animation.frames.length/this.definition.fps}
  private atlas:SpriteAtlas
  private textureFactor:number
  private definition:ExoDefinition
  constructor(atlas:SpriteAtlas,definition:ExoDefinition,textureFactor=1) {this.atlas=atlas;this.definition=definition;this.textureFactor=textureFactor}
  animate(name:string,elapsed:number,loop=true,fps?:number) {
    const animation=this.definition.animations.find(a=>a.name===name)
    if(!animation)throw new Error(`Missing EXO animation ${name}`)
    const index=fps===undefined?(loop?Math.floor(Math.max(0,elapsed)*this.definition.fps)%animation.frames.length:Math.min(animation.frames.length-1,Math.floor(Math.max(0,elapsed)*this.definition.fps))):nativeAnimationFrame(animation.frames.length,elapsed,loop,fps).frame
    const frame=animation.frames[index]
    for(let index=0;index<frame.length;index++) {
      const [type,partIndex,alpha,x,y,sx,sy,r,kx,ky]=frame[index]
      if(type!==1)throw new Error(`Unsupported EXO part type ${type}`)
      let slot=this.slots[index]
      if(!slot) {
        const transform=new THREE.Group(),sprite=this.atlas.create()
        transform.add(sprite.root);this.root.add(transform);slot={transform,sprite};this.slots.push(slot)
      }
      slot.transform.visible=alpha>0
      const part=this.definition.parts[partIndex-1]
      slot.sprite.setFrame(part[0],{x:.5,y:.5})
      slot.sprite.setOpacity(alpha*this.opacity)
      this.orderSlot(slot.sprite,index)
      const compensation=this.definition.partScaleCompensation
      slot.sprite.root.scale.setScalar(2/compensation*this.textureFactor)
      slot.sprite.root.position.set(part[1],-part[2],0)
      const shear=new THREE.Matrix4().set(1,-kx,0,0,-ky,1,0,0,0,0,1,0,0,0,0,1)
      slot.transform.matrixAutoUpdate=false
      slot.transform.matrix.makeTranslation(x,-y,0)
        .multiply(new THREE.Matrix4().makeRotationZ(-r))
        .multiply(new THREE.Matrix4().makeScale(sx,sy,1)).multiply(shear)
      slot.transform.renderOrder=index
    }
    for(let i=frame.length;i<this.slots.length;i++)this.slots[i].transform.visible=false
  }
  dispose(){this.slots.forEach(s=>s.sprite.dispose());this.root.removeFromParent()}
}
