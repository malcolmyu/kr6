/** Transient CDN/network errors must not strand a scene behind its loading screen. */
export async function loadJsonResource<T>(path:string):Promise<T>{
 let last:unknown
 for(let attempt=0;attempt<3;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000)
  try{
   const response=await fetch(path,{signal:controller.signal,cache:attempt?'reload':'default'})
   if(!response.ok){const error=new Error(`资源载入失败：${path}（HTTP ${response.status}）`);if(response.status<500&&![408,429].includes(response.status))throw Object.assign(error,{permanent:true});throw error}
   return await response.json() as T
  }catch(error){last=error;if((error as {permanent?:boolean})?.permanent)break}
  finally{clearTimeout(timer)}
  if(attempt<2)await new Promise(resolve=>setTimeout(resolve,200*(attempt+1)))
 }
 throw new Error(`地图载入失败：${path}。${last instanceof Error?last.message:String(last)}；请重试。`)
}
