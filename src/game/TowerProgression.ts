import data from '../../public/data/progression.json' with {type:'json'}
import type {Progress} from './ProgressStore'
import {progressStars} from './NativeProgression.ts'
export type TowerLoadoutKind='archers'|'knights'|'catapult'|'wizard'|'culverine'
const kinds=new Set<TowerLoadoutKind>(['archers','knights','catapult','wizard','culverine'])
export const initialTowers=data.initial.towers as TowerLoadoutKind[]
export const towerRewards=data.rewards.filter(r=>r.name.startsWith('tower_')&&kinds.has(r.name.slice(6) as TowerLoadoutKind))
export function parseTowerLoadout(value:unknown):TowerLoadoutKind[]|undefined{
 if(!Array.isArray(value)||value.length>data.towerSlots||new Set(value).size!==value.length||value.some(v=>!kinds.has(v)))return
 return [...value]
}
export function unlockedTowers(progress:Progress):TowerLoadoutKind[]{
 const stars=progressStars(progress)
 return [...initialTowers,...towerRewards.filter(r=>stars>=r.stars).map(r=>r.name.slice(6) as TowerLoadoutKind)]
}
/** Native ClaimRewardView.alter_slot: append once to a free slot, preserving selection order. */
export function equipTowerReward(selected:TowerLoadoutKind[],kind:TowerLoadoutKind):TowerLoadoutKind[]{
 return selected.length<data.towerSlots&&!selected.includes(kind)?[...selected,kind]:[...selected]
}
export function equippedTowers(progress:Progress):TowerLoadoutKind[]{
 const unlocked=unlockedTowers(progress)
 if(progress.towers!==undefined)return progress.towers.filter(kind=>unlocked.includes(kind))
 let selected=[...initialTowers]
 for(const reward of towerRewards)if(reward.auto_equip&&progressStars(progress)>=reward.stars)selected=equipTowerReward(selected,reward.name.slice(6) as TowerLoadoutKind)
 return selected
}
export function applyTowerProgression(before:Progress,after:Progress):Progress{
 let selected:TowerLoadoutKind[]|undefined
 for(const reward of towerRewards)if(reward.auto_equip&&progressStars(before)<reward.stars&&progressStars(after)>=reward.stars){
  selected=equipTowerReward(selected??equippedTowers(before),reward.name.slice(6) as TowerLoadoutKind)
 }
 return selected===undefined?after:{...after,towers:selected}
}
