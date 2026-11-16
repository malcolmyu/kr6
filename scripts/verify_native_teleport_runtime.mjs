import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EnemyTeleportRuntime} from '../src/game/EnemyTeleportRuntime.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),rows=read('analysis/native-teleport-runtime-oracle.json')
let frames=0
for(const row of rows){
 const level=read(`public/data/level0${row.stage}.json`),b=row.before,path=new EnemyPath(level.paths.paths,level.navigation,b.pi,b.spi);path.ni=b.ni;path.prevPis=[...b.prev];Object.assign(path.position,level.paths.paths[b.pi-1][b.spi-1][b.ni-1])
 const enemy={id:200,hp:b.hp,name:'enemy_bandit',path,template:structuredClone(templates.enemy_bandit),teleportCount:b.count};enemy.template.vis={flags:b.flags,bans:b.bans}
 const runtime=new EnemyTeleportRuntime(),events=[];let model,registered=false,removeTick,tick=row.birth
 runtime.onEffect=(name,pos,at)=>events.push({tick,name,pos,at});runtime.onRemove=()=>{events.push({tick,remove:true});removeTick=tick}
 for(const f of row.frames){
  tick=f.tick;const time=tick*(1/30),relative=tick-row.birth
  if(relative===1)model=runtime.queue(enemy,time)
  if(relative===2){registered=runtime.insert(model,time);assert.equal(registered,row.accepted)}
  if(removeTick!==undefined&&tick>removeTick&&registered){runtime.remove(model);registered=false}
  if(registered)runtime.advance(model,time)
  const ctx=`stage${row.stage}/birth${row.birth}/node${b.ni}/${row.scenario}/tick${tick}`,actual={bans:enemy.template.vis.bans,stun:enemy.template.unit.stun_count??0,stunned:!!enemy.template.unit.is_stunned,ignore:enemy.template.health.ignore_damage,hidden:enemy.teleportHidden?1:0,count:enemy.teleportCount,pi:path.pi,ni:path.ni,pos:path.position,registered,removing:removeTick!==undefined}
  for(const [key,value]of Object.entries(actual))assert.deepEqual(value,f[key],ctx+'/'+key)
  frames++
 }
 assert.deepEqual(events,row.events,'Original teleport effect/removal stream '+JSON.stringify({stage:row.stage,birth:row.birth,node:b.ni,scenario:row.scenario}))
}
console.log(`${rows.length} original teleport lifecycle traces / ${frames} frames match queue bans, rejection, immunity/stun/count, hidden interval, cross-path destination and precise effect/remove clocks`)
