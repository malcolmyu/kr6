import rules from '../../public/data/hero-progression.json' with {type:'json'}
export interface HeroExperience {level:number;xp:number;xpQueued:number}
export function heroLevel(xp:number) {return 1+rules.hero_xp_thresholds.filter(threshold=>xp>=threshold).length}
export function heroXpFraction(level:number,xp:number) {
  if(level>=10)return 1
  const previous=level===1?0:rules.hero_xp_thresholds[level-2]
  return Math.max(0,Math.min(1,(xp-previous)/(rules.hero_xp_thresholds[level-1]-previous)))
}
/** SU.hero_level_up consumes the queue once, rounding the combined damage XP. */
export function consumeHeroXp(h:HeroExperience,stage:number,mode:number,difficulty=2,playerLevel=0):boolean {
  if(h.xpQueued===0)return false
  const expected=rules.hero_level_expected[(rules.use_player_level?playerLevel:stage)-1],difference=h.level-expected
  let multiplier=1
  if(expected && difference<0)multiplier=rules.hero_level_expected_multipliers_below[Math.min(2,-difference)-1]
  else if(expected && difference>0)multiplier=rules.hero_level_expected_multipliers_above[Math.min(2,difference)-1]
  multiplier*=rules.hero_xp_multipliers_per_mode[mode-1]
  h.xp+=Math.floor(h.xpQueued*multiplier*rules.hero_xp_gain_per_difficulty_mode[difficulty-1]+.5)
  h.xpQueued=0
  if(h.level>=10 || h.xp<rules.hero_xp_thresholds[h.level-1])return false
  h.level++
  return true
}
