import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
import {NativeSpatialEntities} from '../src/game/NativeSpatialEntities.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/catapult-targeting-oracle.json'),templates=read('public/data/entities.json'),games=[1,2,3].map(i=>new GameSession(read(`public/data/level0${i}.json`),read(`public/data/level0${i}-campaign.json`),templates,()=>.5))
let queries=0,ties=0,forecast=0,changedFromStable=0
for(const r of rows){const g=games[r.stage-1],byId=new Map(),table=new LuaEntityTable(),grid=new NativeSpatialEntities(),targetGrid=grid.create('targets',-512/3,0,1024+1024/3,768)
 for(const a of r.actors){const template=structuredClone(templates.enemy_bandit),path=new EnemyPath(g.levelData.paths.paths,g.levelData.navigation,a.pi,a.spi);path.ni=a.ni;Object.assign(path.position,a.pos);template.motion.max_speed=a.speed;template.vis={flags:a.flags,bans:a.bans};byId.set(a.id,{id:a.id,name:'enemy_bandit',template,path,hp:a.hp,motionSpeed:{x:a.speed,y:0},pending_removal:a.pending})}
 for(const op of r.ops)if(op.op==='set')table.set(op.id,byId.get(op.id));else table.delete(op.id)
 for(const e of table.values())if(!e.pending_removal)grid.insert(targetGrid,e.path.position.x,e.path.position.y,e)
 let candidates;g.combat.enemyCandidates=(pool,at,radius)=>{const found=[];grid.filter(found,'targets',at.x,at.y,radius);candidates=found;return found}
 const site={id:'native-target-fixture',tower:`tower_catapult_lvl${r.rank}`,pos:r.pos},pool=[...table.values()]
 for(const q of r.queries){const result=g.combat.catapultTargets(site,pool,q.seconds,q.direction||undefined);assert.deepEqual(candidates.map(e=>e.id),q.candidates,'native SSO candidate table');assert.deepEqual(result.map(c=>c.enemy.id),q.targets,`${r.stage}/${r.rank}/${q.seconds}/${q.direction}`);assert.equal(result[0]?.enemy.id,q.first);if(q.pos){assert(Math.hypot(result[0].predicted.pos.x-q.pos.x,result[0].predicted.pos.y-q.pos.y)<1e-7)}
  const stable=[...result].sort((a,b)=>a.enemy.id-b.enemy.id).sort((a,b)=>a.enemy.path.remainingNodes-b.enemy.path.remainingNodes);if(result[0]?.enemy.id!==stable[0]?.enemy.id)changedFromStable++
  if(result.some((c,i)=>i&&c.enemy.path.remainingNodes===result[i-1].enemy.path.remainingNodes))ties++;if(q.seconds>0)forecast++;queries++
 }
}
assert(ties>0&&forecast>0&&changedFromStable>0);console.log(`${rows.length} original catapult SSO/FFE fixtures/${queries} queries: table deletion/order, all3maps/4ranks/current+forecast/4quadrants, equal-node unstable sorting and chosen aim points match; ${ties} ties/${changedFromStable} first targets differ from stable creation order`)
