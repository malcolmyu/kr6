import type {GameMode} from './types'
export interface Outcome {kind:'victory'|'defeat';stars:number;lives:number}
/** systems.level.on_update: defeat first, then script+waves+enemy completion. */
export function evaluateOutcome(lives:number,mode:GameMode,scriptComplete:boolean,wavesComplete:boolean,hasAliveEnemies:boolean):Outcome|undefined {
  if(lives<1)return {kind:'defeat',stars:0,lives}
  if(!scriptComplete || !wavesComplete || hasAliveEnemies)return
  return {kind:'victory',stars:mode==='campaign'?(lives>=18?3:lives>=6?2:1):1,lives}
}
