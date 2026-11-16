import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {WorldCamera} from '../src/game/WorldCamera.ts'
const cases=JSON.parse(readFileSync('analysis/camera-oracle.json'))
const camera=new WorldCamera()
for(const c of cases) {
 const actual=new WorldCamera(c.width??1400).clamp(c.input)
 for(const key of ['x','y','zoom'])assert(Math.abs(actual[key]-c.expected[key])<1e-8,`${key} clamp mismatch`)
}
camera.request({pos:{x:700,y:350},zoom:1.75,duration:2,at:0})
camera.advance(1)
const middle={...camera.pose}
camera.advance(2)
assert.equal(camera.pose.zoom,1.75)
assert(Math.abs(middle.zoom-(camera.minZoom+1.75)/2)<1e-8)
assert(Math.abs(middle.x-(512+camera.pose.x)/2)<1e-8)
console.log(`${cases.length} original camera clamp cases and in-out-quad tween midpoint verified`)
