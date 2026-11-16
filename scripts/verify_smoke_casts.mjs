import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemySkills} from '../src/game/EnemySkills.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/smoke-casts-oracle.json'),templates=read('public/data/entities.json'),level=read('public/data/level03.json')
for(const r of rows){const s=new EnemySkills(level,templates,()=>.5),e={id:1,name:'enemy_shadow_blades',hp:r.scenario==='threshold'?14:13,path:{position:{x:600,y:350},remainingNodes:r.scenario==='near-exit'?34:100},template:structuredClone(templates.enemy_shadow_blades)},events=[];e.template.health.hp_max=70;s.defer=true
 let tick=r.start,done=false;s.onSound=name=>events.push({kind:'sound',name,tick});s.runtime.onQueue=()=>events.push({kind:'aura',tick});s.onDeparture=()=>{events.push({kind:'remove',tick});done=true}
 for(;tick<=r.start+90;tick++){const offset=tick-r.start;e.template.unit.is_stunned=r.scenario==='stun'&&offset>=10&&offset<15||r.scenario==='deadline-stun'&&offset===20;if(r.scenario==='death'&&offset===10||r.scenario==='deadline-death'&&offset===20)e.hp=0;s.advanceShadow(e,tick*(1/30));if(done||e.hp<=0)break}
 assert.deepEqual(events,r.events,JSON.stringify({start:r.start,scenario:r.scenario}));assert.equal(e.hp,r.hp);assert.equal(!!e.template.health.ignore_damage,r.immune)
}
console.log(`${rows.length} original shadow own-main casts match nonzero birth clocks, exact delay, HP/node gates, stun/death cancellation/retry, sound/aura/removal ticks and final HP/immunity; free-walking isolated coroutine coverage`)
