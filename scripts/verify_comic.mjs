import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import {ComicPlayer} from '../src/game/ComicPlayer.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/comic01.json'),native=read('analysis/comic-control-oracle.json')
const player=new ComicPlayer(data),sounds=[];let done=0
player.onSound=n=>sounds.push(n);player.onDone=()=>done++
for(const state of native){if(state.action[0]==='skip')player.skip();else player.advance(state.action[1]);assert.equal(player.pageIndex+1,state.page);assert.equal(player.playing,state.playing);assert.equal(player.fading,state.skipping);assert.equal(player.finishing,state.finishing);assert(Math.abs(player.alpha-state.alpha)<1e-9)}
assert.equal(done,1);assert.deepEqual(sounds,['GUINotificationPaperOver','GUINotificationPaperOver'])
assert.deepEqual(data.pages.map(p=>p.endFrame),[362,736]);assert.deepEqual(data.pages.map(p=>p.sprites.length),[8,8])
for(const page of data.pages)for(const sprite of page.sprites)assert(existsSync(`public/assets/${sprite.image}.png`))
const natural=new ComicPlayer(data);natural.advance(20);assert.equal(natural.playing,false);assert.equal(natural.pageIndex,0,'A completed page must wait for a click, not auto-advance')
console.log('Original comic control oracle: .5s input guard, fast-forward, stopped page, .25s fade, two-page progression and paper-turn sounds match; original texts/images available')
