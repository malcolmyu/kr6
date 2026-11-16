import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as THREE from 'three'
import {SpriteAtlas} from '../src/game/SpriteAtlas.ts'
import {ExoSprite} from '../src/game/ExoSprite.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/opening.json'),transition=read('public/data/scene-transition.json'),oracle=read('analysis/ui-exo-draw-oracle.json'),textures=Object.fromEntries([...data.textures,...transition.textures].map(name=>[name,new THREE.Texture()])),atlas=new SpriteAtlas({...data.atlas,...transition.atlas},textures)
data.exos.loadingDef=transition.exo
let corners=0
for(const row of oracle){const actor=new ExoSprite(atlas,data.exos[row.name],.5);actor.animate(row.animation,(row.frame-1+1e-6)/30,false);actor.root.updateMatrixWorld(true)
 for(const [index,command] of row.commands.entries()){
  const mesh=actor.root.children[index].children[0].children[0],position=mesh.geometry.attributes.position,frame=atlas.frame(command.name),w=frame.f_quad[2],h=frame.f_quad[3],c=Math.cos(command.r),s=Math.sin(command.r)
  for(let vertex=0;vertex<4;vertex++){
   const dx=(vertex%2?w:0)-command.ox,dy=(vertex>=2?h:0)-command.oy,x=(dx+command.kx*dy)*command.sx,y=(dy+command.ky*dx)*command.sy,expected={x:command.x+c*x-s*y,y:command.y+s*x+c*y},actual=new THREE.Vector3().fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld)
   assert(Math.abs(actual.x-expected.x)<1e-6,`${row.name}/${row.animation}/${row.frame}/${index}/${vertex} x ${actual.x}/${expected.x}`);assert(Math.abs(-actual.y-expected.y)<1e-6,`${row.name}/${index}/${vertex} y ${-actual.y}/${expected.y}`);corners++
  }
 }
 actor.dispose()
}
atlas.dispose();Object.values(textures).forEach(t=>t.dispose())
console.log(`${corners} original GGExo quad corners match Three.js UI coordinates, half-resolution textures, part offsets, rotation and shear across splash/background/logo endpoints and every loading-door frame`)
