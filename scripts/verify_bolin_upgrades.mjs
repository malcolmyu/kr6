import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bolinUpgradeTemplates} from '../src/game/BolinUpgrades.ts'
import {HeroSystem} from '../src/game/HeroSystem.ts'
import {BarracksCombat} from '../src/game/BarracksCombat.ts'
const read=p=>JSON.parse(readFileSync(p)),templates=read('public/data/entities.json'),oracle=read('analysis/bolin-passives-oracle.json');assert.equal(oracle.length,19)
let levels=0
for(const row of oracle){const patched=bolinUpgradeTemplates(templates,row.nodes),h=structuredClone(patched.hero_bolin);delete h.webAnimationDurations;assert.deepEqual(h,row.hero,`actual original patches ${row.nodes}`)
 for(const n of row.levels){const i=n.level-1,ls=h.hero.level_stats;assert.equal(ls.hp_max[i],n.hp);assert.equal(ls.armor[i],n.armor);assert.equal(ls.regen_health[i],n.regen);assert.equal(ls.melee_damage_min[i],n.melee.damage_min);assert.equal(ls.melee_damage_max[i],n.melee.damage_max);assert.equal(ls.ranged_damage_min[i],n.bullet.damage_min);assert.equal(ls.ranged_damage_max[i],n.bullet.damage_max);levels++}
}
const before=JSON.stringify(templates),heroes=new HeroSystem(templates,new BarracksCombat(templates,()=>.5,()=>{}));heroes.savedXp.hero_bolin=72000;heroes.savedUpgrades.hero_bolin=['skill_a','skill_b','upg_a','upg_b','upg_c','upg_d','upg_e'];const h=heroes.insert('hero_bolin',{x:500,y:350},0);assert.equal(h.name,'hero_bolin');assert.equal(h.level,10);assert.equal(h.template.webAnimationDurations.shoot,2.5);assert.equal(JSON.stringify(templates),before,'per-session upgrades never mutate shared templates')
console.log(`${oracle.length} original Bolin upgrade configurations / ${levels} levels and actual HeroSystem insertion match; shared templates preserved`)
