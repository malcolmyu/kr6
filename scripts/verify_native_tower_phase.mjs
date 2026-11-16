import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
// Execute the production GameSession with the same GUI inputs as the fresh
// coupled native runtime. Native actor positions/order never drive this run.
await import('./diagnose_native_level_runtime.mjs')
const trace=JSON.parse(readFileSync('analysis/native-level-runtime-diagnostic.json'))
const native=trace.nativeAcquisitions.filter(q=>q.holder==='10')
const web=trace.webAcquisitions.filter(q=>q.holder==='10')
assert.equal(native.find(q=>q.first)?.tick,484)
assert.equal(web.find(q=>q.targets.length)?.tick,484)
for(const tick of [454,464,474]){
 assert.equal(native.find(q=>q.tick===tick)?.first,undefined)
 assert.deepEqual(web.find(q=>q.tick===tick)?.targets,[])
}
const canonical=shots=>shots.filter(s=>s.tick<=635).map(({tick,holder,name})=>({tick,holder,name}))
assert.equal(canonical(trace.nativeWizardShots).length,6)
assert.deepEqual(canonical(trace.webWizardShots),canonical(trace.nativeWizardShots))
assert.equal(trace.spawnDifferences.length,0)
assert((trace.firstActorDifference?.tick??Infinity)>=605,'coupled actor divergence moved earlier')
assert((trace.firstHpDifference?.tick??Infinity)>=619,'coupled health divergence moved earlier')
assert.deepEqual(trace.webCatapultShots[0].to,trace.nativeCatapultShots[0].to)
assert.equal(trace.webCatapultShots[0].tick,trace.nativeCatapultShots[0].tick)
assert.deepEqual(trace.webCatapultShots[0].from,trace.nativeCatapultShots[0].from)
console.log('Coupled native runtime: first wizard acquisition/retries and six emitted bolt ticks match; first catapult emission tick/origin and actor snapshots through tick604 and HP through618 match. First catapult predicted landing matches; subsequent full battle parity remains unverified.')
