import {readNativeTrace} from './native_trace_stream.mjs'
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
const dir=mkdtempSync(join(tmpdir(),'native-trace-')),path=join(dir,'trace.json')
try{
 const source={before:{utf8:'汉字🌱',float:'@f64:0.33333333333333331'},frames:[{tick:1,entities:[{id:9,unknown:{keep:['all','fields']}}]},{tick:2,payload:'x'.repeat(1024*1024-30)+'汉字🌱'.repeat(100),value:'@f64:0.10000000000000001'},{tick:3,last:true}],after:{events:[{tick:3,name:'结束'}]}}
 writeFileSync(path,JSON.stringify(source));execFileSync('python3',['scripts/prepare_native_trace_stream.py',path]);const n=readNativeTrace(path),expected=JSON.parse(readFileSync(path),(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)
 assert.deepEqual([...n.frames],expected.frames);assert.deepEqual(n.before,expected.before);assert.deepEqual(n.after,expected.after);assert.equal(n.frames.length,3);assert.equal(n.frames.filter(f=>f.tick>1).length,2);assert.deepEqual(n.frames.map(f=>f.tick),[1,2,3]);assert.equal(n.frames.find(f=>f.last).tick,3);assert.equal(n.frames.at(-1).tick,3);assert.equal(n.frames.at(-2).tick,2);assert.equal(n.frames.at(-4),undefined);assert.equal(n.frames.at(1).tick,2)
 const framePath=join(dir,n._frameStream.frames),original=readFileSync(framePath,'utf8');writeFileSync(framePath,original.replace('"tick":1','"tick":8'));assert.throws(()=>readNativeTrace(path),/frame stream fingerprint/);writeFileSync(framePath,original);const raw=readFileSync(path,'utf8');writeFileSync(path,raw.replace('"tick":1','"tick":8'));assert.throws(()=>readNativeTrace(path),/source fingerprint/)
 const paintPath=join(dir,'paint.json'),paint={note:'完整样本',samples:source.frames,metadata:{events:23,random:31}}
 writeFileSync(paintPath,JSON.stringify(paint));execFileSync('python3',['scripts/prepare_native_trace_stream.py',paintPath,'samples']);const q=readNativeTrace(paintPath)
 assert.deepEqual([...q.samples],expected.frames);assert.deepEqual(q.metadata,paint.metadata);assert.equal(q.samples.some(f=>f.last),true);assert.equal(q.samples.some(f=>f.tick===9),false);assert.equal(q.frames,undefined);assert.equal(q.samples.length,3)
 console.log('Original JSON frame stream preserves all fields/ordering, Unicode across chunks, f64 tags and metadata; streaming filters/maps/find/at/count and source/derived SHA256 integrity verified')
}finally{rmSync(dir,{recursive:true,force:true})}
