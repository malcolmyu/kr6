/** LuaJIT2.1 lib_table.c auxsort. Equal keys are deliberately not stable. */
export function luaSort<T>(a:T[],less:(a:T,b:T)=>boolean):T[]{
 const swap=(i:number,j:number)=>{const v=a[i];a[i]=a[j];a[j]=v}
 const sort=(l:number,u:number)=>{
  while(l<u){
   if(less(a[u],a[l]))swap(l,u)
   if(u-l===1)break
   let i=Math.floor((l+u)/2)
   if(less(a[i],a[l]))swap(i,l);else if(less(a[u],a[i]))swap(i,u)
   if(u-l===2)break
   const pivot=a[i];swap(i,u-1);i=l;let j=u-1
   for(;;){
    while(less(a[++i],pivot))if(i>=u)throw new Error('invalid Lua sort comparison')
    while(less(pivot,a[--j]))if(j<=l)throw new Error('invalid Lua sort comparison')
    if(j<i)break
    swap(i,j)
   }
   swap(u-1,i)
   if(i-l<u-i){j=l;const end=i-1;l=i+1;sort(j,end)}else{j=i+1;const end=u;u=i-1;sort(j,end)}
  }
 }
 sort(0,a.length-1);return a
}
