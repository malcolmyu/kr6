import assert from 'node:assert/strict'
import * as THREE from 'three'
import {SpriteAtlas} from '../src/game/SpriteAtlas.ts'
const frame={size:[100,100],trim:[0,0,0,0],a_name:'art.png',a_size:[100,100],f_quad:[0,0,100,100],alias:[]},texture=new THREE.Texture(),atlas=new SpriteAtlas({glow:frame},{'art.png':texture}),before=atlas.create(),after=atlas.create()
before.setOpacity(.4);before.setFrame('glow',{x:.5,y:.5});after.setFrame('glow',{x:.5,y:.5});after.setOpacity(.4)
for(const sprite of [before,after]){const material=sprite.root.children[0].material;assert.equal(material.transparent,true,'sprite texture alpha must be respected even when opacity precedes its first frame');assert.equal(material.depthWrite,false);assert.equal(material.opacity,.4);assert.equal(material.map,texture)}
before.setOpacity(1);assert.equal(before.root.children[0].material.opacity,1);assert.equal(atlas.material('art.png').opacity,1,'per-sprite opacity must not mutate shared atlas material');before.dispose();after.dispose();atlas.dispose();texture.dispose()
console.log('Sprite opacity is independent of first-frame call order and preserves transparent texture alpha, depth-write and shared-material isolation')
