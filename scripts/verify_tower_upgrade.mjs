import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
const read=name=>JSON.parse(readFileSync(name)),templates=read('public/data/entities.json')
for(const row of read('analysis/tower-upgrade-oracle.json')) {
 const game=new GameSession(read('public/data/level02.json'),read('public/data/level02-campaign.json'),templates,()=>.5,'campaign',['archers','knights','catapult','wizard','culverine']),site=game.towers.sites.find(s=>!s.tower)
 game.gold=1000;game.build(site.id,row.kind);game.advance(1);game.gold=1000
 if(row.refund!==undefined){game.waves.wave=row.wave;game.sellTower(site.id);assert.equal(game.gold-1000,row.refund);assert.equal(site.tower,undefined);assert.equal(site.spent,0);continue}
 game.advance(1)
 const oldSoldiers=game.barracks.soldiers.filter(s=>s.siteId===site.id),positions=oldSoldiers.map(s=>({...s.pos}))
 oldSoldiers.forEach(s=>s.hp=1)
 game.upgradeTower(site.id)
 assert.equal(1000-game.gold,row.cost);assert.equal(site.spent,row.spent);assert.equal(site.tower,`tower_${row.kind}_lvl2`)
 assert.equal(game.combat.shooters.has(site.id),false)
 if(row.soldier){assert.equal(oldSoldiers.length,3);for(const [i,s] of game.barracks.soldiers.filter(s=>s.siteId===site.id).entries()){assert(!oldSoldiers.includes(s));assert.equal(s.name,row.soldier.name);assert.equal(s.hp,row.soldier.hp_max);assert.deepEqual(s.pos,positions[i])}}
 const next=game.towers.nextUpgrade(site);assert.equal(next.name,`tower_${row.kind}_lvl3`)
 game.gold=0;assert.throws(()=>game.upgradeTower(site.id),/金币不足/)
 game.gold=1000;game.upgradeTower(site.id);assert.equal(game.towers.nextUpgrade(site).name,`tower_${row.kind}_lvl4`);game.gold=1000;game.upgradeTower(site.id);assert.equal(game.towers.nextUpgrade(site),undefined)
 game.sellTower(site.id);assert.equal(game.barracks.soldiers.filter(s=>s.siteId===site.id).length,0)
}
const first=new GameSession(read('public/data/level01.json'),read('public/data/level01-campaign.json'),templates)
first.build('6','archers');first.advance(1);assert.equal(first.towers.nextUpgrade(first.towers.sites.find(s=>s.id==='6')),undefined)
console.log('Original tower_upgrade system oracle: four upgrade prices/spent totals, pre-wave full refunds, battle 60% refunds and full-health soldier replacement match; level locks and failed upgrades verified')
for(const kind of ['archers','wizard','knights','catapult'])for(const targetLevel of [2,3,4]) {
 // Unlock only this combat fixture; production still reads original level locks.
 const level=read('public/data/level01.json');level.data.locked_towers=[]
 const game=new GameSession(level,read('public/data/level01-campaign.json'),templates,()=>.5,'campaign',['archers','knights','catapult','wizard','culverine'])
 let kills=0;game.onCommand=c=>{if(c.name==='signal'&&c.signal_name==='got-enemy-gold')kills++}
 game.gold=10000;game.build('6',kind);game.advance(2)
 for(let lv=2;lv<=targetLevel;lv++)game.upgradeTower('6')
 game.waves.callNextWave();game.advance(40)
 assert(kills>0,`${kind} level ${targetLevel} must attack and kill original enemies`)
}
console.log('All four base towers at levels 2/3/4 kill actual original-wave enemies after upgrade')
