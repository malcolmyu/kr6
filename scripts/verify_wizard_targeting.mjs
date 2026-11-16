import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
const firebook=process.argv.includes('--firebook'),offNode=process.argv.includes('--off-node')
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),sessions=[1,2,3].map(stage=>new GameSession(read(`public/data/level0${stage}.json`),read(`public/data/level0${stage}-campaign.json`),templates,()=>.5)),rows=read(offNode?(firebook?'analysis/wizard-firebook-off-node-oracle.json':'analysis/wizard-off-node-oracle.json'):(firebook?'analysis/wizard-firebook-targeting-oracle.json':'analysis/wizard-targeting-oracle.json'))
let nodeOnlyAccepted=0,currentOnlyRejected=0,rejectedForecasts=0,real=0,boundary=0;const runtimeCases=[]
for(const row of rows){
 const g=sessions[row.stage-1],site={id:'wizard-target-fixture',tower:`tower_wizard_lvl${row.rank}`,pos:row.pos},actors=row.actors.map(a=>{
  const template=structuredClone(templates.enemy_bandit),path=new EnemyPath(g.level.paths.paths,g.level.navigation,row.pi,row.spi)
  path.ni=a.ni;Object.assign(path.position,a.pos);path.direction={x:1,y:0};template.motion.max_speed=a.speed;template.vis.flags=a.flags;template.vis.bans=a.bans
  return {id:a.id,name:'enemy_bandit',hp:1000,template,path}
 })
 const expected=Array.isArray(row.targets)?row.targets:[],actual=g.combat.wizardTargets(site,actors,row.attackIndex??0).map(e=>e.id)
 assert.deepEqual(actual,expected,`${row.stage}/${row.rank}/${row.pi}/${row.spi}/${row.actors[0].ni}/${row.actors[0].speed}/${row.source}`)
 if(offNode){const t=templates[site.tower],origin={x:site.pos.x+t.tower.range_offset.x,y:site.pos.y+t.tower.range_offset.y},range=t.attacks.range,attack=t.attacks.list[row.attackIndex??0],inside=p=>(p.x-origin.x)**2+(p.y-origin.y)**2/(.7*.7)<=range*range
  for(const e of actors){const current=inside(e.path.position),node=inside(g.combat.predictTarget(e,0).pos)
   if(expected.includes(e.id)&&node&&!current)nodeOnlyAccepted++
   if(!expected.includes(e.id)&&current&&!node&&g.combat.targetValid(e)&&g.combat.predictTarget(e,attack.node_prediction).valid&&!(e.template.vis.bans&attack.vis_flags)&&!(e.template.vis.flags&attack.vis_bans))currentOnlyRejected++
  }
 }
 for(const e of actors)if(g.combat.targetValid(e)&&!g.combat.predictTarget(e,templates[site.tower].attacks.list[row.attackIndex??0].node_prediction).valid){rejectedForecasts++;assert(!actual.includes(e.id))}
 if(row.source==='nearest-holder'||row.source==='between-holder')real++;else boundary++
 if(!expected.length&&row.actors.some(a=>a.currentValid&&!a.futureValid&&a.inRange&&!(a.bans&2))){
  const previous=runtimeCases.findIndex(c=>!c.expected.length),candidate={row,actors,g,site,expected}
  if(previous<0)runtimeCases.push(candidate);else if(row.source==='nearest-holder'&&runtimeCases[previous].row.source!=='nearest-holder')runtimeCases[previous]=candidate
 }
 if(expected.length&&!runtimeCases.some(c=>c.expected.length))runtimeCases.push({row,actors,g,site,expected})
}
assert(rejectedForecasts>0)
if(offNode){assert(nodeOnlyAccepted>0);assert(currentOnlyRejected>0);console.log(`Off-node native range gates: ${nodeOnlyAccepted} accepted despite continuous position outside, ${currentOnlyRejected} rejected despite continuous position inside`)}
console.log(`${rows.length} original wizard FFE/filter acquisitions match: ${real} nearest original-holder origins, ${boundary} synthetic range boundaries, three maps/all paths/lanes/${offNode?'off-node':'at-node'} ${firebook?'rank4 firebook':'four basic ranks'} and zero/40/72 speeds; ${rejectedForecasts} current-valid/future-invalid actors are rejected`)

if(!firebook&&!offNode){
assert.equal(runtimeCases.length,2);assert.equal(runtimeCases.find(c=>!c.expected.length).row.source,'nearest-holder','actual firing regression uses an original stage3 holder near the lower-path exit')
for(const {row,actors,g,site,expected}of runtimeCases){
 const {RangedCombat}=await import('../src/game/RangedCombat.ts'),combat=new RangedCombat(templates,()=>.5,()=>{});combat.targetValid=g.combat.targetValid;combat.predictTarget=g.combat.predictTarget
 const launched=[];const shoot=combat.wizardTowers.onShoot;combat.wizardTowers.onShoot=(...args)=>{launched.push(args[3].id);shoot(...args)}
 for(let tick=1;tick<=70;tick++)combat.advance(tick*(1/30),[site],actors)
 if(expected.length){assert(launched.length>0);assert(launched.every(id=>expected.includes(id)))}else{assert.equal(launched.length,0);assert.equal(combat.projectiles.length,0)}
}
console.log('Actual wizard coroutine/bolt dispatch shoots eligible native candidates and retains its retry without launching at a current-in-range actor whose forecast node is invalid')

}
