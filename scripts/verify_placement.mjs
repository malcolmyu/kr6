import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {RoadPlacement} from '../src/game/RoadPlacement.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),levels=[1,2,3].map(n=>read(`public/data/level0${n}.json`)),placements=levels.map(l=>new RoadPlacement(l))
const cases=read('analysis/placement-oracle.json')
for(const row of cases){const p=placements[row.stage-1];assert.equal(p.nearby(row.pos),row.nearby,JSON.stringify(row));assert.equal(p.terrain(row.pos,2049),row.terrain,JSON.stringify(row))}
const art=read('public/data/towers-art.json'),frames=new Set(Object.entries(art.atlas).flatMap(([name,frame])=>[name,...frame.alias]))
const feedback=art.animations.decal_rally_feedback
for(let i=feedback.from;i<=feedback.to;i++)assert(frames.has(`${feedback.prefix}_${String(i).padStart(4,'0')}`),'Rally feedback animation must have every original frame')
assert(frames.has('rally_circle_full'))
const templates=read('public/data/entities.json'),game=new GameSession(levels[0],{format:'tsv',commands:[{name:'gold',value:9999},{name:'lives',value:20},{name:'wave',wait_time:-1}]},templates,()=>.5)
const site=game.towers.sites.find(s=>!s.tower);game.build(site.id,'knights');game.advance(3)
const range=game.rallyRange(site.id);assert(range)
const pos=cases.filter(c=>c.stage===1&&c.nearby&&c.terrain).map(c=>c.pos).find(p=>(p.x-range.pos.x)**2+((p.y-range.pos.y)/.7)**2<range.radius**2)
assert(pos);const sounds=[],effects=[];game.onSound=s=>sounds.push(s);game.combat.onEffect=n=>effects.push(n)
assert.equal(game.setRally(site.id,{x:-5000,y:-5000}),false);assert(game.setRally(site.id,pos));assert.deepEqual(site.rally,pos)
assert(game.barracks.soldiers.filter(s=>s.siteId===site.id).every(s=>s.center.x===pos.x&&s.center.y===pos.y&&s.deploying))
game.advance(6);assert(game.barracks.soldiers.filter(s=>s.siteId===site.id).every(s=>Math.hypot(s.pos.x-s.rally.x,s.pos.y-s.rally.y)<1))
assert(effects.includes('decal_rally_feedback'));assert(sounds.includes(templates.tower_knights_lvl1.sound_events.change_rally_point))
console.log(`${cases.length} native path/grid placement cases match across three maps; barracks rally ellipse, terrain rejection, three-soldier regroup, feedback and voice verified`)
