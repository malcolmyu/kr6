import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {GameSession} from '../src/game/GameSession.ts'
const read=name=>JSON.parse(readFileSync(name)),templates=read('public/data/entities.json'),level=read('public/data/level01.json'),program=read('public/data/level01-campaign.json')
const game=new GameSession(level,program,templates,()=>.5),events=[]
let now=0
game.heroes.onSound=name=>events.push({name,at:now})
game.heroes.onCinematic=active=>events.push({name:active?'start-cinematic':'end-cinematic',at:now})
game.heroes.startIntro({x:628,y:352},0)
for(let i=0;i<=270;i++){now=i/30;game.heroes.advance(now)}
const oracle=read('analysis/hero-intro-oracle.json').filter(e=>['Stage01GeraldEnter','HeroGeraldTauntIntro','start-cinematic','end-cinematic'].includes(e.name))
assert.equal(events.length,oracle.length)
for(let i=0;i<events.length;i++){assert.equal(events[i].name,oracle[i].name);assert(Math.abs(events[i].at-oracle[i].at)<1e-9)}
const hero=game.heroes.gerald
assert(hero);assert.equal(hero.born,9);assert.equal(hero.hp,220);assert.equal(hero.template.health.armor,.05);assert.equal(hero.template.melee.attacks[0].damage_min,10);assert.equal(hero.template.melee.attacks[0].damage_max,14)
assert(game.heroes.moveGerald({x:700,y:352}))
for(let i=1;i<=60;i++)game.barracks.advance(9+i/30,1/30,[],[])
assert.deepEqual(hero.pos,{x:700,y:352})
hero.hp=0;hero.diedAt=11
game.heroes.advance(41);assert.equal(hero.hp,0);assert.equal(hero.visualOverride.name,'level_up')
game.heroes.advance(41+32/30);assert.equal(hero.hp,220);assert.equal(hero.diedAt,undefined)
console.log('Original Gerald entry event frames match; level-one stats and 55px/s rally movement verified (advanced skills still pending)')
