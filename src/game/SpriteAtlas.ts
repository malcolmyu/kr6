import * as THREE from 'three'
import type {NativePaintOrder} from './NativePainterOrder.ts'
import type { Point } from './types'

export interface AtlasFrame {
  size: [number, number]
  trim: [number, number, number, number]
  a_name: string
  a_size: [number, number]
  f_quad: [number, number, number, number]
  alias: string[]
}
export interface Animation { prefix: string; from: number; to: number }

/** Frames share one texture/material. Trimming must not move the logical anchor. */
export class SpriteAtlas {
  private frames = new Map<string, AtlasFrame>()
  private materials = new Map<string, THREE.MeshBasicMaterial>()
  constructor(frames: Record<string, AtlasFrame>, textures: Record<string, THREE.Texture>) {
    for (const [name,frame] of Object.entries(frames)) {
      this.frames.set(name,frame)
      for (const alias of frame.alias) this.frames.set(alias,frame)
    }
    for (const [name,map] of Object.entries(textures)) {
      map.colorSpace = THREE.SRGBColorSpace
      this.materials.set(name,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}))
    }
  }
  create(): AtlasSprite { return new AtlasSprite(this) }
  frame(name: string): AtlasFrame {
    const frame = this.frames.get(name)
    if (!frame) throw new Error(`Missing original sprite: ${name}`)
    return frame
  }
  material(name: string): THREE.MeshBasicMaterial {
    const material = this.materials.get(name)
    if (!material) throw new Error(`Missing original texture: ${name}`)
    return material
  }
  dispose() { for (const material of this.materials.values()) material.dispose() }
}

export class AtlasSprite {
  readonly root = new THREE.Group()
  private geometry = new THREE.PlaneGeometry(1,1)
  private mesh = new THREE.Mesh(this.geometry,new THREE.MeshBasicMaterial())
  private opacity=1
  private hasFrame=false
  private ownedMaterial?:THREE.MeshBasicMaterial
  private atlas:SpriteAtlas
  constructor(atlas: SpriteAtlas) { this.atlas=atlas;this.mesh.material.dispose();this.root.add(this.mesh) }
  setOrder(order:number,native?:NativePaintOrder){this.mesh.renderOrder=order;this.mesh.userData.nativePaint=native}
  setOpacity(alpha:number) {
    this.opacity=alpha
    // Clone the atlas material only after a frame exists; the empty mesh is opaque.
    if(!this.hasFrame)return
    if(!this.ownedMaterial){this.ownedMaterial=(this.mesh.material as THREE.MeshBasicMaterial).clone();this.mesh.material=this.ownedMaterial}
    this.ownedMaterial.opacity=alpha
  }
  setFrame(name: string, anchor: Point, flipped = false): void {
    const frame = this.atlas.frame(name)
    const [x,y,w,h] = frame.f_quad
    const [aw,ah] = frame.a_size
    const uv = this.geometry.attributes.uv
    const left = x/aw, right = (x+w)/aw, top = 1-y/ah, bottom = 1-(y+h)/ah
    uv.setXY(0,left,top); uv.setXY(1,right,top); uv.setXY(2,left,bottom); uv.setXY(3,right,bottom)
    uv.needsUpdate = true
    const base=this.atlas.material(frame.a_name)
    if(!this.ownedMaterial&&this.opacity!==1)this.ownedMaterial=base.clone()
    this.hasFrame=true
    if(this.ownedMaterial){this.ownedMaterial.map=base.map;this.ownedMaterial.opacity=this.opacity;this.mesh.material=this.ownedMaterial}
    else this.mesh.material=base
    const offsetX = (frame.trim[0]+w/2-frame.size[0]*anchor.x)/2
    const offsetY = (frame.size[1]*anchor.y-frame.trim[1]-h/2)/2
    this.mesh.position.set(flipped?-offsetX:offsetX,offsetY,0)
    this.mesh.scale.set((flipped?-w:w)/2,h/2,1)
  }
  animate(animation: Animation, elapsed: number, fps: number, anchor: Point, flipped=false): void {
    const count = animation.to-animation.from+1
    const frame = animation.from+Math.floor(Math.max(0,elapsed)*fps)%count
    this.setFrame(`${animation.prefix}_${String(frame).padStart(4,'0')}`,anchor,flipped)
  }
  dispose() { this.geometry.dispose();this.ownedMaterial?.dispose(); this.root.removeFromParent() }
}
