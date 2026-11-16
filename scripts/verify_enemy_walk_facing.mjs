import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EnemyMelee} from '../src/game/EnemyMelee.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {DodgeSystem} from '../src/game/DodgeSystem.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/enemy-walk-facing-oracle.json'),levels=[1,2,3].map(i=>read(`public/data/level0${i}.json`));let frames=0
for(const row of rows){
 const l=levels[row.stage-1],path=new EnemyPath(l.paths.paths,l.navigation,row.initial.pi,row.initial.spi),e={name:row.name,born:0,hp:10000,path,template:structuredClone(templates[row.name])},c=new EnemyMelee(()=>.25,()=>[],new DodgeSystem(()=>.25,templates))
 path.ni=row.initial.ni;Object.assign(path.position,row.initial.pos)
 for(const [i,f]of row.frames.entries()){
  const time=(i+1)*(1/30);c.advance(e,time);path.advance(row.initial.speed*(1/30));c.walk(e)
  const ctx=`${row.stage}/${row.pi}/${row.spi}/${row.name}/${i+1}`,pose=e.visualOverride
  assert(Math.hypot(path.position.x-f.pos.x,path.position.y-f.pos.y)<1e-7,ctx+'/position');assert.equal(path.pi,f.pi,ctx+'/path');assert.equal(path.ni,f.ni,ctx+'/node');assert.equal(pose.name,f.name,ctx+'/native path-based facing');assert.equal(pose.facingLeft,!!f.flip,ctx+'/flip');assert.equal(pose.at,f.at,ctx+'/loop clock');assert.equal(c.states.get(e).quadrant,f.quadrant,ctx+'/angle hysteresis');frames++
 }
}
console.log(`${rows.length} original path walking traces / ${frames} frames: all first-three-stage paths/lanes, five enemy families, native node-based angle/hysteresis/flip and retained animation clock match`)
