import nativeData from '../../public/data/hero-upgrades.json' with {type:'json'}
import {heroLevel} from './HeroProgression.ts'
export interface UpgradeEdge {coord_x:number;coord_y:number;to:string}
export interface UpgradeNode {coord_x:number;coord_y:number;cost?:number;[key:string]:number|UpgradeEdge|undefined}
export interface HeroUpgradeData {graphs:Record<string,Record<string,UpgradeNode>>;nodes:Record<string,Record<string,{cost?:number;img?:string;title_key?:string;description_key?:string}>>;points:number[]}
export interface UpgradeGraphResult {enable_buttons:Record<string,boolean>;unavailable_buttons:Record<string,boolean>;block_buttons:Record<string,string>;active_links:Record<string,UpgradeEdge>;available_nodes:string[]}
const edges=(node:UpgradeNode)=>Object.keys(node).filter(k=>/^\d+$/.test(k)).sort((a,b)=>Number(a)-Number(b)).map(k=>node[k] as UpgradeEdge)
/** KGraphDictionary.evaluate (5238): forward edges, points and mutually exclusive talents. */
export function evaluateHeroGraph(graph:Record<string,UpgradeNode>,selected:string[],points:number):UpgradeGraphResult {
 const result:UpgradeGraphResult={enable_buttons:{},unavailable_buttons:{},block_buttons:{},active_links:{},available_nodes:[]},visited=new Set<string>(),owned=new Set(selected)
 const enable=(id:string)=>{if((graph[id]?.cost??Infinity)<=points){result.enable_buttons[id]=true;result.available_nodes.push(id)}else result.unavailable_buttons[id]=true}
 const walk=(id:string)=>{
  if(visited.has(id))return;visited.add(id);const node=graph[id];if(!node)return
  if(id==='origin'||owned.has(id)){
   for(const edge of edges(node)){
    if(node.coord_x<=edge.coord_x)walk(edge.to)
    if(owned.has(edge.to)||edge.to.startsWith('?'))result.active_links[`${edge.coord_x}_${edge.coord_y}`]=edge
   }
  }else if(id.startsWith('?')){
   let decision:string|undefined,decisionX=Infinity
   for(const edge of edges(node))if(node.coord_x<=edge.coord_x){decisionX=Math.min(decisionX,edge.coord_x);if(owned.has(edge.to)&&edge.coord_x===decisionX){decision=edge.to;result.active_links[`${edge.coord_x}_${edge.coord_y}`]=edge}}
   for(const edge of edges(node)){
    if(edge.coord_x===decisionX){if(decision){if(!owned.has(edge.to))result.block_buttons[edge.to]=decision;else walk(edge.to)}else enable(edge.to)}
    else if(decision)walk(edge.to)
   }
  }else enable(id)
 }
 walk('origin');return result
}
export function remainingHeroPoints(data:HeroUpgradeData,hero:string,xp:number,selected:string[]){return (data.points[heroLevel(xp)-1]??0)-selected.reduce((sum,id)=>sum+(data.nodes[hero]?.[id]?.cost??0),0)}
/** Rebuild a saved tree through legal purchases; unknown, duplicate and unaffordable nodes never grant skills. */
export function validateHeroUpgrades(data:HeroUpgradeData,hero:string,xp:number,candidate:string[]):string[]{
 const selected:string[]=[],pending=new Set(candidate.filter(id=>id!=='origin'&&data.nodes[hero]?.[id]?.cost!==undefined))
 for(let pass=0;pass<candidate.length;pass++){
  let changed=false
  for(const id of pending){const points=remainingHeroPoints(data,hero,xp,selected);if(evaluateHeroGraph(data.graphs[hero]??{},selected,points).enable_buttons[id]){selected.push(id);pending.delete(id);changed=true}}
  if(!changed)break
 }
 return selected
}
export function purchaseHeroUpgrade(data:HeroUpgradeData,hero:string,xp:number,selected:string[],id:string){
 if(selected.includes(id)||!evaluateHeroGraph(data.graphs[hero]??{},selected,remainingHeroPoints(data,hero,xp,selected)).enable_buttons[id])return selected
 return [...selected,id]
}

export const heroUpgradeData=nativeData as unknown as HeroUpgradeData
