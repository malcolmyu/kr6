import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {OutcomePresentation} from '../src/game/OutcomePresentation.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),native=read('analysis/victory-timing-oracle.json');let now=0,jobs=[],events=[]
const scheduler={after:(delay,fn)=>{const job={at:now+delay,fn};jobs.push(job);return job},cancel:h=>{h.cancelled=true}},view=new OutcomePresentation(scheduler),advance=t=>{now=t;for(const j of jobs)if(!j.done&&!j.cancelled&&j.at<=now){j.done=true;j.fn()}}
const game=new GameSession(read('public/data/level03.json'),{format:'tsv',commands:[{name:'gold',value:0},{name:'lives',value:20},{name:'wave',wait_time:-1}]},read('public/data/entities.json'))
game.levelScriptComplete=true;game.callNextWave();game.advance(1);assert.equal(game.outcome.kind,'victory');assert(!game.paused);const result=game.outcome,time=game.time;game.advance(1);assert.equal(game.time,time+1);assert.equal(game.outcome,result,'completed result is latched while its world keeps running')
view.begin('victory',()=>events.push({at:now,name:'hide-hud'}),()=>{events.push({at:now,name:'show-victory'});game.paused=true});advance(2.999);assert.deepEqual(events,[]);advance(3);assert.deepEqual(events,[{at:3,name:'hide-hud'}]);assert(!game.paused);advance(4);assert(game.paused);const stopped=game.time;game.advance(1);assert.equal(game.time,stopped)
assert.deepEqual(events,native.find(r=>r.scenario==='ordinary').events.filter(e=>['hide-hud','show-victory'].includes(e.name)))
events=[];jobs=[];now=0;view.begin('victory',()=>events.push('stale-hide'),()=>events.push('stale-show'));view.clear();advance(5);assert.deepEqual(events,[],'restart/scene disposal cancels old result callbacks');view.begin('defeat',()=>events.push('hide'),()=>events.push('show'));assert.deepEqual(events,['hide','show']);view.clear()
assert.deepEqual(native.find(r=>r.scenario==='stale').events,[{at:0,name:'store-xp'}])
console.log('Original victory signal/show callbacks: world advances on stable victory result, HUD hides at3s, show callback pauses at4s; defeat immediate, restart/disposal cancels pending presentation')
