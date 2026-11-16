import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {powerCooldownPhase} from '../src/game/PowerCooldown.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),oracle=read('analysis/power-cooldown-oracle.json')
for(const row of oracle.frames)assert(Math.abs(powerCooldownPhase(row.remaining,row.cooldown)-row.phase)<1e-10,`${row.kind}/${row.remaining}`)
const g=new GameSession(read('public/data/level02.json'),read('public/data/level02-iron.json'),read('public/data/entities.json'),()=>.5),p=g.powers;p.equip(['reinforcements','rain_of_fire','royal_edict']);assert.deepEqual(p.cooldowns,oracle.cooldowns);g.callNextWave()
g.advance(1/30);const now=g.time
assert(p.select('royal_edict',now));assert(p.cast({x:500,y:350},now));assert.equal(p.cooldowns.royal_edict,50);assert.equal(p.remaining('royal_edict',now),50);assert.equal(powerCooldownPhase(25,p.cooldowns.royal_edict),.5)
p.royal.control.cooldown=40;assert.equal(p.cooldowns.royal_edict,50,'in-progress UI retains the cast cooldown snapshot');p.earlyWaveBonus(7,now);assert.equal(p.remaining('royal_edict',now),43);assert.equal(p.select('royal_edict',now+43),true);assert(p.cast({x:500,y:350},now+43));assert.equal(p.cooldowns.royal_edict,40);assert.equal(p.remaining('royal_edict',now+43),40)
console.log('21 original power-button cooldown phases match; native15/60/50s durations, Royal50s mask, cast-time snapshot and early-wave/new-cast updates verified')
