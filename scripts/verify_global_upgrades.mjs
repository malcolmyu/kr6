import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {globalUpgradeTemplates,globalUpgradeData,purchaseGlobalUpgrade,globalUpgradeSpent,validateGlobalUpgrades,globalUpgradePoints} from '../src/game/GlobalUpgrades.ts'
import {evaluateHeroGraph} from '../src/game/HeroUpgrades.ts'
const read=p=>JSON.parse(readFileSync(p)),data={...read('public/data/global-upgrades.json'),templates:read('analysis/global-upgrade-base-templates.json')},base=JSON.stringify(read('analysis/global-upgrade-base-templates.json'))
let patches=0
const equal=(a,b,path='root')=>{if(typeof a==='number'&&typeof b==='number'){assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${path}: ${a} != ${b}`);return}if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),path);for(const k of Object.keys(b))equal(a[k],b[k],path+'.'+k);return}assert.deepEqual(a,b,path)}
for(const row of read('analysis/global-upgrade-patch-oracle.json')){const actual=globalUpgradeTemplates(data.templates,{[row.kind]:row.selected});for(const [name,template]of Object.entries(row.templates))equal(actual[name],template,`${row.kind}/${row.selected}/${name}`);patches++}
assert.equal(JSON.stringify(data.templates),base,'session patches leave base templates unchanged')
const graphs=read('analysis/global-upgrade-graph-oracle.json');for(const r of graphs)equal(evaluateHeroGraph(globalUpgradeData.graphs[r.source],r.selected,r.points),r.result)
let selected={};selected=purchaseGlobalUpgrade(11,selected,'mages','l1');selected=purchaseGlobalUpgrade(11,selected,'artillery','l1');assert.equal(globalUpgradeSpent(selected),2);assert.deepEqual(validateGlobalUpgrades(11,selected),selected);assert.equal(purchaseGlobalUpgrade(11,selected,'mages','l3b'),selected,'prerequisites required');assert.deepEqual(validateGlobalUpgrades(0,selected),{});assert.deepEqual(validateGlobalUpgrades(1,{mages:['l1'],artillery:['l1']}),{mages:['l1']})
const patched=globalUpgradeTemplates(read('public/data/entities.json'),selected);assert(Math.abs(patched.bolt_tower_wizard_lvl1.bullet.damage_min-6.9)<1e-12);assert.equal(patched.bolt_tower_wizard_lvl1.bullet.damage_max,9);assert.equal(patched.tower_wizard_lvl1.tower.price,100);assert.equal(patched.tower_catapult_lvl1.attacks.range,250);assert.equal(patched.bullet_catapult_lvl1.bullet.damage_radius,66)
let ult={};for(const id of ['l1','l2','l3a','l4a','ulti'])ult=purchaseGlobalUpgrade(12,ult,'artillery',id);assert(!ult.artillery.includes('ulti'),'even a hypothetical12-point budget cannot purchase14-point path to ultimate')
console.log(`${patches} native global patch sets and ${graphs.length} original graph states match; shared upgrade-point budgets/prerequisites/exclusivity, original scalar/append/aura/round operators, native7–9 mage minimum and artillery projectile radius verified`)
const {parseProgress}=await import('../src/game/ProgressStore.ts'),{GameSession}=await import('../src/game/GameSession.ts')
const profile={levels:{1:{campaign:3,iron:true},2:{campaign:3,iron:true},3:{campaign:3}},globalUpgrades:{mages:['l1'],artillery:['l1','l2','l3b','l4b','l3a','unknown']}}
const parsed=parseProgress(JSON.stringify(profile));assert.deepEqual(parsed.globalUpgrades,{mages:['l1'],artillery:['l1','l2']});assert.equal(globalUpgradeSpent(parsed.globalUpgrades),4);assert.deepEqual(parseProgress(JSON.stringify(parsed)),parsed);assert.deepEqual(parseProgress(JSON.stringify({levels:{},globalUpgrades:profile.globalUpgrades})).globalUpgrades,{})
const raw=read('public/data/entities.json'),level=read('public/data/level03.json'),waves=read('public/data/level03-iron.json'),g=new GameSession(level,waves,raw,()=>.5,'iron',undefined,{},validateGlobalUpgrades(6,{artillery:['l1','l2','l3b'],mages:[]}))
assert.equal(g.towers.price('wizard'),100);assert.equal(g.combat.templates.bolt_tower_wizard_lvl1.bullet.damage_min,6);assert.equal(g.combat.templates.bullet_catapult_lvl1.bullet.damage_radius,66);assert.equal(g.combat.templates.bullet_catapult_lvl1.bullet.explosive_factor,.75)
const cheap=new GameSession(level,waves,raw,()=>.5,'iron',undefined,{},validateGlobalUpgrades(3,{mages:['l1','l2']}));assert.equal(cheap.towers.price('wizard'),90);assert.equal(raw.tower_wizard_lvl1.tower.price,100);assert.equal(raw.bolt_tower_wizard_lvl1.bullet.damage_min,6)
g.callNextWave();g.advance(3);assert(g.enemies.length>0);assert(g.enemies.every(e=>e.template.health.hp_max[1]===40&&e.hp===40),'global tower hypotheses do not override native enemy HP')
console.log('Saved global selections sanitize against native stage-point budget and survive serialization; actual GameSession receives native mage minimum, artillery radius/armour fields and rounded prices without mutating base templates or enemy stats')

for(const r of read('analysis/global-upgrade-points-oracle.json')){
 const progress={levels:Object.fromEntries(Array.from({length:r.stage},(_,i)=>[i+1,{campaign:r.stars,...(r.iron?{iron:true}:{})}]))}
 assert.equal(globalUpgradePoints(progress)-globalUpgradeSpent(r.selected),r.remaining)
}
assert.equal(globalUpgradePoints({levels:{}}),0);assert.equal(globalUpgradePoints({levels:{1:{campaign:3,iron:true}}}),0);assert.equal(globalUpgradePoints({levels:{2:{campaign:1}}}),2);assert.equal(globalUpgradePoints({levels:{3:{campaign:3,iron:true}}}),4)
console.log('54 native room point calculations match: highest completed stage controls0/2/4 total points, independently of campaign star rating or iron completion; existing oversized selections are sanitized')
