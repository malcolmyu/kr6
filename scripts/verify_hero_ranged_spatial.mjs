import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
import {LuaEntityTable} from '../src/game/LuaEntityTable.ts'
import {NativeSpatialEntities} from '../src/game/NativeSpatialEntities.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/hero-ranged-spatial-oracle.json'),templates=read('public/data/entities.json'),games=[1,2,3].map(i=>new GameSession(read(`public/data/level0${i}.json`),read(`public/data/level0${i}-campaign.json`),templates,()=>.5))
let ties=0,changed=0,selected=0
for(const r of rows){const g=games[r.stage-1],byId=new Map(),table=new LuaEntityTable(),grid=new NativeSpatialEntities(),targetGrid=grid.create('targets',-512/3,0,1024+1024/3,768)
 for(const a of r.actors){const template=structuredClone(templates.enemy_bandit),path=new EnemyPath(g.levelData.paths.paths,g.levelData.navigation,a.pi,a.spi);path.ni=a.ni;Object.assign(path.position,a.pos);template.motion.max_speed=a.speed;template.vis={flags:a.flags,bans:a.bans};byId.set(a.id,{id:a.id,name:'enemy_bandit',template,path,hp:a.hp,motionSpeed:{x:a.speed,y:0},pending_removal:a.pending})}
 for(const op of r.ops)if(op.op==='set')table.set(op.id,byId.get(op.id));else table.delete(op.id)
 for(const e of table.values())if(!e.pending_removal)grid.insert(targetGrid,e.path.position.x,e.path.position.y,e)
 let candidates=[];g.heroes.ranged.enemyCandidates=(_pool,pos,radius)=>{const found=[];grid.filter(found,'targets',pos.x,pos.y,radius);candidates=found;return found}
 const result=g.heroes.ranged.acquire({pos:r.pos},templates.hero_zefira.ranged.attacks[0],[...table.values()]);assert.deepEqual(candidates.map(e=>e.id),r.candidates);assert.equal(result?.target.id,r.target);if(result){selected++;assert(Math.hypot(result.position.pos.x-r.predicted.x,result.position.pos.y-r.predicted.y)<1e-7)}
 const stable=r.targets.map(id=>byId.get(id)).sort((a,b)=>a.id-b.id).sort((a,b)=>a.path.remainingNodes-b.path.remainingNodes);if(stable[0]?.id!==r.target)changed++;if(r.targets.some((id,i)=>i&&byId.get(id).path.remainingNodes===byId.get(r.targets[i-1]).path.remainingNodes))ties++
}
assert(selected>0&&ties>0&&changed>0);console.log(`${rows.length} original hero ranged SSO/FFE queries: three maps, mixed lanes, moving/flying targets, actual Lua table deletions, radius expansion, selected target and forecast point; ${selected} selections/${ties} tie cases/${changed} differ from stable creation order`)
