import data from '../../public/data/power-progression.json' with {type:'json'}
import type {PowerKind} from './PowerSystem'
const rules=data.rules
export const powerKinds:PowerKind[]=['reinforcements','rain_of_fire','royal_edict']
export function powerLevel(xp:number){return 1+rules.powers_xp_thresholds.filter(value=>xp>=value).length}
export function powerXpFraction(xp:number){
 const level=powerLevel(xp);if(level===6)return 1
 const previous=level===1?0:rules.powers_xp_thresholds[level-2]
 return (xp-previous)/(rules.powers_xp_thresholds[level-1]-previous)
}
/** systems.power_xp_tracking: expected-level correction uses battle-entry XP,
 * even after a use crosses a level threshold. GUI/save reads base + gain. */
export class PowerProgression {
 readonly status={} as Record<PowerKind,{base:number;gain:number;level:number}>
 playerLevel=0
 mode=1
 constructor(){this.configure()}
 configure(saved:Partial<Record<PowerKind,number>>={},playerLevel=0,mode=1){
  this.playerLevel=playerLevel;this.mode=mode
  for(const kind of powerKinds){const starting=rules.powers_starting_level[kind],base=Math.max(saved[kind]??0,starting>=2?rules.powers_xp_thresholds[starting-2]:0);this.status[kind]={base,gain:0,level:powerLevel(base)}}
 }
 use(kind:PowerKind){
  const state=this.status[kind],expected=rules.power_level_expected[this.playerLevel-1],difference=powerLevel(state.base)-expected
  let multiplier=1
  if(expected&&difference<0)multiplier=rules.power_level_expected_multipliers_below[Math.min(2,-difference)-1]
  else if(expected&&difference>0)multiplier=rules.power_level_expected_multipliers_above[Math.min(2,difference)-1]
  multiplier*=rules.power_xp_multipliers_per_mode[this.mode-1]
  state.gain+=data.users[kind].xp_per_use*multiplier
  state.level=powerLevel(this.xp(kind))
 }
 xp(kind:PowerKind){const state=this.status[kind];return state.base+state.gain}
 snapshot():Record<PowerKind,number>{return Object.fromEntries(powerKinds.map(kind=>[kind,Math.floor(this.xp(kind))])) as Record<PowerKind,number>}
}
