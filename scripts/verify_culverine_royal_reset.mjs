import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v),g=new GameSession(read('public/data/level03.json'),read('public/data/level03-campaign.json'),read('public/data/entities.json'))
for(const row of read('analysis/culverine-royal-reset-oracle.json')){
 const site={id:'royal-cuv',tower:'tower_culverine_lvl4'},state={attacks:structuredClone(row.before.attacks),timedAttacks:structuredClone(row.before.timed)}
 g.combat.culverineTowers.states.set(site.id,state);g.powers.royal.onResetSkills(site)
 assert.deepEqual(state.attacks.map(a=>a.ts),row.after.attacks.map(a=>a.ts),row.kind+'/basic clocks');assert.deepEqual(state.timedAttacks.map(a=>a.ts),row.after.timed.map(a=>a.ts),row.kind+'/timed clocks')
}
console.log('Original Royal modifier → actual GameSession callback: Culverine A/C/ultimate clocks reset; ordinary attacks/basic and static flags preserved in four original cases')
