import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {heroRoomView,roomFind} from '../src/game/HeroRoom.ts'
import {heroLevel,heroXpFraction} from '../src/game/HeroProgression.ts'
import {powerRoomView,powerRoomStats} from '../src/game/PowerRoom.ts'
import {powerLevel,powerXpFraction} from '../src/game/PowerProgression.ts'
const hero=JSON.parse(readFileSync('public/data/hero-room.json')),power=JSON.parse(readFileSync('public/data/power-room.json'))
for(const name of ['hero_gerald','hero_zefira','hero_bolin'])for(const xp of [1000,2500,8500,72000]){
 const view=heroRoomView(hero,name,xp,[]),origin=roomFind(view,'button_tower_roster'),level=heroLevel(xp)
 assert.equal(roomFind(origin,'label_portrait_small_lvl_number').text,String(level),name+' actual level')
 assert.notEqual(roomFind(origin,'group_xp_info').hidden,true,name+' XP visible')
 assert.equal(roomFind(origin,'image_portrait_small_xp_bar').scale.x,heroXpFraction(level,xp),name+' XP fraction')
 assert.equal(roomFind(view,'label_upgrade_points_general').text,String((level-1)*4))
}
for(const kind of ['reinforcements','rain_of_fire','royal_edict'])for(const xp of [0,5999,6000,16000,90000]){
 const p={levels:{1:{campaign:3},2:{campaign:3},3:{campaign:3}},powerXp:{[kind]:xp}},stats=powerRoomStats(power,p,kind),view=powerRoomView(power,p,kind,'main')
 assert.equal(stats.level,powerLevel(xp));assert.equal(stats.fraction,powerXpFraction(xp));assert.equal(stats.points,powerLevel(xp)-1);assert.equal(roomFind(view,'label_lvl_number').text,String(stats.level))
}
const defaults=JSON.parse(readFileSync('public/data/power-progression.json')).rules;for(const [name,starting]of Object.entries(defaults.powers_starting_level))if(power.units[name])assert.equal(powerRoomStats(power,{levels:{}},name).level,starting,name+' original starting level')
console.log('Hero room levels/XP/points and spell levels/XP/points bind to actual saved experience across threshold and max-level cases.')
