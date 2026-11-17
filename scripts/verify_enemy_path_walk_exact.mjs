import {readFileSync}from'node:fs'
import assert from'node:assert/strict'
import {EnemyPath}from'../src/game/EnemyPath.ts'
const {rows,speed}=JSON.parse(readFileSync('analysis/native-enemy-path-walk-exact.json'))
let oldDifferences=0
for(const r of rows){
 assert.equal(speed*(1/30),r.step);assert(r.distance>=2*r.step);assert.equal(r.result,false)
 const p=new EnemyPath([[[r.before,r.dest,r.dest]]],{starts:[1],ends:[3],connections:[null],defend:[null]},1,1)
 p.advance(r.step)
 assert.deepEqual(p.position,r.after,'exact original walk at'+r.tick);assert.equal(p.ni,1);assert.equal(p.finished,false)
 const dx=r.dest.x-r.before.x,dy=r.dest.y-r.before.y,length=Math.hypot(dx,dy),old={x:r.before.x+dx/length*r.step,y:r.before.y+dy/length*r.step}
 if(old.x!==r.after.x||old.y!==r.after.y)oldDifferences++
}
assert(oldDifferences>0,'oracle must expose the previous direct-normalization difference')
console.log({nativeSteps:rows.length,previousAlgorithmDifferences:oldDifferences,note:'Exact native outputs from identical inputs; existing navigation and whole-battle gates cover node changes and coupled state.'})
