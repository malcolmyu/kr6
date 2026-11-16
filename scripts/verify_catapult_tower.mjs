import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {nativeAnimationFrame} from '../src/game/NativeAnimation.ts'
import {CatapultTowerSystem,catapultDirection} from '../src/game/CatapultTower.ts'
const read=path=>JSON.parse(readFileSync(path)),templates=read('public/data/entities.json'),rows=read('analysis/catapult-tower-oracle.json')
let frames=0
for(const row of rows){
 const sys=new CatapultTowerSystem(templates),site={id:'catapult',tower:`tower_catapult_lvl${row.level}`,pos:{x:500,y:350}},events=[],calls=[];let tick=0,time=row.birth*(1/30),input=row.frames[0]
 const target=(name,raw)=>({id:name,pos:raw.pos,predict:seconds=>({x:raw.pos.x+raw.speed.x*seconds,y:raw.pos.y+raw.speed.y*seconds})})
 let first={pos:{x:500+[[120,120],[120,-120],[-120,-120],[-120,120]][(row.scenario-1)%4][0],y:350+[[120,120],[120,-120],[-120,-120],[-120,120]][(row.scenario-1)%4][1]},speed:{x:0,y:0}},second={pos:{x:first.pos.x+10,y:first.pos.y-10},speed:{x:0,y:0}}
 const find=(_site,seconds,direction)=>{
  const t=templates[site.tower],origin={x:site.pos.x+t.tower.range_offset.x,y:site.pos.y+t.tower.range_offset.y},unavailable=row.scenario===5&&(tick<30||tick>=240&&tick<350)||row.scenario===6&&tick>=20&&tick<100
  const candidates=[target('first',first),...(row.scenario>=8?[target('second',second)]:[])]
  const e=candidates.find(e=>{const pos=e.predict(seconds);return !unavailable&&(direction===undefined||catapultDirection(origin,e.predict(1))===direction)&&(pos.x-origin.x)**2+((pos.y-origin.y)/.7)**2<=t.attacks.range**2})
  calls.push({at:time,pred:seconds,filter:direction!==undefined,...(e?{target:e.id}:{})});return e?{target:e,pos:e.predict(seconds)}:undefined
 }
 sys.onShoot=(_site,name,pos,to,factor,at)=>events.push({name,pos,to,factor,at});sys.insert(site,time,find)
 for(const expected of row.frames){
  tick++;time=(row.birth+tick)*(1/30);input=expected;first=input.first;second=input.second;site.towerBlocked=input.blocked;sys.advance(time,[site],find)
  const state=sys.states.get(site.id);assert(Math.abs(state.attackTs-expected.attackTs)<1e-10,`${row.level}/${row.birth}/${row.scenario} tick${tick} attack timestamp`)
  for(const [index,part]of state.parts.entries()){const native=expected.parts[index];assert.equal(part.name,native.name,`${row.level}/${row.birth}/${row.scenario} tick${tick} part${index} name`);assert(Math.abs(part.ts-native.ts)<1e-10,JSON.stringify({level:row.level,birth:row.birth,scenario:row.scenario,tick,index,actual:part,expected:native}));assert.equal(part.loop,native.loop);assert.equal(part.flip,native.flip);assert.equal(part.runs,native.runs,JSON.stringify({level:row.level,birth:row.birth,scenario:row.scenario,tick,index,actual:part,expected:native}))}
  frames++
 }
 assert.equal(events.length,row.events.length)
 for(const [i,e]of events.entries()){const expected=row.events[i];assert.equal(e.name,expected.name);assert(Math.abs(e.at-expected.at)<1e-10);assert.deepEqual(e.pos,expected.pos);assert.deepEqual(e.to,expected.to);assert.equal(e.factor,expected.factor)}
 assert.equal(calls.length,row.calls.length)
 for(const [i,c]of calls.entries()){const expected=row.calls[i];assert(Math.abs(c.at-expected.at)<1e-10);assert.equal(c.pred,expected.pred);assert.equal(c.filter,expected.filter);assert.equal(c.target,expected.target)}
}
console.log(`${frames} native catapult basic script frames: four levels, four directions, insert pose, native40FPS animation completion, strict retry/windup, moved/lost targets, same-quadrant reselection, blocking and reload/balls parts match`)

for(const sample of read('analysis/catapult-animation-oracle.json')){const actual=nativeAnimationFrame(sample.count,sample.elapsed,sample.loop,sample.fps);assert.equal(actual.frame+1,sample.index);assert.equal(actual.runs,sample.runs)}
console.log('Native animation_db.fni frame/runs boundaries at30/40FPS also match')
