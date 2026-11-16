export interface SkillClock {basic_attack?:boolean;static_cooldown?:boolean}
/** Original Royal modifier31816 resets only nonbasic, nonstatic attack clocks. */
export function resetSkillTimestamp(attack:SkillClock,time:number){return !attack.basic_attack&&!attack.static_cooldown?time-1e99:undefined}
