import native from '../../public/data/global-upgrades.json' with {type:'json'}
import {evaluateHeroGraph} from './HeroUpgrades.ts'
import type {Progress} from './ProgressStore'
import type {HeroUpgradeData} from './HeroUpgrades'
import {applyNativeTemplatePatches} from './NativeTemplatePatches.ts'
import type {NativeUpgradePatch} from './NativeTemplatePatches'
export type GlobalUpgradeKind='archers'|'barracks'|'mages'|'artillery'
export type GlobalUpgradeSelection=Partial<Record<GlobalUpgradeKind,string[]>>
export const globalUpgradeKinds:GlobalUpgradeKind[]=['archers','barracks','mages','artillery']
export const globalUpgradeData=native as unknown as HeroUpgradeData
/** Native UpgradesRoomView.available_points uses highest completed level, not stars. */
export function globalUpgradePoints(progress:Progress){
 const stage=Math.max(1,...Object.entries(progress.levels).filter(([,entry])=>entry.campaign||entry.iron).map(([key])=>Number(key)))
 return native.pointsPerStage[stage-1]??0
}
export function globalUpgradeSpent(selected:GlobalUpgradeSelection){return globalUpgradeKinds.reduce((sum,kind)=>sum+(selected[kind]??[]).reduce((n,id)=>n+(globalUpgradeData.nodes[kind]?.[id]?.cost??0),0),0)}
export function purchaseGlobalUpgrade(points:number,selected:GlobalUpgradeSelection,kind:GlobalUpgradeKind,id:string):GlobalUpgradeSelection{
 const own=selected[kind]??[]
 if(own.includes(id)||!evaluateHeroGraph(globalUpgradeData.graphs[kind],own,points-globalUpgradeSpent(selected)).enable_buttons[id])return selected
 return {...selected,[kind]:[...own,id]}
}
export function activateGlobalUpgrade(points:number,selected:GlobalUpgradeSelection,kind:GlobalUpgradeKind,id:string):GlobalUpgradeSelection{
 const own=selected[kind]??[],result=evaluateHeroGraph(globalUpgradeData.graphs[kind],own,points-globalUpgradeSpent(selected)),blockedBy=result.block_buttons[id]
 if(!blockedBy)return purchaseGlobalUpgrade(points,selected,kind,id)
 const nodes=globalUpgradeData.nodes[kind] as Record<string,{sub_decisions?:string[]}>,old=nodes[blockedBy]?.sub_decisions??[],replacement=nodes[id]?.sub_decisions??[],count=old.filter(node=>own.includes(node)).length
 return {...selected,[kind]:[...own,id].filter(node=>node!==blockedBy&&!old.includes(node)).concat(replacement.slice(0,count))}
}
export function validateGlobalUpgrades(points:number,candidate:GlobalUpgradeSelection){
 let selected:GlobalUpgradeSelection={};const pending=globalUpgradeKinds.flatMap(kind=>(candidate[kind]??[]).filter(id=>id!=='origin'&&globalUpgradeData.nodes[kind]?.[id]?.cost!==undefined).map(id=>({kind,id})))
 for(let pass=0;pass<pending.length;pass++){let changed=false;for(const {kind,id}of pending){const next=purchaseGlobalUpgrade(points,selected,kind,id);if(next!==selected){selected=next;changed=true}}if(!changed)break}
 return selected
}
/** Static native patch data is applied per session; function-valued/controller
 * upgrades retain descriptors until their corresponding runtime is ported. */
export function globalUpgradeTemplates<T extends object>(templates:Record<string,T>,selected:GlobalUpgradeSelection){
 const owned=new Set(Object.entries(selected).flatMap(([kind,nodes])=>(nodes??[]).map(id=>`${kind}_${id}`))),upgrades=Object.entries(native.upgrades as Record<string,NativeUpgradePatch>).filter(([name])=>owned.has(name)).map(([,u])=>u)
 return applyNativeTemplatePatches(templates,upgrades,native.auraAttackComponent)
}
