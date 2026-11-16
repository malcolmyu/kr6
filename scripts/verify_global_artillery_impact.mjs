import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {PathFollower} from '../src/game/PathFollower.ts'
import {globalUpgradeTemplates} from '../src/game/GlobalUpgrades.ts'
const read=p=>JSON.parse(readFileSync(p)),base=read('public/data/entities.json'),rows=read('analysis/global-artillery-impact-oracle.json')
let hits=0
for(const row of rows){
 const templates=globalUpgradeTemplates(base,row.upgraded?{artillery:['l1','l2','l3b']}:{}),combat=new RangedCombat(templates,()=>.5,()=>{}),site={id:'sold-source',tower:`tower_catapult_lvl${row.rank}`,pos:{x:400,y:388}}
 for(const [key,field]of [['min','damage_min'],['max','damage_max'],['radius','damage_radius']])assert(Math.abs(row.bullet[key]-templates[`bullet_catapult_lvl${row.rank}`].bullet[field])<1e-10,'original isolated impact receives the same patched native template; allow only JSON decimal serialization error')
 const enemies=row.targets.map((target,i)=>({id:i+1,name:row.name,hp:1000,template:{...structuredClone(templates[row.name]),health:target.health},path:new PathFollower([{x:500+target.offset,y:350},{x:1500,y:350}])}))
 combat.catapultTowers.onShoot(site,`bullet_catapult_lvl${row.rank}`,{x:400,y:400},{x:500,y:350},row.factor,-1/30)
 for(let tick=0;tick<100;tick++)combat.advance(tick*(1/30),[],enemies)
 for(const d of row.damage){assert.equal(1000-enemies[d.target-1].hp,d.applied,`${row.upgraded}/${row.rank}/${row.factor}/${row.name}/${d.target}`);if(row.upgraded)assert.equal(d.explosive_factor,.75);hits++}
 assert.equal(enemies.filter(e=>e.hp<1000).length,row.damage.filter(d=>d.applied>0).length)
}
console.log(`${rows.length} original base/upgraded artillery projectile impacts and ${hits} post-armour hits match across four tower ranks, three enemy armour profiles, radial decay and Royal damage factor; queued shots survive source sale`)
