import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
export function readCulverineContinuation(main){
 const n=JSON.parse(readFileSync('analysis/level-entity-bootstrap-3-campaign-cleared-culverine-c-continuation-runtime-lcg104.json'),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
 assert.equal(n.stage,main.stage);assert.equal(n.mode,main.mode);assert.equal(n.playerLevel,main.playerLevel);assert.deepEqual(n.profileOverrides,main.profileOverrides)
 assert.deepEqual(n.resources.missing,[]);assert.deepEqual(n.resources.missingAnimations,[])
 assert.equal(n.frames.length,180);assert(n.frames.every((f,i)=>f.tick===20101+i),'Complete original post-victory frame sequence')
 assert.deepEqual(n.events.filter(e=>e.tick<=20100),main.events,'Independent original continuation has identical complete battle event prefix')
 assert.deepEqual(n.randomDraws.slice(0,main.randomDraws.length),main.randomDraws,'Identical complete original battle RNG prefix')
 return n
}
