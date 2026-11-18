import type {Progress} from './ProgressStore'
/** Progress earned in another tab survives a stale page's autosave. */
export function mergeSavedProgress(latest:Progress|undefined,incoming:Progress,baseline?:Progress):Progress {
 if(!latest)return incoming
 const next:Progress={...incoming,levels:{...latest.levels},heroes:{...latest.heroes},powerXp:{...latest.powerXp},onboarding:{...latest.onboarding,...incoming.onboarding}}
 for(const [stage,value]of Object.entries(incoming.levels)){const old=next.levels[stage];next.levels[stage]={...old,...value,...(old?.campaign||value.campaign?{campaign:Math.max(old?.campaign??0,value.campaign??0)}:{}),...(old?.iron||value.iron?{iron:true}:{})}}
 for(const [hero,xp]of Object.entries(incoming.heroes??{}))next.heroes![hero]=Math.max(next.heroes![hero]??0,xp)
 for(const kind of ['reinforcements','rain_of_fire','royal_edict'] as const)if(incoming.powerXp?.[kind]!==undefined)next.powerXp![kind]=Math.max(next.powerXp![kind]??0,incoming.powerXp[kind]!)
 if(latest.discoveredEnemies||incoming.discoveredEnemies)next.discoveredEnemies=[...new Set([...(latest.discoveredEnemies??[]),...(incoming.discoveredEnemies??[])])]
 // Preserve changes in another tab when this tab hasn't edited that setting.
 for(const key of ['heroTeam','towers','powers','heroUpgrades','powerUpgrades','globalUpgrades'] as const)if(baseline&&JSON.stringify(incoming[key])===JSON.stringify(baseline[key])&&latest[key]!==undefined)Object.assign(next,{[key]:latest[key]})
 for(const key of ['heroes','powerXp','onboarding'] as const)if(!Object.keys(next[key]??{}).length&&incoming[key]===undefined&&latest[key]===undefined)delete next[key]
 return next
}
