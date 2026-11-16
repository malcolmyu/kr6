const images=new Map<string,Promise<HTMLImageElement>>()
/** Retain decoded native sheets/sprites across scenes; failed loads remain retryable. */
export function nativeImage(url:string){
 let pending=images.get(url)
 if(!pending){pending=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>{void image.decode().then(()=>resolve(image),reject)};image.onerror=()=>reject(new Error(`原始图片载入失败：${url}`));image.src=url}).catch(error=>{images.delete(url);throw error});images.set(url,pending)}
 return pending
}
export async function preloadNativeImages(urls:string[],progress:(value:number)=>void=()=>{}){
 const unique=[...new Set(urls)];let complete=0;progress(0)
 await Promise.all(unique.map(async url=>{await nativeImage(url);progress(++complete/unique.length)}))
 if(!unique.length)progress(1)
}
