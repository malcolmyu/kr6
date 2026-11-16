import nativeData from '../../public/data/power-upgrades.json' with {type:'json'}
import {evaluateHeroGraph} from './HeroUpgrades.ts'
import type {HeroUpgradeData} from './HeroUpgrades'
import {powerLevel} from './PowerProgression.ts'
import type {PowerKind} from './PowerSystem'
export const powerUpgradeData=nativeData as unknown as HeroUpgradeData
export function powerUpgradeSource(kind:PowerKind){return `power_${kind}`}
export function remainingPowerPoints(kind:PowerKind,xp:number,selected:string[]){return powerLevel(xp)-1-selected.reduce((sum,id)=>sum+(powerUpgradeData.nodes[powerUpgradeSource(kind)]?.[id]?.cost??0),0)}
export function purchasePowerUpgrade(kind:PowerKind,xp:number,selected:string[],id:string){
 const source=powerUpgradeSource(kind)
 if(selected.includes(id)||!evaluateHeroGraph(powerUpgradeData.graphs[source],selected,remainingPowerPoints(kind,xp,selected)).enable_buttons[id])return selected
 return [...selected,id]
}
/** Desktop node confirmation also allows native branch swaps, carrying purchased sub-decisions across. */
export function activatePowerUpgrade(kind:PowerKind,xp:number,selected:string[],id:string){
 const source=powerUpgradeSource(kind),graph=evaluateHeroGraph(powerUpgradeData.graphs[source],selected,remainingPowerPoints(kind,xp,selected)),blockedBy=graph.block_buttons[id]
 if(!blockedBy)return purchasePowerUpgrade(kind,xp,selected,id)
 const nodes=powerUpgradeData.nodes[source] as Record<string,{sub_decisions?:string[]}>,old=nodes[blockedBy]?.sub_decisions??[],replacement=nodes[id]?.sub_decisions??[],count=old.filter(node=>selected.includes(node)).length
 return [...selected,id].filter(node=>node!==blockedBy&&!old.includes(node)).concat(replacement.slice(0,count))
}
export function validatePowerUpgrades(kind:PowerKind,xp:number,candidate:string[]){
 const selected:string[]=[],source=powerUpgradeSource(kind),pending=new Set(candidate.filter(id=>id!=='origin'&&powerUpgradeData.nodes[source]?.[id]?.cost!==undefined))
 for(let pass=0;pass<candidate.length;pass++){let changed=false;for(const id of pending){const next=purchasePowerUpgrade(kind,xp,selected,id);if(next!==selected){selected.push(id);pending.delete(id);changed=true}}if(!changed)break}
 return selected
}
export type PowerUpgradeSelection=Partial<Record<PowerKind,string[]>>
interface NativePatch {paths:string[];templates:string[];value:unknown;operators:string}
interface NativeUpgrade {priority?:number;patches:NativePatch[]}
/** Clone only affected templates; native patches are priority-ordered. */
export function powerUpgradeTemplates<T extends object>(templates:Record<string,T>,selected:PowerUpgradeSelection):Record<string,T>{
 const out={...templates},owned=new Set(Object.entries(selected).flatMap(([kind,ids])=>(ids??[]).map(id=>`power_${kind}_${id}`))),cloned=new Set<string>()
 const upgrades=Object.entries(nativeData.upgrades as Record<string,NativeUpgrade>).filter(([name])=>owned.has(name)).sort((a,b)=>(a[1].priority??1e99)-(b[1].priority??1e99))
 for(const [,upgrade]of upgrades)for(const patch of upgrade.patches)for(const name of patch.templates){
  if(!out[name])continue
  if(!cloned.has(name)){out[name]=structuredClone(out[name]);cloned.add(name)}
  for(const path of patch.paths){
   const parts=[...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map(match=>match[2]!==undefined?Number(match[2])-1:match[1])
   let parent=out[name] as Record<string|number,unknown>;for(const key of parts.slice(0,-1))parent=parent[key] as typeof parent
   const key=parts.at(-1)!,before=parent[key],value=patch.value,operator=patch.operators
   parent[key]=operator==='set'?structuredClone(value):operator==='mul'?Number(before)*Number(value):operator==='sub'?Number(before)-Number(value):Number(before)+Number(value)
  }
 }
 return out
}
