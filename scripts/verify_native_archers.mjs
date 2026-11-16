import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
const randomMode=process.argv.includes('--constant')?'constant':'sequence'
const n=read(`analysis/level-entity-bootstrap-3-campaign-entry-archers-runtime-${randomMode}.json`),commands=read('analysis/native-runtime-archers-input.json'),values=[.11,.83,.29,.71,.43,.59,.19,.97,.37,.61,.07,.89,.47,.53,.23,.79]
let calls=0,arrows=0,controllers=0,units=0,decals=0
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'),()=>{const value=randomMode==='constant'?.5:values[calls%values.length];calls++;return value},'campaign',['archers','knights','catapult','wizard'])
g.heroes.playerLevel=n.playerLevel;g.heroes.savedXp={hero_gerald:0,hero_zefira:0};g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure({},n.playerLevel,3);applyStageSetup(g,3,'campaign',true,false)
const near=(a,b,ctx)=>assert(Math.abs(a-b)<1e-7,`${ctx}: ${a} != ${b}`),point=(a,b,ctx)=>{near(a.x,b.x,ctx+'/x');near(a.y,b.y,ctx+'/y')}
for(const f of n.frames){
 for(const c of commands.filter(c=>c.tick===f.tick))if(c.kind==='send_wave')g.callNextWave();else g.build(c.holder,c.tower)
 g.advance(1/30);const ctx=`archers tick${f.tick}`,r=g.entities.registry
 assert.equal(g.time,f.tick*(1/30));assert.equal(calls,f.randomBoundary,ctx+'/RNG');assert.equal(r.nextId,f.nextId);assert.equal(r.count,f.count);assert.equal(r.max,f.max)
 assert.deepEqual([...r.entities.values()].map(({id,template})=>({id,template})),f.entities.map(({id,template})=>({id,template})),ctx+'/entity table');assert.deepEqual(r.pendingInserts.map(e=>e.id),f.inserts);assert.deepEqual(r.pendingRemovals.map(e=>e.id),f.removals)
 assert.equal(g.gold,f.gold);assert.equal(g.lives,f.lives);assert.equal(g.waveGems.collected,f.gems);assert.equal(g.waves.wave,f.wave);assert.equal(g.paused,f.paused??false)
 for(const e of g.enemies.filter(e=>e.hp>0&&e.escapedAt===undefined)){const a=f.entities.find(a=>a.id===g.entities.entity(e)?.id);assert(a);assert.equal(e.hp,a.hp);assert.equal(e.path.ni,a.node.ni);assert.equal(e.template.enemy.gems,a.gems);point(e.path.position,a.pos,ctx+'/enemy')}
 for(const s of g.barracks.soldiers){const entity=g.entities.entity(s),a=entity&&f.entities.find(a=>a.id===entity.id);if(!a)continue;assert.equal(s.hp,a.hp,ctx+'/unit HP');point(s.pos,a.pos,ctx+'/unit');assert.equal(s.target?g.entities.entity(s.target)?.id:undefined,a.target,ctx+'/target');units++}
 for(const c of g.combat.archerControllers){const entity=g.entities.entity(c),a=f.entities.find(a=>a.id===entity?.id);if(!a)continue
  assert.equal(c.idleTs,a.archer.idleTs,ctx+'/shooter idle clock');assert.equal(c.pending,!!a.archer.shoot);if(a.archer.predPos)point(c.predPos,a.archer.predPos,ctx+'/retained aim')
  const tower=f.entities.find(a=>a.id===g.entities.entity(c.site)?.id),part=tower.archerParts[c.sid-1]
  assert.equal(c.animation+(c.back?'back':''),part.name,ctx+'/shooter animation');assert.equal(c.startedAt,part.ts,ctx+'/shooter animation clock');assert.equal(c.loop,part.loop);assert.equal(c.flipX,part.flip,ctx+'/shooter facing');controllers++
 }
 const originalArrows=f.entities.filter(e=>e.template.startsWith('bullet_archers_lvl')),webArrows=g.combat.projectiles.filter(p=>p.name.startsWith('bullet_archers_lvl'))
 assert.equal(webArrows.length,originalArrows.length,ctx+'/arrow bodies through removal flush')
 for(const p of webArrows){const a=originalArrows.find(a=>a.id===g.entities.entity(p)?.id);assert(a);point(p.pos,a.pos,ctx+'/arrow position');point(p.to,a.bullet.to,ctx+'/arrow aim');point(p.from,a.bullet.from,ctx+'/arrow start');point(p.arrowMotion.speed,a.bullet.speed,ctx+'/arrow speed');near(p.rotation,a.rotation,ctx+'/arrow rotation');assert.equal(p.born,a.bullet.ts);assert.equal(p.arrowMotion.hidden,a.bullet.hidden);arrows++}
 for(const d of g.staticEffects.models.filter(d=>d.name.startsWith('decal_archers_miss_'))){const a=f.entities.find(a=>a.id===g.entities.entity(d)?.id);if(a){near(d.sprites[0].alpha,a.archerParts[0].alpha,ctx+'/miss decal alpha');decals++}}
}
const event=e=>({tick:e.tick,kind:e.kind,id:e.id,template:e.template});assert.deepEqual(g.entities.events.map(event),n.events.map(event));assert.equal(n.frames.length,1800)
console.log(`Actual ${randomMode} campaign archer GameSession: all1800 ticks/${n.events.length} events/${calls} RNG draws; ${controllers} controller clocks/poses, ${arrows} arrow bodies/trajectories, ${decals} miss-decal alphas and ${units} unit states match original. One60-second prescribed battle, not full3-2/video acceptance.`)
