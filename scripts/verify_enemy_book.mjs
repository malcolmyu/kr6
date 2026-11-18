import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import {enemyBook,enemyDiscovered,enemyBookView,recordDiscoveredEnemies} from '../src/game/EnemyBook.ts'
import {parseProgress} from '../src/game/ProgressStore.ts'
import {mergeSavedProgress} from '../src/game/SaveMerge.ts'
assert.equal(enemyBook.enemies.length,56)
for(const e of enemyBook.enemies){assert(e.name&&e.description,e.id);for(const image of [e.portrait,e.thumb])assert(existsSync('public/assets/'+image+'.png'),image)}
let p={levels:{}};assert(enemyDiscovered(p,enemyBook.enemies[0]));assert(!enemyDiscovered(p,enemyBook.enemies[1]));p=recordDiscoveredEnemies(p,['enemy_bandit_tut','enemy_shadow_archer','unknown']);assert.deepEqual(p.discoveredEnemies,['enemy_bandit','enemy_shadow_archer']);assert.equal(recordDiscoveredEnemies(p,['enemy_bandit']),p)
assert(enemyDiscovered(parseProgress(JSON.stringify(p)),enemyBook.enemies.find(e=>e.id==='enemy_shadow_archer')))
const merged=mergeSavedProgress(p,{levels:{},discoveredEnemies:['enemy_crow']});assert(merged.discoveredEnemies.includes('enemy_shadow_archer'));assert(merged.discoveredEnemies.includes('enemy_crow'))
const walk=(n,fn)=>{fn(n);for(const c of n.children??[])walk(c,fn)}
for(let page=0;page<3;page++){const v=enemyBookView(p,'enemy_bandit',page),pages=[],buttons=[];walk(v,n=>{if(n.action?.startsWith('page:'))pages.push(n);if(n.action?.startsWith('enemy:')&&!n.hidden)buttons.push(n)});assert.equal(pages.length,3);assert.equal(buttons.length,page===2?16:20)}
console.log('56 original enemy entries/assets, discovery/normalization/save roundtrip/stale-tab merge and 20/20/16-page navigation verified.')
