import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PathFollower } from '../src/game/PathFollower.ts'
for(let level=1;level<=3;level++) {
  const {paths} = JSON.parse(readFileSync(`public/data/level0${level}.json`))
  for(const lanes of paths.paths) for(const nodes of lanes) {
    const length = nodes.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-nodes[i].x,p.y-nodes[i].y),0)
    const a = new PathFollower(nodes), b = new PathFollower(nodes)
    a.advance(length*.63)
    for(let i=0;i<63;i++) b.advance(length*.01)
    assert(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)<1e-7)
    a.advance(length)
    assert(a.finished)
    assert.deepEqual(a.position,nodes.at(-1))
  }
}
console.log('All original lanes: frame-size-independent travel and exit verified')
