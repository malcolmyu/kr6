import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/hero-ranged-targeting-oracle.json'),templates=read('public/data/entities.json'),games=[1,2,3].map(stage=>new GameSession(read(`public/data/level0${stage}.json`),read(`public/data/level0${stage}-campaign.json`),templates,()=>.25))
let flyingInsideMin=0,forecastOnly=0
for(const row of rows){
 const g=games[row.stage-1],hero={pos:row.heroPos},attack=templates.hero_zefira.ranged.attacks[0],actors=row.actors.map(a=>{const path=new EnemyPath(g.levelData.paths.paths,g.levelData.navigation,row.pi,row.spi);path.ni=a.ni;Object.assign(path.position,a.pos);path.direction={x:1,y:0};const template=structuredClone(templates.enemy_bandit);template.motion.max_speed=a.speed;template.vis={flags:a.flags,bans:a.bans};return{id:a.id,hp:1000,template,path}})
 const result=g.heroes.ranged.acquire(hero,attack,actors),context=`stage${row.stage}/${row.pi}/${row.spi}/${row.source}/flying${row.flying}/${row.actors[0].ni}/${row.actors[0].speed}`
 assert.equal(result?.target.id,row.target,context+'/target');assert.equal(!!result,row.ready,context+'/ready target')
 if(result){assert(Math.hypot(result.position.pos.x-row.predicted.x,result.position.pos.y-row.predicted.y)<1e-9,context+'/forecast position');const distance=p=>(p.x-hero.pos.x)**2+((p.y-hero.pos.y)/.7)**2;if(row.flying&&distance(result.position.pos)<attack.min_range**2)flyingInsideMin++;if(distance(result.target.path.position)>attack.max_range**2)forecastOnly++}
}
assert(flyingInsideMin>0);assert(forecastOnly>0)
console.log(`${rows.length} original SU ranged FFE target selections match three maps/all paths/lanes, half-node positions, actual hero spawn/min/max ellipse boundaries, future validity and ground/flying min-range override; ${flyingInsideMin} flying targets inside minimum and ${forecastOnly} forecast-only acquisitions`)
