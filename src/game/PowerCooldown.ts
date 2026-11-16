/** GGPowerButton.update7932: timer-mask clipping uses this cast's actual cooldown. */
export function powerCooldownPhase(remaining:number,cooldown:number){return cooldown>0?Math.max(0,Math.min(1,1-remaining/cooldown)):1}
