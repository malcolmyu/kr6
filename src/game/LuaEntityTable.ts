/** Numeric entity-ID table, adapted from LuaJIT 2.1.0-beta3 lj_tab.c/h.
 * Copyright (C) 2005-2017 Mike Pall; portions Copyright (C) 1994-2008 Lua.org.
 * MIT license: see LUAJIT_LICENSE.txt. Does not implement string/object keys.
 * Deleted hash keys remain occupied until a rehash, including nil assignments
 * to previously absent keys; Map insertion order cannot reproduce Lua next. */
interface Node<T> {key?:number;value?:T;next?:number}
const bits=new DataView(new ArrayBuffer(8))
const rol=(v:number,n:number)=>(v<<n|v>>>(32-n))>>>0
function hashNumber(key:number){
 bits.setFloat64(0,key,true);let lo=bits.getUint32(0,true),hi=bits.getUint32(4,true)<<1
 lo=(lo^hi)>>>0;lo=(lo-rol(hi,14))>>>0;hi=(lo^rol(hi,19))>>>0
 return (hi-rol(lo,13))>>>0
}
const bin=(key:number)=>key>2?Math.floor(Math.log2(key-1)):0
export class LuaEntityTable<T> {
 private array:(T|undefined)[]=[]
 private nodes:Node<T>[]=[]
 private freeTop=0
 set(key:number,value:T|undefined){
  if(!Number.isInteger(key)||key<0||key>0x7fffffff)throw new Error('Lua entity IDs must be nonnegative signed32 integers')
  if(key<this.array.length){this.array[key]=value;return}
  const existing=this.findNode(key)
  if(existing!==undefined){this.nodes[existing].value=value;return}
  this.newKey(key,value)
 }
 get(key:number):T|undefined {if(key>=0&&key<this.array.length)return this.array[key];const i=this.findNode(key);return i===undefined?undefined:this.nodes[i].value}
 delete(key:number){this.set(key,undefined)}
 next(after?:number):[number,T]|undefined {
  let index=-1
  if(after!==undefined){
   if(after<this.array.length)index=after
   else{const node=this.findNode(after);if(node===undefined)throw new Error('Invalid key passed to Lua next');index=this.array.length+node}
  }
  for(let i=index+1;i<this.array.length;i++)if(this.array[i]!==undefined)return [i,this.array[i]!]
  for(let i=Math.max(0,index+1-this.array.length);i<this.nodes.length;i++)if(this.nodes[i].value!==undefined)return [this.nodes[i].key!,this.nodes[i].value!]
 }
 *entries():Generator<[number,T]>{let key:number|undefined;for(;;){const row=this.next(key);if(!row)return;yield row;key=row[0]}}
 *values():Generator<T>{for(const [,value]of this.entries())yield value}
 private findNode(key:number):number|undefined {
  if(!this.nodes.length)return
  let index:number|undefined=hashNumber(key)&(this.nodes.length-1)
  while(index!==undefined){const n:Node<T>=this.nodes[index];if(n.key===key)return index;index=n.next}
 }
 private newKey(key:number,value:T|undefined){
  if(!this.nodes.length){this.rehash(key);this.set(key,value);return}
  let index=hashNumber(key)&(this.nodes.length-1),n=this.nodes[index]
  if(n.value!==undefined){
   let free=this.freeTop
   do{if(free===0){this.rehash(key);this.set(key,value);return}free--}while(this.nodes[free].key!==undefined)
   this.freeTop=free
   let collide=hashNumber(n.key!)&(this.nodes.length-1)
   if(collide!==index){
    while(this.nodes[collide].next!==index)collide=this.nodes[collide].next!
    this.nodes[collide].next=free;this.nodes[free]={key:n.key,value:n.value,next:n.next};n.next=undefined;n.value=undefined
   }else{this.nodes[free].next=n.next;n.next=free;index=free;n=this.nodes[index]}
  }
  n.key=key;n.value=value
 }
 private rehash(extraKey:number){
  const bins=Array<number>(28).fill(0);let total=1,integers=0
  for(let i=0;i<this.array.length;i++)if(this.array[i]!==undefined){bins[bin(i)]++;total++;integers++}
  for(const n of this.nodes)if(n.value!==undefined){total++;if(n.key!<0x8000001){bins[bin(n.key!)]++;integers++}}
  if(extraKey<0x8000001){bins[bin(extraKey)]++;integers++}
  let sum=0,arraySize=0,arrayCount=0
  for(let b=0;2*integers>2**b&&sum!==integers;b++)if(bins[b]>0){sum+=bins[b];if(2*sum>2**b){arraySize=2**(b+1)+1;arrayCount=sum}}
  const hashes=total-arrayCount,hbits=hashes?Math.max(1,Math.ceil(Math.log2(hashes))):0
  this.resize(arraySize,hbits)
 }
 private resize(size:number,hbits:number){
  const oldArray=this.array,oldNodes=this.nodes
  this.array=Array<T|undefined>(size);for(let i=0;i<Math.min(size,oldArray.length);i++)this.array[i]=oldArray[i]
  this.nodes=hbits?Array.from({length:2**hbits},()=>({})):[];this.freeTop=this.nodes.length
  for(let i=size;i<oldArray.length;i++)if(oldArray[i]!==undefined)this.set(i,oldArray[i])
  for(const n of oldNodes)if(n.value!==undefined)this.set(n.key!,n.value)
 }
}
