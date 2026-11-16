export interface NativePatch {paths:string[];templates:string[];value?:unknown;operators:string|string[]}
export interface NativeUpgradePatch {priority?:number;patches?:NativePatch[]}
/** Native upgrades6295 and its scalar/append/aura operators; absent template
 * families/paths are skipped as the original patcher does. */
export function applyNativeTemplatePatches<T extends object>(templates:Record<string,T>,upgrades:NativeUpgradePatch[],auraAttack:object={type:'aura',ts:0}):Record<string,T>{
 const out={...templates},cloned=new Set<string>()
 const operate=(before:unknown,value:unknown,op:string):unknown=>{
  if(op==='set')return value===undefined?undefined:structuredClone(value)
  if(op==='mul')return Number(before)*Number(value)
  if(op==='sum')return before===undefined?structuredClone(value):Number(before)+Number(value)
  if(op==='sub')return before===undefined?structuredClone(value):Number(before)-Number(value)
  if(op==='round_five')return 5*Math.floor(Number(before)/5+.5)
  if(op==='table_append'||op==='aura_attack'){const list=Array.isArray(before)?structuredClone(before):[];list.push(op==='table_append'?structuredClone(value):{...structuredClone(auraAttack),name:value,cooldown:0});return list}
  throw new Error(`Unsupported native patch operator ${op}`)
 }
 for(const upgrade of [...upgrades].sort((a,b)=>(a.priority??1e99)-(b.priority??1e99)))for(const patch of upgrade.patches??[])for(const name of patch.templates){
  if(!out[name])continue
  if(!cloned.has(name)){out[name]=structuredClone(out[name]);cloned.add(name)}
  for(const path of patch.paths){
   const parts=[...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map(m=>m[2]!==undefined?Number(m[2])-1:m[1]);let parent=out[name] as Record<string|number,unknown>|undefined
   for(const key of parts.slice(0,-1))parent=parent?.[key] as typeof parent
   if(!parent)continue
   const key=parts.at(-1)!,operators=Array.isArray(patch.operators)?patch.operators:[patch.operators];let value=parent[key]
   for(const op of operators)value=operate(value,patch.value,op)
   if(value===undefined)delete parent[key];else parent[key]=value
  }
 }
 return out
}
