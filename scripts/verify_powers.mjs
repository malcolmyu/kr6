import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
const read=name=>JSON.parse(readFileSync(name)),templates=read('public/data/entities.json'),level=read('public/data/level01.json'),program=read('public/data/level01-campaign.json')
let frames=0
for(const trace of read('analysis/rain-oracle.json')) {
 const game=new GameSession(level,program,templates,()=>.5),p=game.powers
 p.meteors.push({id:1,born:0,pos:{x:trace.to.x,y:768},to:trace.to,speed:300,rotation:0,maxHeight:768,shadowScale:0})
 for(const [index,expected] of trace.frames.entries()) {
  p.advance(index/30,1/30,[])
  const meteor=p.meteors[0]
  assert.equal(!meteor,expected.done,`arrival frame ${index}`)
  if(meteor)assert(Math.hypot(meteor.pos.x-expected.pos.x,meteor.pos.y-expected.pos.y)<1e-7,`flight frame ${index}`)
  frames++
 }
}
const game=new GameSession(level,program,templates,()=>.5),p=game.powers
assert.equal(p.select('reinforcements',0),false,'Powers are locked before the first wave')
game.callNextWave();assert.equal(p.select('reinforcements',0),false,'Summon input alone does not unlock powers before the wave phase');game.advance(1/30);const now=game.time
const node=level.paths.paths[0][0][100]
assert(p.select('reinforcements',now));assert(p.cast(node,now));assert.equal(game.barracks.soldiers.length,2)
assert.deepEqual(game.barracks.soldiers.map(s=>s.pos),[{x:node.x+10,y:node.y-10},{x:node.x-10,y:node.y+10}])
assert.equal(p.remaining('reinforcements',now),15);assert.equal(p.select('reinforcements',now+14.9),false)
for(let i=1;i<=362;i++)game.barracks.advance(now+i/30,1/30,[],[])
assert(game.barracks.soldiers.every(s=>s.fadeOutAt!==undefined && s.hp===0),'Expired reinforcements fade out without death animation')
for(let i=363;i<=390;i++)game.barracks.advance(now+i/30,1/30,[],[])
assert.equal(game.barracks.soldiers.length,0)
assert(p.select('rain_of_fire',now));assert(p.cast(node,now));assert.equal(p.remaining('rain_of_fire',now),60)
let casts=0,impacts=0;p.onSound=name=>{if(name==='PowersRainOfFireCast')casts++;if(name==='PowersRainOfFireImpact')impacts++}
for(let i=0;i<150;i++)p.advance(now+i/30,1/30,[])
assert.equal(casts,3);assert.equal(impacts,3);assert.equal(p.meteors.length,0)
// One raw damage roll is shared by every eligible target in the original ellipse.
const aoe=new GameSession(level,program,templates,()=>.5),origin={x:567,y:352}
const enemies=[{x:567,y:352},{x:625,y:352},{x:567,y:410}].map((pos,id)=>({id,name:'enemy_bandit',born:0,age:0,hp:200,template:{...templates.enemy_bandit,health:{...templates.enemy_bandit.health,armor:1}},path:{position:pos,finished:false}}))
aoe.powers.meteors.push({id:1,born:0,pos:{...origin},to:{...origin},speed:300,rotation:0,maxHeight:768,shadowScale:1})
aoe.powers.advance(0,1/30,enemies)
assert.deepEqual(enemies.map(e=>e.hp),[155,155,200],'True damage ignores armor, shares a roll and uses the .7 ellipse')
console.log(`${frames} original LuaJIT meteor frames match; two reinforcement offsets, lifetime/fade, power cooldowns and three impacts verified`)
