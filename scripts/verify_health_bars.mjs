import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {HealthBarRenderer} from '../src/game/HealthBarRenderer.ts'
import {HealthBar} from '../src/game/HealthBar.ts'
import {worldSpriteOrder} from '../src/game/NativePainterOrder.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json')
let count=0
for(const row of read('analysis/health-bars-oracle.json')) {
 const config=structuredClone(templates[row.name].health_bar),bar=new HealthBar(config),scene=new THREE.Scene(),renderer=new HealthBarRenderer(scene),enemy={id:row.id,hp:100,template:{health:{hp_max:100},health_bar:config},path:{position:{x:100.75,y:200.25}}},session={time:0,enemies:[enemy],barracks:{soldiers:[]}}
 for(const sample of row.frames) {
  const f=bar.sample(sample.frame/30,sample.hp,100,{x:100.75,y:200.25},sample.hidden)
  assert(Math.abs(bar.alpha-sample.alpha)<1e-9);if(sample.fadeAt===undefined)assert.equal(bar.fadeAt,undefined);else assert(Math.abs(bar.fadeAt-sample.fadeAt)<1e-12)
  assert.equal(f.hidden,sample.bg.hidden)
  if(!f.hidden){assert.equal(f.x,sample.bg.pos.x+sample.bg.offset.x);assert.equal(f.y,sample.bg.pos.y+sample.bg.offset.y);assert.equal(f.width,sample.bg.scale.x);assert.equal(f.height,sample.bg.scale.y);assert(Math.abs(f.fillWidth-sample.fg.scale.x)<1e-9);assert(Math.abs(f.opacity-sample.bg.alpha/255)<1e-12)}
  config.hidden=sample.hidden;enemy.hp=sample.hp;session.time=sample.frame/30;renderer.advance(session)
  const rendered=renderer.bars.get(`enemy-${row.id}`)
  for(const kind of ['bg','fg'])if(!sample[kind].hidden){const mesh=rendered[kind],native=sample[kind];assert.equal(mesh.renderOrder,worldSpriteOrder(native.z,native.pos.y+(native.sort_y_offset??0)));assert.deepEqual(mesh.userData.nativePaint,{draw:native.draw_order,x:native.pos.x,y:native.pos.y+(native.sort_y_offset??0),z:native.z,key:`${row.id}:health:${kind==='bg'?1:2}`})}
  count++
 }
 renderer.dispose()
}
console.log(`${count} native health-bar render frames match: damage/heal fade, mid-fade reversal, hidden heroes, pixel alignment and widths`)

const scene=new THREE.Scene(),renderer=new HealthBarRenderer(scene),enemy={id:1,hp:40,template:structuredClone(templates.enemy_bandit),path:{position:{x:100.75,y:200.25}}},session={time:0,enemies:[enemy],barracks:{soldiers:[]}}
renderer.advance(session)
assert.equal(renderer.bars.get('enemy-1').bg.visible,false,'Full-health enemy stays invisible with original per-difficulty HP array')
enemy.hp=20;session.time=.1;renderer.advance(session);session.time=.3;renderer.advance(session)
const rendered=renderer.bars.get('enemy-1');assert(rendered.bg.visible);assert.equal(rendered.fg.scale.x,8);assert.equal(rendered.bg.scale.x,16);assert.equal(rendered.fg.position.x,96);assert.equal(rendered.fg.material.color.getHexString(),'00ba00')
enemy.hp=0;renderer.advance(session);assert.equal(scene.children.length,0);assert.equal(renderer.bars.size,0);renderer.dispose()
