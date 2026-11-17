import {openSync,readSync,closeSync,readFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname,join} from 'node:path'
import {StringDecoder} from 'node:string_decoder'
import assert from 'node:assert/strict'
const revive=(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v
function* lines(path){const fd=openSync(path,'r'),decoder=new StringDecoder('utf8'),buffer=Buffer.allocUnsafe(1024*1024);let carry='';try{for(;;){const n=readSync(fd,buffer,0,buffer.length,null);if(!n)break;carry+=decoder.write(buffer.subarray(0,n));let start=0,end;while((end=carry.indexOf('\n',start))>=0){yield carry.slice(start,end);start=end+1}carry=carry.slice(start)}carry+=decoder.end();if(carry.trim())yield carry}finally{closeSync(fd)}}
class Frames {
 constructor(path,count,predicate){this.path=path;this.count=count;this.predicate=predicate}
 *[Symbol.iterator](){let seen=0;for(const line of lines(this.path)){const f=JSON.parse(line,revive);seen++;if(!this.predicate||this.predicate(f))yield f}assert.equal(seen,this.count,'Complete original frame stream')}
 filter(predicate){return new Frames(this.path,this.count,this.predicate?f=>this.predicate(f)&&predicate(f):predicate)}
 map(fn){const out=[];let index=0;for(const f of this)out.push(fn(f,index++));return out}
 some(fn){for(const f of this)if(fn(f))return true;return false}
 find(fn){for(const f of this)if(fn(f))return f}
 at(index){if(index>=0){let i=0;for(const f of this)if(i++===index)return f;return}let last=[];for(const f of this){last.push(f);if(last.length>-index)last.shift()}return last.length>=-index?last[0]:undefined}
 get length(){if(!this.predicate)return this.count;let count=0;for(const f of this)count++;return count}
}
function fingerprint(path){const h=createHash('sha256'),fd=openSync(path,'r'),b=Buffer.allocUnsafe(1024*1024);try{for(;;){const n=readSync(fd,b,0,b.length,null);if(!n)break;h.update(b.subarray(0,n))}return h.digest('hex')}finally{closeSync(fd)}}
export function readNativeTrace(path){const meta=JSON.parse(readFileSync(path+'.meta.json','utf8'),revive),s=meta._frameStream;assert.equal(statSync(path).size,s.sourceBytes,'Original trace source size changed');assert.equal(fingerprint(path),s.sourceSha256,'Original source fingerprint');const frameFile=join(dirname(path),s.frames);assert.equal(fingerprint(frameFile),s.framesSha256,'Complete frame stream fingerprint');meta[s.collection??'frames']=new Frames(frameFile,s.count);return meta}
