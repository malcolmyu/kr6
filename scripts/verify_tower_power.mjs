import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TowerSystem} from '../src/game/TowerSystem.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),level=read('public/data/level01.json'),oracle=read('analysis/tower-power-oracle.json'),towers=new TowerSystem(level,'campaign',templates),site=towers.sites[0];site.tower='tower_archers_lvl4';site.spent=1000
let gold=1000
for(const [index,row]of oracle.entries()){if(index<3)gold=towers.upgradePower(site.id,'skill_b',gold);else assert.throws(()=>towers.upgradePower(site.id,'skill_b',gold));assert.equal(site.powerLevels.skill_b,row.level);assert.equal(site.spent,row.spent);assert.equal(gold,row.gold)}
assert.equal(towers.refund(site,0),1360);assert.equal(towers.refund(site,1),816)
const poor=towers.sites[1];poor.tower='tower_archers_lvl4';assert.throws(()=>towers.upgradePower(poor.id,'skill_b',119));assert.equal(poor.spent,0);assert.throws(()=>towers.upgradePower(poor.id,'ultimate',1000));assert.throws(()=>towers.upgradePower(poor.id,'skill_a',149));let archerGold=450;for(let rank=1;rank<=3;rank++){archerGold=towers.upgradePower(poor.id,'skill_a',archerGold);assert.equal(poor.powerLevels.skill_a,rank)}assert.equal(archerGold,0);assert.equal(poor.spent,450);assert.equal(towers.nextPower(poor,'skill_a'),undefined);assert.throws(()=>towers.upgradePower(poor.id,'skill_a',1000));poor.tower='tower_archers_lvl3';assert.equal(towers.nextPower(poor,'skill_b'),undefined)
const session=new GameSession(level,read('public/data/level01-campaign.json'),templates,()=>.5);const s=session.towers.sites[0];s.tower='tower_archers_lvl4';session.gold=1000;session.upgradeTowerPower(s.id,'skill_b');assert.equal(session.gold,880);session.paused=true;assert.throws(()=>session.upgradeTowerPower(s.id,'skill_b'));session.paused=false;session.sellTower(s.id);assert.equal(s.powerLevels,undefined);assert.equal(s.instance,1)
console.log('Original three power purchases/max-level behavior match prices, spent/refund and level progression; unsupported/low-gold/paused guards and sold-site reset verified')
