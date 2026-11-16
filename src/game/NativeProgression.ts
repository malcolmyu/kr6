import data from '../../public/data/progression.json' with {type:'json'}
import type {Progress} from './ProgressStore'
import type {PowerKind} from './PowerSystem'
export const royalReward=data.rewards.find(reward=>reward.name==='power_royal_edict')!
export function progressStars(progress:Progress){return Object.values(progress.levels).reduce((sum,entry)=>sum+(entry.campaign??0)+(entry.iron?1:0),0)}
export function powerRequiredStars(name:string){return data.rewards.find(reward=>reward.name===`power_${name}`)?.stars??0}
export function powerUnlocked(progress:Progress,name:string){return (data.initial.powers as string[]).includes(name)||data.rewards.some(reward=>reward.name===`power_${name}`&&progressStars(progress)>=reward.stars)}
/** Original storage.equip_unit overwrites the chosen slot, clamped to the first free one. */
export function equipPower(progress:Progress,kind:PowerKind,slot:number):Progress {
 const selected=equippedPowers(progress)
 if(!powerUnlocked(progress,kind)||selected.includes(kind)||!Number.isInteger(slot)||slot<1||slot>data.powerSlots)return progress
 selected[Math.min(slot,selected.length+1)-1]=kind
 return {...progress,powers:selected}
}
/** ClaimRewardView.alter_slot appends auto-equipped powers only to a free slot. */
export function equipRoyalReward(selected:PowerKind[]):PowerKind[] {
 if(royalReward.auto_equip && selected.length<data.powerSlots&&!selected.includes('royal_edict'))return [...selected,'royal_edict']
 return [...selected]
}
export function equippedPowers(progress:Progress):PowerKind[] {
 const unlocked=progressStars(progress)>=royalReward.stars
 if(progress.powers)return progress.powers.filter(power=>power!=='royal_edict'||unlocked)
 const initial=data.initial.powers as PowerKind[]
 return unlocked?equipRoyalReward(initial):[...initial]
}
export function applyPowerProgression(before:Progress,after:Progress):Progress {
 if(progressStars(before)<royalReward.stars&&progressStars(after)>=royalReward.stars)return {...after,powers:equipRoyalReward(equippedPowers(before))}
 return after
}
