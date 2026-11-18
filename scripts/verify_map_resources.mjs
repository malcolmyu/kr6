import assert from 'node:assert/strict'
import {loadJsonResource} from '../src/game/ResourceLoader.ts'
const original=globalThis.fetch
try{
 let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'data/map.json');if(calls===1)return new Response('retry',{status:503});assert.equal(options.cache,'reload');return Response.json({flags:[{level:1}]})}
 assert.equal((await loadJsonResource('data/map.json')).flags[0].level,1);assert.equal(calls,2)
 calls=0;globalThis.fetch=async()=>{calls++;return new Response('missing',{status:404})};await assert.rejects(loadJsonResource('data/hero-room.json'),/hero-room\.json.*HTTP 404/);assert.equal(calls,1)
 calls=0;globalThis.fetch=async()=>{calls++;if(calls===1)throw new TypeError('network disconnected');return Response.json({ok:true})};assert((await loadJsonResource('data/map.json')).ok);assert.equal(calls,2)
 console.log('Map resource 503/network failures retry and recover; permanent failures identify the exact path and HTTP status.')
}finally{globalThis.fetch=original}
