import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {SpriteAtlas} from '../src/game/SpriteAtlas.ts'
import {ExoSprite} from '../src/game/ExoSprite.ts'
const data=JSON.parse(readFileSync('public/data/level01-art.json')),textures={}
for(const name of data.textures)textures[name]=new THREE.Texture()
const atlas=new SpriteAtlas(data.atlas,textures),sprite=atlas.create()
// Original animation ranges start at 1. Tiny negative dispatch skew must not
// look up tutorial_hand_0000 and halt the render loop at tutorial entry.
assert.doesNotThrow(()=>sprite.animate(data.animations.stage1_tutorial_hand_indicator,-1e-13,30,{x:.5,y:.5}))
const exo=new ExoSprite(atlas,data.exos.stage01_dude1Def)
assert.doesNotThrow(()=>exo.animate('run',-1e-13))
exo.dispose();sprite.dispose();atlas.dispose();Object.values(textures).forEach(t=>t.dispose())
console.log('Original atlas and EXO animation first frames tolerate sub-frame negative dispatch skew')
