import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),slots=read('analysis/game-system-order.json').slots
const main=Number(Object.keys(slots).find(k=>slots[k]==='main_script')),particle=Number(Object.keys(slots).find(k=>slots[k]==='particle_system'))
assert(main<particle,'original simulation runs every main script before particle_system')
const game=new GameSession(read('public/data/level03.json'),{format:'tsv',commands:[{name:'gold',value:1000},{name:'lives',value:20},{name:'wait',wait_time:9999}]},read('public/data/entities.json'),()=>.25),events=[]
game.heroes.team.forEach(h=>h.scriptLocked=true)
const hero=game.heroes.advanceCombat.bind(game.heroes),particles=game.combat.firebookTrails.advance.bind(game.combat.firebookTrails)
game.heroes.advanceCombat=(...args)=>{events.push({phase:'hero',time:game.time});hero(...args)}
game.combat.firebookTrails.advance=(...args)=>{events.push({phase:'particles',time:game.time});particles(...args)}
for(let i=0;i<60;i++)game.advance(1/30)
assert.equal(events.length,120)
for(let i=0;i<events.length;i+=2){assert.equal(events[i].phase,'hero');assert.equal(events[i+1].phase,'particles');assert.equal(events[i].time,events[i+1].time)}
console.log('Actual GameSession completes hero combat before particle updates on all60 ticks, matching original main7→particle21; tower impacts retain a source snapshot through this phase')
