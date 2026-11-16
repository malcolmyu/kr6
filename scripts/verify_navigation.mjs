import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemyPath} from '../src/game/EnemyPath.ts'
const traces=JSON.parse(readFileSync('analysis/navigation-oracle.json'))
let count=0
for(const trace of traces) {
 const level=JSON.parse(readFileSync(`public/data/level0${trace.stage}.json`))
 const path=new EnemyPath(level.paths.paths,level.navigation,trace.pi,trace.spi)
 for(const [index,expected] of trace.frames.entries()) {
  path.advance(trace.speed/30)
  assert(Math.hypot(path.position.x-expected.pos.x,path.position.y-expected.pos.y)<1e-6,`Stage ${trace.stage} path ${trace.pi} frame ${index}: position mismatch`)
  assert.equal(path.pi,expected.pi);assert.equal(path.ni,expected.ni);assert.equal(path.finished,expected.done)
  count++
 }
}
console.log(`${count} original navigation frames match, including third-stage path connection and goal cursor`)
