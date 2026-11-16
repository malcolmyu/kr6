import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as THREE from 'three'
import {nativePainterSort,worldSpriteOrder,nativeSpriteOrder} from '../src/game/NativePainterOrder.ts'
import {SpriteAtlas} from '../src/game/SpriteAtlas.ts'
import {ExoSprite} from '../src/game/ExoSprite.ts'
const rows=JSON.parse(readFileSync('analysis/native-painter-order-oracle.json'))
for(const row of rows){
 const frames=row.input.map((f,id)=>({key:f.key,id,z:0,groupOrder:0,renderOrder:worldSpriteOrder(f.z,f.sort_y??f.pos.y+(f.sort_y_offset??0)),object:{id,userData:{nativePaint:{draw:f.draw_order,x:f.pos.x,y:f.sort_y??f.pos.y+(f.sort_y_offset??0)}}}}))
 assert.deepEqual(frames.sort(nativePainterSort).map(f=>f.key),row.order,row.name)
}
const actual=JSON.parse(readFileSync('analysis/video-opening-native-render-order.json'))
assert.deepEqual(actual.missing,[]);assert.deepEqual(actual.missingAnimations,[])
for(const sample of actual.samples){
 const items=sample.frames.map((f,id)=>({key:`${f.entity}/${f.kind}/${f.part}`,id,z:0,groupOrder:0,renderOrder:worldSpriteOrder(f.z,f.sortY??f.pos.y+(f.sortYOffset??0)),object:{id,userData:{nativePaint:{draw:f.draw,x:f.pos.x,y:f.sortY??f.pos.y+(f.sortYOffset??0)}}}}))
 const expected=items.map(f=>f.key)
 assert.deepEqual(items.reverse().sort(nativePainterSort).map(f=>f.key),expected,`actual native opening tick${sample.tick}`)
}
// Real EXO geometry must remain contiguous at the body's native frame key,
// including a setOrder after animation (the soldier update order).
const frame={size:[10,10],trim:[0,0,0,0],a_name:'t',a_size:[10,10],f_quad:[0,0,10,10],alias:[]},texture=new THREE.Texture(),atlas=new SpriteAtlas({a:frame},{t:texture}),exo=new ExoSprite(atlas,{fps:30,partScaleCompensation:2,parts:[['a',0,0]],animations:[{name:'idle',frames:[[[1,1,1,0,0,1,1,0,0,0],[1,1,1,0,0,1,1,0,0,0]]]}]})
exo.animate('idle',0);exo.setOrder(9800,{draw:100090,x:100})
const meshes=[];exo.root.traverse(o=>{if(o.isMesh)meshes.push(o)})
assert.equal(meshes.length,2);assert.deepEqual(meshes.map(m=>m.renderOrder),[9800,9800]);assert.deepEqual(meshes.map(m=>m.userData.nativePaint.part),[0,1]);assert.equal(meshes[0].userData.nativePaint.group,meshes[1].userData.nativePaint.group)
const items=meshes.map((object,id)=>({id,object,z:0,groupOrder:0,renderOrder:object.renderOrder})),bar={id:999,object:{id:999,userData:{nativePaint:{draw:200092,x:100}}},z:0,groupOrder:0,renderOrder:9800}
assert.deepEqual([bar,...items.reverse()].sort(nativePainterSort).map(i=>i.object.userData.nativePaint.part??'bar'),[0,1,'bar'])
// Near-equal Y must outrank draw/EXO part keys, with no epsilon leaking across frames.
bar.renderOrder=9800.00001;assert.equal([bar,...items].sort(nativePainterSort).at(-1),bar)
// Mixed legacy/native entries still form a total comparator order.
const legacy=[1,2,3].map((id)=>({id:1000+id,object:{id:1000+id,userData:{}},z:id%2,groupOrder:0,renderOrder:9800})),all=[...items,bar,...legacy]
for(const a of all)for(const b of all)for(const c of all)if(nativePainterSort(a,b)<=0&&nativePainterSort(b,c)<=0)assert(nativePainterSort(a,c)<=0)
exo.dispose();atlas.dispose();texture.dispose()
console.log('Original render-update frame ordering matches 3 controlled and 4 actual opening layer/Y/draw/X cases; EXO parts stay contiguous before bars, post-animation order updates work, near-Y and mixed legacy comparator transitivity checked')

const mixed=JSON.parse(readFileSync('analysis/native-scene-paint-video-continued.json'))
let sceneFrames=0
for(const sample of mixed.samples){const items=sample.frames.map((f,id)=>({id,z:0,groupOrder:0,renderOrder:worldSpriteOrder(f.z,f.y),object:{id,userData:{nativePaint:{draw:f.draw,x:f.x,y:f.y}}},key:f.key}));const expected=items.map(i=>i.key);assert.deepEqual(items.reverse().sort(nativePainterSort).map(i=>i.key),expected,`mixed native scene tick${sample.tick}`);sceneFrames+=items.length}
assert.deepEqual(nativeSpriteOrder({z:3400,sort_y_offset:3,pos:{x:12,y:45}},{x:999,y:999},104,2),[23400,{z:3400,y:48,x:12,draw:200104,key:'104:sprite:2'}])
console.log(`${mixed.samples.length} actual mixed-battle scene queues/${sceneFrames} native frames match layer/Y/draw/X ordering, including non-object layers and sprite position override`)

for(const scenario of ['video-continued','survivor']){
 const scene=JSON.parse(readFileSync(`analysis/native-scene-paint-${scenario}-particles.json`));let frames=0,particles=0
 for(const sample of scene.samples){const items=sample.frames.map((f,id)=>({id,z:0,groupOrder:0,renderOrder:worldSpriteOrder(f.z,f.y),object:{id,userData:{nativePaint:{draw:f.draw,x:f.x,y:f.y}}},key:f.key}));assert.deepEqual([...items].reverse().sort(nativePainterSort).map(i=>i.key),items.map(i=>i.key),`native particles ${scenario}/${sample.tick}`);frames+=items.length;particles+=items.filter(i=>i.key.includes(':particle:')).length}
 console.log(`${scenario}: ${scene.samples.length} actual scene queues/${frames} frames including${particles} particles preserve original order`)
}
