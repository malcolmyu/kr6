import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { WaveRunner } from '../src/game/WaveRunner.ts'
const program = JSON.parse(readFileSync('public/data/level01-campaign.json'))
const events=[]
const runner = new WaveRunner(program,e=>events.push(e))
assert(runner.waitingForWave)
runner.advance(500)
assert.equal(events.filter(e=>e.command.name==='spawn').length,0)
runner.signal('next-wave-sent')
runner.advance(2)
assert.equal(events.filter(e=>e.command.name==='spawn').length,1)
runner.advance(.8)
assert.equal(events.filter(e=>e.command.name==='spawn').length,2)
assert.deepEqual(events.filter(e=>e.command.name==='spawn').map(e=>e.time),[502,502.8])
const tutorialEvents=[]
const tutorial=new WaveRunner(program,e=>tutorialEvents.push(e))
tutorial.startManual('tutorial')
tutorial.advance(30)
assert(tutorialEvents.some(e=>e.command.signal_name==='kr6-tutorial-sequence'))
assert(!tutorialEvents.some(e=>e.command.signal_name==='kr6-tutorial-build-tower-sequence-finished'))
tutorial.signal('unrelated')
tutorial.advance(2)
assert(!tutorialEvents.some(e=>e.command.signal_name==='kr6-tutorial-build-tower-sequence-finished'))
tutorial.signal('tower-built')
assert(tutorialEvents.some(e=>e.command.signal_name==='kr6-tutorial-build-tower-sequence-finished'))
const timeoutEvents=[]
const timed=new WaveRunner({format:'tsv',commands:[{name:'wait_signal',signal_name:'x',wait_time:2},{name:'signal',signal_name:'after'}]},e=>timeoutEvents.push(e))
timed.advance(1); assert.equal(timeoutEvents.length,0)
timed.advance(1); assert.equal(timeoutEvents.at(-1).command.signal_name,'after')
// A single large step must match many small updates (no collapsed spawn times).
const traces=[]
for(const steps of [[18],Array(180).fill(.1)]) {
 const trace=[]; const r=new WaveRunner(program,e=>{if(e.command.name==='spawn')trace.push(e.time)})
 r.signal('next-wave-sent'); for(const step of steps)r.advance(step)
 traces.push(trace)
}
assert.equal(traces[0].length,traces[1].length)
traces[0].forEach((t,i)=>assert(Math.abs(t-traces[1][i])<1e-8))
console.log('Original wave timing, tutorial gates, unrelated signals and timeout verified')
const earlyEvents=[]
const early=new WaveRunner(program,e=>earlyEvents.push(e))
assert(early.nextWave)
early.callNextWave();assert.equal(early.nextWave,undefined)
early.advance(2);early.callNextWave()
assert.equal(early.wave,1,'Ordinary summons cannot skip unfinished spawn commands')
assert.equal(earlyEvents.filter(e=>e.command.name==='spawn').length,1)
for(let i=0;i<1000&&!early.nextWave;i++)early.advance(1/30)
assert(early.nextWave);assert.equal(early.nextWave.number,2)
assert.equal(earlyEvents.filter(e=>e.command.name==='spawn').length,8)
const remaining=early.nextWave.remaining
assert(remaining>21.9&&remaining<=22)
assert.equal(early.callNextWave(),remaining);assert.equal(early.wave,2)
console.log('Native TSV summon gating: current spawns finish before next flag; early calls consume only the wave countdown')
