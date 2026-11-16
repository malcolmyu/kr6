import {validateGlobalUpgrades,globalUpgradeKinds,globalUpgradePoints} from './GlobalUpgrades.ts'
import type {GlobalUpgradeSelection} from './GlobalUpgrades'
import {heroUpgradeData,validateHeroUpgrades} from './HeroUpgrades.ts'
import {applyPowerProgression} from './NativeProgression.ts'
import {applyTowerProgression,parseTowerLoadout} from './TowerProgression.ts'
import type {TowerLoadoutKind} from './TowerProgression'
import type {PowerKind} from './PowerSystem'
import type {GameMode} from './types'
import type {Outcome} from './Outcome'
import {validatePowerUpgrades} from './PowerUpgrades.ts'
import type {PowerUpgradeSelection} from './PowerUpgrades'
export const PROGRESS_KEY='kingdom-rush-6.progress.v1'
export type Introduction = 'stage1'|'stage2'|'comic2'
export interface Progress {globalUpgrades?:GlobalUpgradeSelection;onboarding?:Partial<Record<Introduction,true>>;lastPlayed?:{stage:number;mode:GameMode};towers?:TowerLoadoutKind[];heroUpgrades?:Record<string,string[]>;powerUpgrades?:PowerUpgradeSelection;powers?:PowerKind[];powerXp?:Partial<Record<PowerKind,number>>;heroes?:Record<string,number>;levels:Record<string,{campaign?:number;iron?:boolean}>}
export function parseProgress(text:string|null):Progress {
  const result:Progress={levels:{}}
  if(!text)return result
  try {
    const data=JSON.parse(text)
    if(data?.onboarding&&typeof data.onboarding==='object'&&!Array.isArray(data.onboarding)){
      result.onboarding={};for(const key of ['stage1','stage2','comic2'] as const)if(data.onboarding[key]===true)result.onboarding[key]=true
    }
    if(Number.isInteger(data?.lastPlayed?.stage)&&data.lastPlayed.stage>=1&&data.lastPlayed.stage<=3&&(data.lastPlayed.mode==='campaign'||data.lastPlayed.mode==='iron'))result.lastPlayed={stage:data.lastPlayed.stage,mode:data.lastPlayed.mode}
    const towers=parseTowerLoadout(data?.towers);if(towers!==undefined)result.towers=towers
    if(Array.isArray(data?.powers)){const powers=data.powers.filter((p:unknown)=>p==='reinforcements'||p==='rain_of_fire'||p==='royal_edict');if(powers.length===data.powers.length&&powers.length<=3&&new Set(powers).size===powers.length)result.powers=powers}
    const powerXp:Partial<Record<PowerKind,number>>={}
    for(const kind of ['reinforcements','rain_of_fire','royal_edict'] as const){const xp=data?.powerXp?.[kind];if(typeof xp==='number'&&Number.isFinite(xp)&&xp>=0)powerXp[kind]=Math.floor(xp)}
    if(Object.keys(powerXp).length)result.powerXp=powerXp
    const powerUpgrades:PowerUpgradeSelection={}
    for(const kind of ['reinforcements','rain_of_fire','royal_edict'] as const){const nodes=data?.powerUpgrades?.[kind];if(Array.isArray(nodes))powerUpgrades[kind]=validatePowerUpgrades(kind,powerXp[kind]??0,nodes.filter((id:unknown):id is string=>typeof id==='string'))}
    if(Object.keys(powerUpgrades).length)result.powerUpgrades=powerUpgrades
    const heroes:Record<string,number>={}
    for(const name of ['hero_gerald','hero_zefira']){const xp=data?.heroes?.[name];if(typeof xp==='number' && Number.isFinite(xp) && xp>=0)heroes[name]=xp}
    if(Object.keys(heroes).length)result.heroes=heroes
    const heroUpgrades:Record<string,string[]>={}
    for(const name of ['hero_gerald','hero_zefira']){const nodes=data?.heroUpgrades?.[name];if(Array.isArray(nodes))heroUpgrades[name]=validateHeroUpgrades(heroUpgradeData,name,heroes[name]??0,nodes.filter((id:unknown):id is string=>typeof id==='string'))}
    if(Object.keys(heroUpgrades).length)result.heroUpgrades=heroUpgrades
    for(let stage=1;stage<=3;stage++) {
      const entry=data?.levels?.[stage]
      if(!entry || typeof entry!=='object')continue
      const clean:{campaign?:number;iron?:boolean}={}
      if(Number.isInteger(entry.campaign) && entry.campaign>=1 && entry.campaign<=3)clean.campaign=entry.campaign
      if(entry.iron===true)clean.iron=true
      if(Object.keys(clean).length)result.levels[stage]=clean
    }
    if(data?.globalUpgrades&&typeof data.globalUpgrades==='object'&&!Array.isArray(data.globalUpgrades)){const candidates:GlobalUpgradeSelection={};for(const kind of globalUpgradeKinds){const ids=data.globalUpgrades[kind];if(Array.isArray(ids))candidates[kind]=ids.filter((id:unknown):id is string=>typeof id==='string')}result.globalUpgrades=validateGlobalUpgrades(globalUpgradePoints(result),candidates)}
  }catch{}
  return result
}
export function recordVictory(progress:Progress,stage:number,mode:GameMode,outcome:Outcome):Progress {
  if(outcome.kind!=='victory' || stage<1 || stage>3)return progress
  const entry={...progress.levels[stage]}
  if(mode==='campaign')entry.campaign=Math.max(entry.campaign??0,outcome.stars)
  else entry.iron=true
  return applyTowerProgression(progress,applyPowerProgression(progress,{...progress,levels:{...progress.levels,[stage]:entry}}))
}

export function recordHeroXp(progress:Progress,team:{name:string;xp:number}[]):Progress {
  if(!team.length)return progress
  const heroes={...progress.heroes}
  for(const hero of team)heroes[hero.name]=Math.max(heroes[hero.name]??0,hero.xp)
  return {...progress,heroes}
}

export function recordPowerXp(progress:Progress,xp:Partial<Record<PowerKind,number>>):Progress {
  const powerXp={...progress.powerXp}
  for(const kind of ['reinforcements','rain_of_fire','royal_edict'] as const)if(xp[kind]!==undefined)powerXp[kind]=Math.max(powerXp[kind]??0,Math.floor(xp[kind]!))
  return {...progress,powerXp}
}

/** Native slot_template starts with level 1; winning a campaign unlocks the next entry. */
export function playerLevel(progress:Progress):number {
  const entries=new Set<number>([1])
  for(const [key,value] of Object.entries(progress.levels)){const stage=Number(key);entries.add(stage);if(value.campaign)entries.add(stage+1)}
  return entries.size
}

/** A guide is seen on successful entry, so leaving midway never forces another viewing. */
export function hasSeenIntroduction(progress:Progress,key:Introduction):boolean {
  return progress.onboarding?.[key]===true||(key!=='comic2'&&!!progress.levels[key==='stage2'?2:1]?.campaign)
}
export function recordIntroduction(progress:Progress,key:Introduction):Progress {
  return progress.onboarding?.[key]?progress:{...progress,onboarding:{...progress.onboarding,[key]:true}}
}
/** Used saves from before guide tracking have already entered stage one's onboarding. */
export function migrateUsedOnboarding(progress:Progress):Progress {
  if(progress.onboarding!==undefined)return progress
  return {...progress,onboarding:{stage1:true,...(progress.levels[1]?.campaign?{comic2:true as const}:{}),...(progress.levels[2]?.campaign?{stage2:true as const}:{})}}
}
