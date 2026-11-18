import progression from '../../public/data/progression.json' with {type:'json'}
import native from '../../public/data/hero-team.json' with {type:'json'}
import experience from '../../public/data/hero-progression.json' with {type:'json'}
import {progressStars} from './NativeProgression.ts'
import type {Progress} from './ProgressStore'
export type HeroKind='hero_gerald'|'hero_zefira'|'hero_bolin'
export const supportedHeroes:HeroKind[]=['hero_gerald','hero_zefira','hero_bolin']
export function heroStartingXp(name:string){const level=native.startingLevels[name as keyof typeof native.startingLevels]??1;return level<2?0:experience.hero_xp_thresholds[level-2]}
export function effectiveHeroXp(progress:Progress,name:string){return Math.max(progress.heroes?.[name]??0,heroStartingXp(name))}
export function parseHeroTeam(value:unknown):HeroKind[]|undefined{if(!Array.isArray(value)||value.length>native.slots||new Set(value).size!==value.length||value.some(name=>!supportedHeroes.includes(name)))return;return [...value]}
export function heroUnlocked(progress:Progress,name:string){return (progression.initial.heroes as string[]).includes(name)||progression.rewards.some(r=>r.name===name&&progressStars(progress)>=r.stars)}
export function equippedHeroes(progress:Progress):HeroKind[]{
 if(progress.heroTeam!==undefined)return progress.heroTeam.filter(name=>heroUnlocked(progress,name))
 const team=[...progression.initial.heroes] as HeroKind[]
 for(const r of progression.rewards)if(r.auto_equip&&supportedHeroes.includes(r.name as HeroKind)&&progressStars(progress)>=r.stars&&team.length<native.slots&&!team.includes(r.name as HeroKind))team.push(r.name as HeroKind)
 return team
}
/** Original screen_map.equip_unit + storage.equip_unit: overwrite/clamp, then grant starting XP. */
export function equipHero(progress:Progress,name:HeroKind,index:number):Progress{
 const team=equippedHeroes(progress)
 if(!heroUnlocked(progress,name)||team.includes(name)||!Number.isInteger(index)||index<1||index>native.slots)return progress
 team[Math.min(index,team.length+1)-1]=name
 return {...progress,heroTeam:team,heroes:{...progress.heroes,[name]:effectiveHeroXp(progress,name)}}
}
export function applyHeroProgression(before:Progress,after:Progress):Progress{
 let team:HeroKind[]|undefined
 for(const r of progression.rewards)if(r.auto_equip&&supportedHeroes.includes(r.name as HeroKind)&&progressStars(before)<r.stars&&progressStars(after)>=r.stars){team??=equippedHeroes(before);if(team.length<native.slots&&!team.includes(r.name as HeroKind))team.push(r.name as HeroKind)}
 return team===undefined?after:{...after,heroTeam:team}
}
